import path from "node:path";
import fs from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { apiReference } from "@scalar/hono-api-reference";
import { config } from "./config.js";
import { securityHeaders } from "./middleware/security.js";
import { tenantResolution } from "./middleware/tenant.js";
import { healthRouter } from "./routes/health.js";
import { storefrontRouter } from "./routes/storefront.js";
import { checkoutRouter } from "./routes/checkout.js";
import { incompleteRouter } from "./routes/incomplete.js";
import { feedRouter } from "./routes/feed.js";
import { merchantRouter, adminRouter } from "./routes/admin.js";
import { appVersionRouter } from "./routes/app-version.js";
import { customAuthRouter } from "./routes/auth.js";
import { packagesRouter } from "./routes/packages.js";
import { themeRouter } from "./routes/theme.js";
import { templatesRouter } from "./routes/templates.js";
import { auth } from "./auth.js";

const app = new Hono();

const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    
    // Platform domains
    if (
      hostname === config.PLATFORM_ROOT_DOMAIN ||
      hostname === `app.${config.PLATFORM_ROOT_DOMAIN}` ||
      hostname === `admin.${config.PLATFORM_ROOT_DOMAIN}`
    ) {
      return true;
    }

    // Storefront subdomains (*.yourbrandshop.com)
    if (hostname.endsWith(`.${config.STOREFRONT_ROOT_DOMAIN.toLowerCase()}`)) {
      return true;
    }

    // Local dev hostnames
    if (
      (config.NODE_ENV === "development" || config.NODE_ENV === "test") &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

// 1. Global Middleware
app.use("*", securityHeaders);
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*"; // non-browser or same-origin requests without Origin header
      return isAllowedOrigin(origin) ? origin : "";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
  })
);
app.use("*", tenantResolution);

// 2. Health & Documentation
app.route("/", healthRouter);

app.get(
  "/docs",
  apiReference({
    theme: "purple",
    spec: {
      content: {
        openapi: "3.1.0",
        info: {
          title: "Go Commerce BD — Multi-Tenant eCommerce API (Bangladesh)",
          version: "1.0.0",
          description: "High-performance API powering Bangladesh f-commerce stores, tele-sales, and couriers",
        },
        servers: [{ url: `http://localhost:${config.PORT}` }],
      },
    },
  })
);

import {
  loginIpRateLimiter,
  loginAccountRateLimiter,
  registerStoreRateLimiter,
  orderRateLimiter,
  incompleteOrderRateLimiter,
  merchantApiRateLimiter,
} from "./middleware/rate-limit.js";

// 3. Application Routes & Abuse Protection (Task 3.1)
app.use("/api/auth/login", loginIpRateLimiter);
app.use("/api/auth/login", loginAccountRateLimiter);
app.use("/api/auth/register-store", registerStoreRateLimiter);
app.use("/api/orders", orderRateLimiter);
app.use("/api/incomplete-orders", incompleteOrderRateLimiter);

// Identity, Session Management & Store Onboarding
app.route("/api/auth", customAuthRouter);
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Public & Storefront Routes (Host-header resolved)
app.route("/api/storefront", storefrontRouter);
app.route("/api", checkoutRouter);
app.route("/api", incompleteRouter);
app.route("/api", packagesRouter);
app.route("/api", templatesRouter);
app.route("/feeds", feedRouter);

// Android App Updates & Releases (Public endpoint)
app.route("/v1/app", appVersionRouter);
app.route("/api/app", appVersionRouter);

// Merchant API (Session-resolved strictly from activeOrganizationId, 120 req/min)
app.use("/v1/*", merchantApiRateLimiter);
app.route("/v1", merchantRouter);
app.route("/v1", themeRouter);
app.route("/api/admin", adminRouter);

// 3.5 Serve Merchant & Super-Admin Dashboard SPA if build exists in public/
const publicDirCandidates = [
  path.resolve(process.cwd(), "public"),
  path.resolve(process.cwd(), "apps/api/public"),
];
const resolvedPublicDir = publicDirCandidates.find((dir) => fs.existsSync(dir));

if (resolvedPublicDir) {
  const indexHtmlPath = path.join(resolvedPublicDir, "index.html");
  let cachedIndexHtml = "";
  try {
    if (fs.existsSync(indexHtmlPath)) {
      cachedIndexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
    }
  } catch {}

  app.use("/assets/*", serveStatic({ root: resolvedPublicDir }));
  app.use("/favicon*", serveStatic({ root: resolvedPublicDir }));
  app.use("/logo*", serveStatic({ root: resolvedPublicDir }));
  app.use("/download/*", serveStatic({ root: resolvedPublicDir }));
  app.get("/dashboard", (c) => c.redirect("/"));

  if (cachedIndexHtml) {
    app.get("/", (c) => c.html(cachedIndexHtml));
    app.get("/dashboard/*", (c) => c.html(cachedIndexHtml));
    app.get("*", (c, next) => {
      const p = c.req.path;
      if (
        p.startsWith("/api") ||
        p.startsWith("/v1") ||
        p.startsWith("/feeds") ||
        p.startsWith("/docs") ||
        p.startsWith("/health")
      ) {
        return next();
      }
      return c.html(cachedIndexHtml);
    });
  } else {
    app.get("/", serveStatic({ path: indexHtmlPath }));
    app.get("*", (c, next) => {
      const p = c.req.path;
      if (
        p.startsWith("/api") ||
        p.startsWith("/v1") ||
        p.startsWith("/feeds") ||
        p.startsWith("/docs") ||
        p.startsWith("/health")
      ) {
        return next();
      }
      return serveStatic({ path: indexHtmlPath })(c, next);
    });
  }
}

// Global RFC 9457 error handler: never leak internals in production
app.onError((err, c) => {
  console.error("[Unhandled API Error]", err);
  const status = typeof (err as any).status === "number" ? (err as any).status : 500;
  return c.json(
    {
      type: `https://httpstatuses.com/${status}`,
      title: status === 500 ? "Internal Server Error" : "Error",
      status,
      detail:
        config.NODE_ENV === "production"
          ? "An unexpected error occurred. Please contact platform support."
          : err.message,
    },
    status
  );
});

// 4. Start Server (skip in test mode to allow clean unit test termination)
const isTestMode =
  config.NODE_ENV === "test" ||
  process.env.NODE_ENV === "test" ||
  process.execArgv.includes("--test") ||
  process.argv.some((arg) => arg.includes("test"));

if (!isTestMode) {
  console.log(`⚡ Go Commerce BD API server starting on port ${config.PORT} [${config.NODE_ENV}] at host ${config.HOST}`);

  serve({
    fetch: app.fetch,
    port: config.PORT,
    hostname: config.HOST,
  });
}

export default app;

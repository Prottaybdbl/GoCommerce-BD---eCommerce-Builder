import { createMiddleware } from "hono/factory";
import { config } from "../config.js";

/**
 * Mandatory Secure Web Headers Middleware
 */
export const securityHeaders = createMiddleware(async (c, next) => {
  await next();

  // Enforce security headers
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // A route that serves a framed document (template previews) sets its own,
  // stricter-by-sandbox policy with an explicit `frame-ancestors` allowlist.
  // Overwriting it here is what used to leave every preview script-less.
  if (!c.res.headers.get("Content-Security-Policy")) {
    c.header("X-Frame-Options", "SAMEORIGIN"); // Allows same-origin iframe for dashboard theme customizer

    // Content Security Policy — drop 'unsafe-inline' from script-src for standard API responses (Task 5.3)
    const isDocPath = c.req.path === "/docs";
    const scriptSrc = isDocPath
      ? "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com;"
      : "script-src 'self' https://challenges.cloudflare.com;";

    // The theme editor frames the merchant's storefront, which lives on the
    // platform root domain rather than on this (app.) origin.
    const root = config.PLATFORM_ROOT_DOMAIN;
    const frameSrc =
      config.NODE_ENV === "production"
        ? `frame-src 'self' https://${root} https://www.${root};`
        : `frame-src 'self' https://${root} https://www.${root} http://localhost:* http://127.0.0.1:*;`;

    c.header(
      "Content-Security-Policy",
      `default-src 'self'; ${scriptSrc} ${frameSrc} style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:;`
    );
  }

  // HTTPS Strict Transport Security in production
  if (config.NODE_ENV === "production") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});

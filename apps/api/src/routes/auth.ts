import { Hono } from "hono";
import crypto from "node:crypto";
import net from "node:net";
import {
  registerStoreSchema,
  loginSchema,
  subdomainSchema,
  completeOnboardingSchema,
} from "@gocom/contracts";
import {
  db,
  user,
  account,
  session,
  organization,
  member,
  stores,
  auditLogs,
  hashPassword,
  verifyPassword,
} from "@gocom/db";
import { eq, and, or } from "drizzle-orm";
import { config } from "../config.js";
import { auth } from "../auth.js";
import { verifyTurnstileToken } from "../services/turnstile.js";

export const customAuthRouter = new Hono();

// Helper to quickly check if PostgreSQL is available (with tight 300ms timeout)
export function isDbAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const u = new URL(config.DATABASE_URL);
      const host = u.hostname || "127.0.0.1";
      const port = Number(u.port) || 5432;
      const socket = new net.Socket();
      socket.setTimeout(300);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("error", () => {
        resolve(false);
      });
      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

// Helper to set secure session cookie across host and platform domain
function setSessionCookie(c: any, token: string, maxAgeSeconds: number = 30 * 24 * 3600) {
  const isProd = config.NODE_ENV === "production";
  const names = isProd
    ? ["__Secure-better-auth.session_token", "better-auth.session_token"]
    : ["better-auth.session_token"];

  const domains = [
    undefined, // host-only
    isProd && config.PLATFORM_ROOT_DOMAIN ? `.${config.PLATFORM_ROOT_DOMAIN}` : undefined,
  ].filter((d, i, arr) => d === undefined || (Boolean(d) && arr.indexOf(d) === i));

  let isFirst = true;
  for (const name of names) {
    for (const domain of domains) {
      const parts = [
        `${name}=${token}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${maxAgeSeconds}`,
      ];
      if (domain) parts.push(`Domain=${domain}`);
      if (isProd || name.startsWith("__Secure-")) parts.push("Secure");
      const cookieVal = parts.join("; ");
      if (isFirst) {
        c.header("Set-Cookie", cookieVal);
        isFirst = false;
      } else {
        c.header("Set-Cookie", cookieVal, { append: true });
      }
    }
  }

  // Also set non-HttpOnly gocom_logged_in cookie so client storefront can detect auth state
  for (const domain of domains) {
    const parts = [
      "gocom_logged_in=1",
      "Path=/",
      "SameSite=Lax",
      `Max-Age=${maxAgeSeconds}`,
    ];
    if (domain) parts.push(`Domain=${domain}`);
    if (isProd) parts.push("Secure");
    c.header("Set-Cookie", parts.join("; "), { append: true });
  }
}

// Helper to clear session cookie across all variations, prefixes, and domains
function clearSessionCookie(c: any) {
  const cookieNames = [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
    "better-auth.session_data",
    "__Secure-better-auth.session_data",
    "better-auth.state",
    "__Secure-better-auth.state",
    "better-auth.pkce_verifier",
    "__Secure-better-auth.pkce_verifier",
    "better-auth.dont_remember",
    "__Secure-better-auth.dont_remember",
    "gocom_logged_in",
  ];

  const domains = [
    undefined, // host-only
    config.PLATFORM_ROOT_DOMAIN ? `.${config.PLATFORM_ROOT_DOMAIN}` : undefined,
    config.STOREFRONT_ROOT_DOMAIN ? `.${config.STOREFRONT_ROOT_DOMAIN}` : undefined,
  ].filter((d, i, arr) => d === undefined || (Boolean(d) && arr.indexOf(d) === i));

  const isProd = config.NODE_ENV === "production";
  let isFirst = true;

  for (const name of cookieNames) {
    for (const domain of domains) {
      const parts = [
        `${name}=`,
        "Path=/",
        "SameSite=Lax",
        "Max-Age=0",
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      ];
      if (name !== "gocom_logged_in") {
        parts.push("HttpOnly");
      }
      if (domain) parts.push(`Domain=${domain}`);
      if (isProd || name.startsWith("__Secure-")) parts.push("Secure");
      const cookieVal = parts.join("; ");
      if (isFirst) {
        c.header("Set-Cookie", cookieVal);
        isFirst = false;
      } else {
        c.header("Set-Cookie", cookieVal, { append: true });
      }
    }
  }
}

// Helper to extract session token from cookies or Authorization header
function extractToken(c: any): string | null {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = c.req.header("Cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c: string) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith("better-auth.session_token=")) {
        const raw = decodeURIComponent(cookie.slice("better-auth.session_token=".length));
        return raw.split(".")[0];
      }
      if (cookie.startsWith("__Secure-better-auth.session_token=")) {
        const raw = decodeURIComponent(cookie.slice("__Secure-better-auth.session_token=".length));
        return raw.split(".")[0];
      }
    }
  }

  return null;
}

// In-memory fallback storage for unit tests or offline local development
const memUsers = new Map<string, any>(); // email -> user
const memAccounts = new Map<string, any>(); // userId -> account
const memStores = new Map<string, any>(); // subdomain -> store
const memSessions = new Map<string, any>(); // token -> session

// Pre-populate with default demo merchant
const demoUserId = "usr_demo_tanvir";
const demoOrgId = "org_demo_grihogadget";
const demoStore = {
  id: "00000000-0000-0000-0000-000000000001",
  organizationId: demoOrgId,
  name: "গৃহগ্যাজেট (Grihogadget)",
  subdomain: "grihogadget",
  phone: "+8801711223344",
  ownerName: "তানভীর আহমেদ (Tanvir Ahmed)",
  email: "merchant@demo.com",
  plan: "pilot",
  status: "trialing",
  trialEndsAt: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
  monthlyGmv: 1450000,
  ordersThisMonth: 8,
  themeArchetype: "viral-funnel",
  createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  settings: {
    storeName: "গৃহগ্যাজেট (Grihogadget)",
    ownerName: "তানভীর আহমেদ (Tanvir Ahmed)",
    email: "merchant@demo.com",
    supportPhone: "+8801711223344",
    trialEndsAt: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
    onboardingCompleted: true,
  },
};

export function getRegisteredStoresList(): any[] {
  return Array.from(memStores.values());
}

export function getMemSessionUser(token: string): any {
  if (memSessions.has(token)) {
    const s = memSessions.get(token);
    if (new Date(s.expiresAt) > new Date()) {
      return s.user;
    }
  }
  return null;
}

export function getMemSession(token: string): any {
  if (memSessions.has(token)) {
    const s = memSessions.get(token);
    if (new Date(s.expiresAt) > new Date()) {
      return s;
    }
  }
  return null;
}

export function updateMemStore(storeIdOrSubdomain: string, updates: Record<string, any>): boolean {
  for (const [subdomain, store] of memStores.entries()) {
    if (store.id === storeIdOrSubdomain || store.subdomain === storeIdOrSubdomain) {
      Object.assign(store, updates);
      memStores.set(subdomain, store);
      return true;
    }
  }
  return false;
}

export function deleteMemStore(storeIdOrSubdomain: string): boolean {
  for (const [subdomain, store] of memStores.entries()) {
    if (store.id === storeIdOrSubdomain || store.subdomain === storeIdOrSubdomain) {
      memStores.delete(subdomain);
      return true;
    }
  }
  return false;
}

export function registerMemoryMerchant(data: {
  userId: string;
  name: string;
  email: string;
  hashedPassword: string;
  orgId: string;
  store: any;
}) {
  memUsers.set(data.email, {
    id: data.userId,
    name: data.name,
    email: data.email,
    role: "merchant",
    organizationId: data.orgId,
    store: data.store,
  });
  memStores.set(data.store.subdomain, data.store);
  memAccounts.set(data.userId, {
    id: `acc_${data.userId}`,
    userId: data.userId,
    password: data.hashedPassword,
  });
}

export function isMemorySubdomainTaken(subdomain: string): boolean {
  return memStores.has(subdomain);
}

export function isMemoryEmailTaken(email: string): boolean {
  return memUsers.has(email);
}

// Seeded demo accounts are NEVER created in production (audit V-02 / C1).
// Production super admins are created via `pnpm db:create-admin` with an explicit strong password.
if (config.NODE_ENV !== "production") {
  memStores.set("grihogadget", demoStore);
  memUsers.set("merchant@demo.com", {
    id: demoUserId,
    name: "Tanvir Ahmed",
    email: "merchant@demo.com",
    role: "merchant",
    organizationId: demoOrgId,
    store: demoStore,
  });

  // Pre-populate representative trial stores in dev for Super Admin verification
  const trialStore2 = {
    id: "store_demo_dhakafashion",
    organizationId: "org_demo_dhakafashion",
    name: "ঢাকা ফ্যাশন মার্ট (Dhaka Fashion)",
    subdomain: "dhakafashion",
    phone: "+8801812345678",
    ownerName: "ফাহিম চৌধুরী (Fahim Chowdhury)",
    email: "fahim@dhakafashion.bd",
    plan: "pilot",
    status: "trialing",
    trialEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    monthlyGmv: 820000,
    ordersThisMonth: 4,
    themeArchetype: "neo-clean",
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    settings: {
      storeName: "ঢাকা ফ্যাশন মার্ট (Dhaka Fashion)",
      ownerName: "ফাহিম চৌধুরী (Fahim Chowdhury)",
      email: "fahim@dhakafashion.bd",
      supportPhone: "+8801812345678",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      onboardingCompleted: true,
    },
  };
  memStores.set("dhakafashion", trialStore2);

  const trialStore3 = {
    id: "store_demo_organicbazar",
    organizationId: "org_demo_organicbazar",
    name: "অর্গানিক বাজার বিডি (Organic Bazar BD)",
    subdomain: "organicbazar",
    phone: "+8801912345678",
    ownerName: "নুসরাত জাহান (Nusrat Jahan)",
    email: "nusrat@organicbazar.bd",
    plan: "pilot",
    status: "trialing",
    trialEndsAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(), // Expiring Soon (<= 3 days)
    monthlyGmv: 2840000,
    ordersThisMonth: 15,
    themeArchetype: "organic-fresh",
    createdAt: new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString(),
    settings: {
      storeName: "অর্গানিক বাজার বিডি (Organic Bazar BD)",
      ownerName: "নুসরাত জাহান (Nusrat Jahan)",
      email: "nusrat@organicbazar.bd",
      supportPhone: "+8801912345678",
      trialEndsAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      onboardingCompleted: true,
    },
  };
  memStores.set("organicbazar", trialStore3);

  const trialStore4 = {
    id: "store_demo_smartkitchen",
    organizationId: "org_demo_smartkitchen",
    name: "স্মার্ট কিচেন বাংলাদেশ (Smart Kitchen BD)",
    subdomain: "smartkitchen",
    phone: "+8801719876543",
    ownerName: "মাহমুদুল হাসান (Mahmudul Hasan)",
    email: "mahmud@smartkitchen.bd",
    plan: "pilot",
    status: "expired",
    trialEndsAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), // Expired
    monthlyGmv: 310000,
    ordersThisMonth: 2,
    themeArchetype: "tech-sleek",
    createdAt: new Date(Date.now() - 16 * 24 * 3600 * 1000).toISOString(),
    settings: {
      storeName: "স্মার্ট কিচেন বাংলাদেশ (Smart Kitchen BD)",
      ownerName: "মাহমুদুল হাসান (Mahmudul Hasan)",
      email: "mahmud@smartkitchen.bd",
      supportPhone: "+8801719876543",
      trialEndsAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      onboardingCompleted: true,
    },
  };
  memStores.set("smartkitchen", trialStore4);

  hashPassword("demo12345").then((hashed) => {
    memAccounts.set(demoUserId, {
      id: "acc_demo_tanvir",
      userId: demoUserId,
      password: hashed,
    });
  }).catch(() => {});

  // Dev/test-only default Super Admin
  const superAdminId = "usr_super_admin";
  const defaultSuperAdmin = {
    id: superAdminId,
    name: "Super Admin",
    email: "admin@gocommerce.bd",
    role: "super_admin",
  };
  memUsers.set("admin", defaultSuperAdmin);
  memUsers.set("superadmin", defaultSuperAdmin);
  memUsers.set("admin@gocommerce.bd", defaultSuperAdmin);
  memUsers.set("superadmin@demo.com", defaultSuperAdmin);

  hashPassword("123456").then((hashed) => {
    memAccounts.set(superAdminId, {
      id: "acc_super_admin",
      userId: superAdminId,
      password: hashed,
    });
  }).catch(() => {});
}

// ==========================================
// 1. SUBDOMAIN AVAILABILITY CHECK
// ==========================================
customAuthRouter.get("/check-subdomain", async (c) => {
  const querySubdomain = c.req.query("subdomain") || "";
  const parsed = subdomainSchema.safeParse(querySubdomain);

  if (!parsed.success) {
    return c.json(
      {
        available: false,
        error: "সাবডোমেন ৩-৪০ অক্ষরের ইংরেজি ছোট হাতের অক্ষর ও সংখ্যা হতে হবে",
      },
      400
    );
  }

  const normalized = parsed.data;

  // Reserved platform subdomains
  const reserved = ["app", "admin", "api", "www", "mail", "cdn", "assets", "static", "dashboard"];
  if (reserved.includes(normalized)) {
    return c.json({
      available: false,
      subdomain: normalized,
      error: "এই সাবডোমেনটি প্ল্যাটফর্মের জন্য সংরক্ষিত",
    });
  }

  try {
    const existing = await db.query.stores.findFirst({
      where: eq(stores.subdomain, normalized),
    });

    return c.json({
      available: !existing && !memStores.has(normalized),
      subdomain: normalized,
    });
  } catch {
    return c.json({
      available: !memStores.has(normalized),
      subdomain: normalized,
    });
  }
});

// ==========================================
// 2. REGISTER NEW STORE & MERCHANT ACCOUNT
// ==========================================
customAuthRouter.post("/register-store", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        type: "https://httpstatuses.com/400",
        title: "Bad Request",
        status: 400,
        detail: "Invalid JSON request body",
      },
      400
    );
  }

  const parsed = registerStoreSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Invalid registration data";
    return c.json(
      {
        type: "https://httpstatuses.com/400",
        title: "Validation Error",
        status: 400,
        detail: firstError,
        errors: parsed.error.format(),
      },
      400
    );
  }

  const rawBody = (body && typeof body === "object" ? body : {}) as Record<string, any>;
  const turnstileToken = rawBody.turnstileToken;
  const clientIp =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
    "127.0.0.1";

  const isHuman = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!isHuman) {
    return c.json(
      {
        type: "https://httpstatuses.com/403",
        title: "Bot Verification Failed",
        status: 403,
        detail: "Cloudflare Turnstile verification failed. Please complete the captcha.",
      },
      403
    );
  }

  const { name, email, password, storeName, subdomain, phone } = parsed.data;

  // Check in-memory stores first
  if (memStores.has(subdomain)) {
    return c.json(
      {
        type: "https://httpstatuses.com/409",
        title: "Conflict",
        status: 409,
        detail: "এই সাবডোমেনটি ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য একটি সাবডোমেন নির্বাচন করুন।",
      },
      409
    );
  }

  if (memUsers.has(email)) {
    return c.json(
      {
        type: "https://httpstatuses.com/409",
        title: "Conflict",
        status: 409,
        detail: "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে। লগইন করুন।",
      },
      409
    );
  }

  // Hash Password using memory-hard scrypt
  const hashedPassword = await hashPassword(password);

  // Generate IDs & Tokens
  const userId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const orgId = `org_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionId = `sess_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days
  const storeId = crypto.randomUUID();

  const trialEndsAt = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString();
  const newStoreData = {
    id: storeId,
    organizationId: orgId,
    name: storeName,
    subdomain,
    phone,
    ownerName: name,
    email,
    plan: "pilot",
    status: "trialing",
    trialEndsAt,
    themeArchetype: "viral-funnel",
    settings: {
      storeName,
      ownerName: name,
      email,
      supportPhone: phone,
      onboardingCompleted: true,
      trialEndsAt,
      deliveryChargeInsideDhaka: 6000,
      deliveryChargeSubDhaka: 10000,
      deliveryChargeOutsideDhaka: 12000,
    },
    themeConfig: {
      announcementBarText: "আমাদের স্টোরে আপনাকে স্বাগতম!",
    },
  };

  // Try DB persistence
  try {
    const existingStore = await db.query.stores.findFirst({
      where: eq(stores.subdomain, subdomain),
    });
    if (existingStore) {
      return c.json(
        {
          type: "https://httpstatuses.com/409",
          title: "Conflict",
          status: 409,
          detail: "এই সাবডোমেনটি ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য একটি সাবডোমেন নির্বাচন করুন।",
        },
        409
      );
    }

    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });
    if (existingUser) {
      return c.json(
        {
          type: "https://httpstatuses.com/409",
          title: "Conflict",
          status: 409,
          detail: "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে। লগইন করুন।",
        },
        409
      );
    }

    // Atomic transaction for all store registration tables
    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        name,
        email,
        role: "user",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await tx.insert(account).values({
        id: `acc_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        accountId: email,
        providerId: "credential",
        userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await tx.insert(organization).values({
        id: orgId,
        name: storeName,
        slug: subdomain,
        createdAt: new Date(),
      });

      await tx.insert(member).values({
        id: `mem_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        organizationId: orgId,
        userId,
        role: "owner",
        createdAt: new Date(),
      });

      await tx.insert(stores).values(newStoreData);

      await tx.insert(session).values({
        id: sessionId,
        token: sessionToken,
        userId,
        activeOrganizationId: orgId,
        expiresAt,
        ipAddress: c.req.header("x-forwarded-for") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await tx.insert(auditLogs).values({
        storeId,
        actorId: userId,
        actorType: "user",
        action: "store:create",
        entityType: "store",
        diff: { name: storeName, subdomain, phone },
      });
    });
  } catch (dbErr: any) {
    if (config.NODE_ENV === "production") {
      console.error("[CRITICAL] Database transaction failed during store registration:", dbErr);
      return c.json(
        {
          type: "https://httpstatuses.com/503",
          title: "Service Unavailable",
          status: 503,
          detail: "Store registration failed due to database error. Please try again later.",
        },
        503
      );
    }
    // When DB is offline in test/dev, save to memory storage
    console.warn("DB offline fallback in store registration:", (dbErr as Error).message);
  }

  // Update memory state for cache / fallback (strictly in non-production)
  if (config.NODE_ENV !== "production") {
    memUsers.set(email, {
      id: userId,
      name,
      email,
      role: "user",
      store: newStoreData,
      organizationId: orgId,
    });
    memAccounts.set(userId, {
      id: `acc_${userId}`,
      userId,
      password: hashedPassword,
    });
    memStores.set(subdomain, newStoreData);
    memSessions.set(sessionToken, {
      id: sessionId,
      token: sessionToken,
      userId,
      activeOrganizationId: orgId,
      expiresAt,
      user: {
        id: userId,
        name,
        email,
        role: "user",
        organizationId: orgId,
        store: newStoreData,
      },
    });
  }

  setSessionCookie(c, sessionToken);

  return c.json(
    {
      success: true,
      message: "আপনার দোকান ও অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!",
      user: {
        id: userId,
        name,
        email,
        role: "user",
      },
      store: {
        id: storeId,
        name: storeName,
        subdomain,
        plan: "pilot",
        status: "trialing",
        isTrial: true,
        trialEndsAt,
      },
      token: sessionToken,
      needsOnboarding: false,
    },
    201
  );
});

// ==========================================
// 3. USER & MERCHANT LOGIN
// ==========================================
customAuthRouter.post("/login", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        type: "https://httpstatuses.com/400",
        title: "Bad Request",
        status: 400,
        detail: "Invalid JSON request body",
      },
      400
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        type: "https://httpstatuses.com/400",
        title: "Validation Error",
        status: 400,
        detail: "সঠিক ইমেইল ও পাসওয়ার্ড প্রদান করুন",
      },
      400
    );
  }

  const { email: rawIdentifier, password } = parsed.data;
  const identifier = rawIdentifier.trim().toLowerCase();
  const isEmail = identifier.includes("@");

  let existingUser: any = null;
  let userAccount: any = null;
  let activeStore: any = null;
  let activeOrgId: string | null = null;

  // 3.1 Try Database
  try {
    if (isEmail) {
      existingUser = await db.query.user.findFirst({
        where: eq(user.email, identifier),
      });
    } else {
      // A. Check store subdomain (e.g. "axiswear", "grihogadget")
      const matchedStore = await db.query.stores.findFirst({
        where: eq(stores.subdomain, identifier),
      });

      if (matchedStore) {
        activeStore = matchedStore;
        activeOrgId = matchedStore.organizationId;
        if (matchedStore.organizationId) {
          const userMembership = await db.query.member.findFirst({
            where: eq(member.organizationId, matchedStore.organizationId),
          });
          if (userMembership) {
            existingUser = await db.query.user.findFirst({
              where: eq(user.id, userMembership.userId),
            });
          }
        }
      }

      // B. Check platform super admin aliases ("admin", "superadmin", "super_admin")
      if (!existingUser && config.NODE_ENV !== "production" && (identifier === "admin" || identifier === "superadmin" || identifier === "super_admin")) {
        existingUser = await db.query.user.findFirst({
          where: or(eq(user.role, "super_admin"), eq(user.email, "admin@gocommerce.bd")),
        });
      }

      // C. Check account credential ID
      if (!existingUser) {
        const matchedAccount = await db.query.account.findFirst({
          where: and(
            eq(account.accountId, identifier),
            eq(account.providerId, "credential")
          ),
        });
        if (matchedAccount) {
          existingUser = await db.query.user.findFirst({
            where: eq(user.id, matchedAccount.userId),
          });
        }
      }
    }

    if (existingUser) {
      userAccount = await db.query.account.findFirst({
        where: and(
          eq(account.userId, existingUser.id),
          eq(account.providerId, "credential")
        ),
      });

      if (!activeOrgId) {
        const userMembership = await db.query.member.findFirst({
          where: eq(member.userId, existingUser.id),
        });
        activeOrgId = userMembership?.organizationId || null;
      }

      if (activeOrgId && !activeStore) {
        activeStore = await db.query.stores.findFirst({
          where: eq(stores.organizationId, activeOrgId),
        });
      }
    }
  } catch {
    // Database offline, fall back to memory
  }

  // 3.2 In-memory fallback
  if (!existingUser) {
    if (isEmail && memUsers.has(identifier)) {
      existingUser = memUsers.get(identifier);
    } else if (!isEmail) {
      // A. Check store subdomain in memStores (e.g. "axiswear", "grihogadget")
      if (memStores.has(identifier)) {
        activeStore = memStores.get(identifier);
        activeOrgId = activeStore.organizationId || null;
        for (const u of memUsers.values()) {
          if (
            (u.store && u.store.subdomain === identifier) ||
            (activeOrgId && u.organizationId === activeOrgId) ||
            (u.subdomain && u.subdomain === identifier)
          ) {
            existingUser = u;
            break;
          }
        }
      }

      // B. Check super admin alias in memUsers
      if (!existingUser && (identifier === "admin" || identifier === "superadmin" || identifier === "super_admin")) {
        existingUser = memUsers.get("admin") || memUsers.get("admin@gocommerce.bd") || memUsers.get("superadmin@demo.com");
      }

      // C. Check username or name in memUsers
      if (!existingUser) {
        for (const u of memUsers.values()) {
          if (
            u.id?.toLowerCase() === identifier ||
            u.name?.toLowerCase() === identifier ||
            u.name?.toLowerCase().replace(/\s+/g, "") === identifier ||
            (u.store && u.store.name?.toLowerCase() === identifier)
          ) {
            existingUser = u;
            break;
          }
        }
      }
    }

    if (existingUser) {
      userAccount = memAccounts.get(existingUser.id);
      if (!activeStore) activeStore = existingUser.store || null;
      if (!activeOrgId) activeOrgId = existingUser.organizationId || null;
      if (!activeStore && existingUser.subdomain) {
        activeStore = memStores.get(existingUser.subdomain) || null;
      }
    }
  }

  // Timing-attack mitigation
  if (!existingUser || !userAccount || !userAccount.password) {
    const dummySalt = "00000000000000000000000000000000";
    const dummyKey = "0000000000000000000000000000000000000000000000000000000000000000";
    await verifyPassword(password, `${dummySalt}:${dummyKey}`);
    return c.json(
      {
        type: "https://httpstatuses.com/401",
        title: "Unauthorized",
        status: 401,
        detail: "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়",
      },
      401
    );
  }

  if (existingUser.banned) {
    return c.json(
      {
        type: "https://httpstatuses.com/403",
        title: "Account Banned",
        status: 403,
        detail: existingUser.banReason || "আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত করা হয়েছে।",
      },
      403
    );
  }

  const isValid = await verifyPassword(password, userAccount.password);

  if (!isValid) {
    return c.json(
      {
        type: "https://httpstatuses.com/401",
        title: "Unauthorized",
        status: 401,
        detail: "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়",
      },
      401
    );
  }

  // Generate Session
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionId = `sess_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  try {
    await db.insert(session).values({
      id: sessionId,
      token: sessionToken,
      userId: existingUser.id,
      activeOrganizationId: activeOrgId,
      expiresAt,
      ipAddress: c.req.header("x-forwarded-for") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (err: any) {
    if (config.NODE_ENV === "production") {
      console.error("[CRITICAL] Database failed to persist session:", err);
      return c.json(
        {
          type: "https://httpstatuses.com/503",
          title: "Service Unavailable",
          status: 503,
          detail: "Failed to persist authentication session.",
        },
        503
      );
    }
  }

  if (config.NODE_ENV !== "production") {
    memSessions.set(sessionToken, {
      id: sessionId,
      token: sessionToken,
      userId: existingUser.id,
      activeOrganizationId: activeOrgId,
      expiresAt,
      user: existingUser,
      store: activeStore,
      role: existingUser.role === "super_admin" ? "super_admin" : "owner",
    });
  }

  setSessionCookie(c, sessionToken);

  const isSuper = existingUser.role === "super_admin";
  const hasPassword = Boolean(userAccount?.password);
  const isPlaceholder = !activeStore || (activeStore.phone === "+8801700000000" && (activeStore.name?.includes("'s Store") || activeStore.name?.includes("Google Trial"))) || activeStore.phone === "";
  const onboardingDone = activeStore?.settings?.onboardingCompleted === true;
  const needsOnboarding = isSuper ? false : (!onboardingDone && (isPlaceholder || !activeStore || !hasPassword));

  return c.json({
    success: true,
    message: "সফলভাবে লগইন হয়েছে",
    user: {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
    },
    store: activeStore
      ? {
          id: activeStore.id,
          name: activeStore.name,
          subdomain: activeStore.subdomain,
          plan: activeStore.plan || "pilot",
          status: activeStore.status || "trialing",
          trialEndsAt: activeStore.trialEndsAt || activeStore.settings?.trialEndsAt,
          isTrial: true,
          niche: activeStore.settings?.niche || null,
          onboardingCompleted: onboardingDone,
        }
      : null,
    token: sessionToken,
    needsOnboarding,
  });
});

// ==========================================
// 4. CURRENT SESSION / USER STATUS (/api/auth/me)
// ==========================================
customAuthRouter.get("/me", async (c) => {
  // Test mode mock session support
  if (config.NODE_ENV === "test" && c.req.header("x-test-session")) {
    try {
      const mock = JSON.parse(c.req.header("x-test-session")!);
      return c.json({
        authenticated: true,
        user: mock.user,
        store: mock.session._testStore || null,
        role: mock.session._testRole || "owner",
        needsOnboarding: false,
      });
    } catch {
      // ignore
    }
  }

  let sessionUser: any = null;
  let activeSession: any = null;
  let activeToken: string | null = null;

  // 1. Better Auth native getSession verification (validates signed cookies & bearer tokens)
  try {
    const dbUp = await isDbAvailable();
    if (dbUp) {
      const sessionData = await auth.api.getSession({
        headers: c.req.raw.headers,
      });
      if (sessionData?.session && sessionData?.user) {
        sessionUser = sessionData.user;
        activeSession = sessionData.session;
        activeToken = sessionData.session.token;
      }
    }
  } catch {}

  // 2. Token fallback from headers or cookies
  if (!sessionUser) {
    const token = extractToken(c);
    activeToken = token;

    if (token) {
      // Check memory session first
      if (memSessions.has(token)) {
        const s = memSessions.get(token);
        if (new Date(s.expiresAt) > new Date()) {
          sessionUser = s.user;
          activeSession = s;
        } else {
          memSessions.delete(token);
        }
      }

      // Check database session if not found in memory
      if (!sessionUser) {
        try {
          const dbSession = await db.query.session.findFirst({
            where: eq(session.token, token),
          });
          if (dbSession && new Date(dbSession.expiresAt) > new Date()) {
            activeSession = dbSession;
            sessionUser = await db.query.user.findFirst({
              where: eq(user.id, dbSession.userId),
            });
          }
        } catch {}
      }
    }
  }

  if (!sessionUser || !activeSession) {
    clearSessionCookie(c);
    return c.json({ authenticated: false, user: null, store: null, needsOnboarding: false });
  }

  // 3. Super Admin role resolution & database sync
  const isSuperEmail = Boolean(
    (config.SUPERADMIN_EMAIL &&
      sessionUser.email?.toLowerCase() === config.SUPERADMIN_EMAIL.toLowerCase()) ||
    sessionUser.email === "admin@gocommerce.bd"
  );

  let role = activeSession.role || sessionUser.role || "owner";
  if (isSuperEmail || sessionUser.role === "super_admin") {
    role = "super_admin";
    sessionUser.role = "super_admin";
    if (sessionUser.id) {
      try {
        await db.update(user).set({ role: "super_admin" }).where(eq(user.id, sessionUser.id));
      } catch {}
    }
  }
  const isSuper = role === "super_admin";

  // 4. Store resolution
  let activeStore: any = null;
  if (activeSession.store) {
    activeStore = activeSession.store;
    if (!isSuper && activeSession.role) {
      role = activeSession.role;
    } else if (!isSuper) {
      role = "owner";
    }
  }

  if (!activeStore) {
    try {
      if (activeSession.activeOrganizationId) {
        activeStore = await db.query.stores.findFirst({
          where: eq(stores.organizationId, activeSession.activeOrganizationId),
        });
        const membership = await db.query.member.findFirst({
          where: and(
            eq(member.organizationId, activeSession.activeOrganizationId),
            eq(member.userId, sessionUser.id)
          ),
        });
        if (membership && !isSuper) {
          role = membership.role;
        } else if (!isSuper && activeStore) {
          role = "owner";
        }
      } else {
        const firstMembership = await db.query.member.findFirst({
          where: eq(member.userId, sessionUser.id),
        });
        if (firstMembership) {
          if (!isSuper) role = firstMembership.role;
          activeStore = await db.query.stores.findFirst({
            where: eq(stores.organizationId, firstMembership.organizationId),
          });
        }
      }
    } catch {}
  }

  // 5. Onboarding status check
  let hasPassword = false;
  try {
    const userAccount = await db.query.account.findFirst({
      where: and(eq(account.userId, sessionUser.id), eq(account.providerId, "credential")),
    });
    hasPassword = Boolean(userAccount?.password);
  } catch {}
  if (!hasPassword && memAccounts.has(sessionUser.id)) {
    hasPassword = Boolean(memAccounts.get(sessionUser.id)?.password);
  }

  const isPlaceholder =
    !activeStore ||
    (activeStore.phone === "+8801700000000" &&
      (activeStore.name?.includes("'s Store") || activeStore.name?.includes("Google Trial"))) ||
    activeStore.phone === "";
  const onboardingExplicitlyDone = activeStore?.settings?.onboardingCompleted === true;
  const needsOnboarding = isSuper ? false : (!onboardingExplicitlyDone && (isPlaceholder || !activeStore || !hasPassword));

  const isProd = config.NODE_ENV === "production";
  const domainAttr = isProd && config.PLATFORM_ROOT_DOMAIN ? `; Domain=.${config.PLATFORM_ROOT_DOMAIN}` : "";
  c.header("Set-Cookie", `gocom_logged_in=1; Path=/; SameSite=Lax; Max-Age=2592000${domainAttr}${isProd ? "; Secure" : ""}`, { append: true });

  return c.json({
    authenticated: true,
    user: {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      role: isSuper ? "super_admin" : (sessionUser.role || "user"),
    },
    store: activeStore
      ? (() => {
          const planKey = (activeStore.plan || "pilot").toLowerCase();
          const isPaid = ["starter", "growth", "pro", "enterprise"].includes(planKey) && activeStore.status !== "trialing";
          const isTrial = !isPaid;
          const trialEndsAt =
            (activeStore as any).trialEndsAt ||
            activeStore.settings?.trialEndsAt ||
            activeStore.settings?.endDate ||
            new Date(new Date(activeStore.createdAt || Date.now()).getTime() + 15 * 86400000).toISOString();
          const now = new Date();
          const endMs = new Date(trialEndsAt).getTime();
          const daysRemaining = Math.max(0, Math.ceil((endMs - now.getTime()) / (1000 * 60 * 60 * 24)));

          return {
            id: activeStore.id,
            name: activeStore.name,
            subdomain: activeStore.subdomain,
            phone: activeStore.phone,
            themeArchetype: activeStore.themeArchetype,
            plan: activeStore.plan || "pilot",
            status: activeStore.status || (isTrial ? "trialing" : "active"),
            trialEndsAt,
            daysRemaining,
            isTrial,
            settings: activeStore.settings,
            niche: activeStore.settings?.niche || null,
            onboardingCompleted: onboardingExplicitlyDone,
          };
        })()
      : null,
    role: isSuper ? "super_admin" : role,
    token: activeToken,
    needsOnboarding,
  });
});

// ==========================================
// 4.1 COMPLETE ONBOARDING
// (Store Name & Niche -> Phone Number -> Set Password)
// ==========================================
customAuthRouter.post("/complete-onboarding", async (c) => {
  let sessionUser: any = null;
  let activeOrgId: string | null = null;
  let activeStoreId: string | null = null;
  let sessionObj: any = null;
  let token = extractToken(c);

  // 1. Try Better Auth getSession
  try {
    const dbUp = await isDbAvailable();
    if (dbUp) {
      const sessionData = await auth.api.getSession({ headers: c.req.raw.headers });
      if (sessionData?.session && sessionData?.user) {
        sessionUser = sessionData.user;
        token = sessionData.session.token;
        activeOrgId = sessionData.session.activeOrganizationId || null;
      }
    }
  } catch {}

  // 2. Try memory session
  if (!sessionUser && token && memSessions.has(token)) {
    sessionObj = memSessions.get(token);
    if (new Date(sessionObj.expiresAt) > new Date()) {
      sessionUser = sessionObj.user;
      activeOrgId = sessionObj.activeOrganizationId;
      activeStoreId = sessionObj.store?.id || null;
    }
  }

  // 3. Try database session
  if (!sessionUser && token) {
    try {
      const activeSession = await db.query.session.findFirst({
        where: eq(session.token, token),
      });
      if (activeSession && new Date(activeSession.expiresAt) > new Date()) {
        activeOrgId = activeSession.activeOrganizationId;
        sessionUser = await db.query.user.findFirst({
          where: eq(user.id, activeSession.userId),
        });
        if (activeOrgId) {
          const st = await db.query.stores.findFirst({
            where: eq(stores.organizationId, activeOrgId),
          });
          activeStoreId = st?.id || null;
        }
      }
    } catch {}
  }

  if (!sessionUser) {
    return c.json(
      {
        type: "https://httpstatuses.com/401",
        title: "Unauthorized",
        status: 401,
        detail: "আপনার সেশন মেয়াদোত্তীর্ণ হয়েছে। অনুগ্রহ করে পুনরায় লগইন করুন।",
      },
      401
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        type: "https://httpstatuses.com/400",
        title: "Bad Request",
        status: 400,
        detail: "Invalid JSON request body",
      },
      400
    );
  }

  const parsed = completeOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "তথ্য সঠিক নয়";
    return c.json(
      {
        type: "https://httpstatuses.com/400",
        title: "Validation Error",
        status: 400,
        detail: firstError,
        errors: parsed.error.format(),
      },
      400
    );
  }

  const { storeName, subdomain, niche, phone, password } = parsed.data;

  // Subdomain reserved keywords check
  const reserved = ["app", "admin", "api", "www", "mail", "cdn", "assets", "static", "dashboard"];
  if (reserved.includes(subdomain)) {
    return c.json(
      {
        type: "https://httpstatuses.com/400",
        title: "Bad Request",
        status: 400,
        detail: "এই সাবডোমেনটি প্ল্যাটফর্মের জন্য সংরক্ষিত",
      },
      400
    );
  }

  // Check subdomain conflict in memory
  if (memStores.has(subdomain)) {
    const conflictStore = memStores.get(subdomain);
    if (conflictStore.id !== activeStoreId && conflictStore.organizationId !== activeOrgId) {
      return c.json(
        {
          type: "https://httpstatuses.com/409",
          title: "Conflict",
          status: 409,
          detail: "এই সাবডোমেনটি ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য একটি সাবডোমেন নির্বাচন করুন।",
        },
        409
      );
    }
  }

  // Check DB subdomain conflict
  try {
    const existing = await db.query.stores.findFirst({
      where: eq(stores.subdomain, subdomain),
    });
    if (existing && existing.id !== activeStoreId && existing.organizationId !== activeOrgId) {
      return c.json(
        {
          type: "https://httpstatuses.com/409",
          title: "Conflict",
          status: 409,
          detail: "এই সাবডোমেনটি ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য একটি সাবডোমেন নির্বাচন করুন।",
        },
        409
      );
    }
  } catch {}

  // 15 days free trial calculation
  const trialEndsAt = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString();
  const hashedPassword = await hashPassword(password);

  // Set / update account with password for credentials login
  try {
    const existingAccount = await db.query.account.findFirst({
      where: and(eq(account.userId, sessionUser.id), eq(account.providerId, "credential")),
    });
    if (existingAccount) {
      await db
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(account.id, existingAccount.id));
    } else {
      await db.insert(account).values({
        id: `acc_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        accountId: sessionUser.email,
        providerId: "credential",
        userId: sessionUser.id,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch {}

  memAccounts.set(sessionUser.id, {
    id: `acc_${sessionUser.id}`,
    userId: sessionUser.id,
    password: hashedPassword,
  });

  // Prepare store data
  const storeId = activeStoreId || crypto.randomUUID();
  const orgId = activeOrgId || `org_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

  const updatedStoreData = {
    id: storeId,
    organizationId: orgId,
    name: storeName,
    subdomain,
    phone,
    plan: "pilot",
    status: "trialing",
    trialEndsAt,
    themeArchetype: "viral-funnel",
    settings: {
      storeName,
      supportPhone: phone,
      niche,
      onboardingCompleted: true,
      trialEndsAt,
      deliveryChargeInsideDhaka: 6000,
      deliveryChargeSubDhaka: 10000,
      deliveryChargeOutsideDhaka: 12000,
    },
    themeConfig: {
      announcementBarText: "আমাদের স্টোরে আপনাকে স্বাগতম!",
    },
  };

  // Try DB persistence
  try {
    if (!activeOrgId) {
      await db.insert(organization).values({
        id: orgId,
        name: storeName,
        slug: subdomain,
        createdAt: new Date(),
      });
      await db.insert(member).values({
        id: `mem_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        organizationId: orgId,
        userId: sessionUser.id,
        role: "owner",
        createdAt: new Date(),
      });
      if (token) {
        await db.update(session).set({ activeOrganizationId: orgId }).where(eq(session.token, token));
      }
    }

    if (activeStoreId) {
      await db
        .update(stores)
        .set({
          name: storeName,
          subdomain,
          phone,
          plan: "pilot",
          status: "trialing",
          settings: updatedStoreData.settings,
          updatedAt: new Date(),
        })
        .where(eq(stores.id, activeStoreId));
    } else {
      await db.insert(stores).values(updatedStoreData);
    }
  } catch (err: any) {
    console.warn("DB offline fallback in complete-onboarding:", err?.message);
  }

  // Update memory state
  for (const [sub, st] of memStores.entries()) {
    if (st.id === storeId || st.organizationId === orgId) {
      memStores.delete(sub);
      break;
    }
  }
  memStores.set(subdomain, updatedStoreData);

  const updatedUser = {
    ...sessionUser,
    organizationId: orgId,
    store: updatedStoreData,
  };
  memUsers.set(sessionUser.email, updatedUser);

  if (sessionObj && token) {
    sessionObj.store = updatedStoreData;
    sessionObj.activeOrganizationId = orgId;
    sessionObj.user = updatedUser;
    memSessions.set(token, sessionObj);
  }

  return c.json({
    success: true,
    message: "অভিনন্দন! আপনার দোকান সফলভাবে চালু হয়েছে।",
    user: {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      role: sessionUser.role,
    },
    store: {
      id: storeId,
      name: storeName,
      subdomain,
      phone,
      niche,
      plan: "pilot",
      status: "trialing",
      trialEndsAt,
      isTrial: true,
      onboardingCompleted: true,
    },
    needsOnboarding: false,
  });
});

// ==========================================
// 5. SIGN OUT / LOGOUT
// ==========================================
customAuthRouter.post("/sign-out", async (c) => {
  try {
    const dbUp = await isDbAvailable();
    if (dbUp) {
      await auth.api.signOut({ headers: c.req.raw.headers });
    }
  } catch {}

  const token = extractToken(c);
  if (token) {
    memSessions.delete(token);
    try {
      await db.delete(session).where(eq(session.token, token));
    } catch {
      // ignore
    }
  }

  clearSessionCookie(c);

  return c.json({
    success: true,
    message: "সফলভাবে লগআউট সম্পন্ন হয়েছে",
  });
});

// ==========================================
// 6. GOOGLE AUTHENTICATION ENDPOINTS
// ==========================================
customAuthRouter.get("/google/status", (c) => {
  const isConfigured = Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
  return c.json({
    enabled: isConfigured,
    provider: "google",
  });
});

customAuthRouter.post("/google", async (c) => {
  const isConfigured = Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
  if (!isConfigured) {
    return c.json(
      {
        type: "https://httpstatuses.com/503",
        title: "Google Login Not Configured",
        status: 503,
        detail: "গুগল লগইন এখনো সক্রিয় করা হয়নি। ব্যাকএন্ডে GOOGLE_CLIENT_ID ও GOOGLE_CLIENT_SECRET কনফিগার করুন।",
        configured: false,
      },
      503
    );
  }

  let body: any = {};
  try {
    body = await c.req.json();
  } catch {}

  const hostHeader = c.req.header("host") || "";
  const proto = c.req.header("x-forwarded-proto") || (config.NODE_ENV === "production" ? "https" : "http");
  const originHeader = c.req.header("origin") || (hostHeader ? `${proto}://${hostHeader}` : "");

  const defaultDashboard =
    config.NODE_ENV === "production"
      ? `https://app.${config.PLATFORM_ROOT_DOMAIN}/`
      : `http://localhost:${config.PORT === 3000 ? 5173 : config.PORT}/`;

  const callbackURL = body.callbackURL || originHeader || defaultDashboard;

  // 1. Try Better Auth native social sign-in with full Response & Set-Cookie headers
  try {
    const dbUp = await isDbAvailable();
    if (dbUp) {
      const authReq = new Request(new URL("/api/auth/sign-in/social", c.req.url).toString(), {
        method: "POST",
        headers: c.req.raw.headers,
        body: JSON.stringify({
          provider: "google",
          callbackURL,
        }),
      });
      const authRes = await auth.handler(authReq);
      if (authRes && authRes.status < 400) {
        const isProd = config.NODE_ENV === "production";
        if (isProd && config.PLATFORM_ROOT_DOMAIN) {
          const resHeaders = new Headers(authRes.headers);
          const rawCookies = authRes.headers.getSetCookie ? authRes.headers.getSetCookie() : [];
          if (rawCookies.length > 0) {
            resHeaders.delete("set-cookie");
            for (const cStr of rawCookies) {
              const modified = cStr.toLowerCase().includes("domain=")
                ? cStr
                : `${cStr}; Domain=.${config.PLATFORM_ROOT_DOMAIN}`;
              resHeaders.append("set-cookie", modified);
            }
            return new Response(authRes.body, {
              status: authRes.status,
              headers: resHeaders,
            });
          }
        }
        return authRes;
      }
    }
  } catch (err: any) {
    console.warn("Better Auth sign-in failed, proceeding with direct OAuth fallback:", err);
  }

  // 2. Direct Google OAuth 2.0 URL construction (works even with offline local DB)
  const redirectUri =
    config.NODE_ENV === "production"
      ? `https://app.${config.PLATFORM_ROOT_DOMAIN}/api/auth/callback/google`
      : `http://localhost:${config.PORT}/api/auth/callback/google`;

  const statePayload = Buffer.from(JSON.stringify({ callbackURL, ts: Date.now() })).toString("base64url");
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", config.GOOGLE_CLIENT_ID!);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", statePayload);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  return c.json({
    configured: true,
    url: googleAuthUrl.toString(),
    redirect: true,
  });
});

customAuthRouter.get("/callback/google", async (c) => {
  const code = c.req.query("code");
  const stateStr = c.req.query("state");
  const error = c.req.query("error");

  const hostHeader = c.req.header("host") || "";
  const defaultDashboard =
    config.NODE_ENV === "production"
      ? `https://app.${config.PLATFORM_ROOT_DOMAIN}/`
      : (hostHeader.includes("5173") ? `http://${hostHeader}/` : "http://localhost:5173/");

  let callbackURL = defaultDashboard;
  if (stateStr) {
    try {
      const parsed = JSON.parse(Buffer.from(stateStr, "base64url").toString("utf8"));
      if (parsed.callbackURL) callbackURL = parsed.callbackURL;
    } catch {}
  }

  if (error || !code) {
    return c.redirect(`${callbackURL}?error=${encodeURIComponent(error || "Google sign-in was cancelled")}`);
  }

  const redirectUri =
    config.NODE_ENV === "production"
      ? `https://app.${config.PLATFORM_ROOT_DOMAIN}/api/auth/callback/google`
      : `http://localhost:${config.PORT}/api/auth/callback/google`;

  // 1. Try Better Auth native handler ONLY if DB is connected
  try {
    const dbUp = await isDbAvailable();
    if (dbUp) {
      const rawRes = await auth.handler(c.req.raw);
      const location = rawRes.headers.get("location") || "";
      if (rawRes.status < 400 && !location.includes("error=") && !location.includes("/error")) {
        // Inspect set-cookie to extract session token if possible and append to redirect URL
        let sessionToken: string | null = null;
        try {
          const cookieHeader = rawRes.headers.get("set-cookie");
          if (cookieHeader) {
            const sess = await auth.api.getSession({
              headers: new Headers({ cookie: cookieHeader }),
            });
            if (sess?.session?.token) {
              sessionToken = sess.session.token;
            }
          }
        } catch {}

        const redirectHeaders = new Headers(rawRes.headers);
        const isProd = config.NODE_ENV === "production";
        const domainAttr = isProd && config.PLATFORM_ROOT_DOMAIN ? `; Domain=.${config.PLATFORM_ROOT_DOMAIN}` : "";
        redirectHeaders.append(
          "Set-Cookie",
          `gocom_logged_in=1; Path=/; SameSite=Lax; Max-Age=2592000${domainAttr}${isProd ? "; Secure" : ""}`
        );

        if (sessionToken) {
          const target = new URL(location || callbackURL);
          target.searchParams.set("auth_token", sessionToken);
          redirectHeaders.set("Location", target.toString());
        }

        return new Response(null, {
          status: 302,
          headers: redirectHeaders,
        });
      } else {
        console.warn("Better Auth callback returned error or non-success, attempting direct Google OAuth exchange:", {
          status: rawRes.status,
          location,
        });
      }
    }
  } catch (e) {
    // Database offline or exception, proceed with direct Google OAuth exchange
    console.warn("Better Auth callback exception, proceeding with direct exchange:", e);
  }

  // 2. Exchange authorization code directly with Google
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID!,
        client_secret: config.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange Google token");
    }

    // 3. Fetch Google User Profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const userEmail = profile.email || "google.user@example.com";
    const userName = profile.name || profile.given_name || userEmail.split("@")[0];
    const userPicture = profile.picture;

    const isSuperEmail = Boolean(
      (config.SUPERADMIN_EMAIL &&
        userEmail.toLowerCase() === config.SUPERADMIN_EMAIL.toLowerCase()) ||
      userEmail === "admin@gocommerce.bd"
    );

    // Check or create user in database if DB is available
    let dbUser: any = null;
    try {
      dbUser = await db.query.user.findFirst({
        where: eq(user.email, userEmail),
      });
      if (!dbUser) {
        const newUserId = `usr_google_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
        await db.insert(user).values({
          id: newUserId,
          name: userName,
          email: userEmail,
          role: isSuperEmail ? "super_admin" : "user",
          image: userPicture,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        dbUser = await db.query.user.findFirst({ where: eq(user.id, newUserId) });
      } else if (isSuperEmail && dbUser.role !== "super_admin") {
        await db.update(user).set({ role: "super_admin" }).where(eq(user.id, dbUser.id));
        dbUser.role = "super_admin";
      }
    } catch {}

    // Check or create user in in-memory storage
    let existingUser = memUsers.get(userEmail) || dbUser;
    const trialEndsAt = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString();
    if (!existingUser) {
      const newUserId = `usr_google_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const newOrgId = `org_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const userSubdomain = userEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || `shop${Math.floor(1000 + Math.random() * 9000)}`;
      const userStore = {
        id: crypto.randomUUID(),
        organizationId: newOrgId,
        name: `${userName}'s Store`,
        subdomain: userSubdomain,
        phone: "",
        plan: "pilot",
        status: "trialing",
        trialEndsAt,
        themeArchetype: "viral-funnel",
        settings: {
          storeName: `${userName}'s Store`,
          onboardingCompleted: false,
          trialEndsAt,
        },
      };
      existingUser = {
        id: newUserId,
        name: userName,
        email: userEmail,
        image: userPicture,
        role: isSuperEmail ? "super_admin" : "merchant",
        organizationId: newOrgId,
        store: userStore,
      };
      memUsers.set(userEmail, existingUser);
      memStores.set(userSubdomain, userStore);
    }

    // 4. Create Session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    try {
      if (dbUser) {
        await db.insert(session).values({
          id: sessionId,
          token: sessionToken,
          userId: dbUser.id,
          expiresAt,
          ipAddress: c.req.header("x-forwarded-for") || "127.0.0.1",
          userAgent: c.req.header("user-agent") || "google_oauth",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch {}

    const sessionObj = {
      token: sessionToken,
      userId: existingUser.id,
      user: existingUser,
      store: existingUser.store,
      role: isSuperEmail ? "super_admin" : (existingUser.role || "owner"),
      expiresAt,
    };
    memSessions.set(sessionToken, sessionObj);

    // Set cookie on response
    setSessionCookie(c, sessionToken);

    const targetUrl = new URL(callbackURL);
    targetUrl.searchParams.set("auth_token", sessionToken);
    return c.redirect(targetUrl.toString());
  } catch (err: any) {
    console.error("Google OAuth token exchange error:", err);
    return c.redirect(`${callbackURL}?error=${encodeURIComponent(err.message || "Google authentication failed")}`);
  }
});

// Graceful fallback for Better Auth /error redirect
customAuthRouter.get("/error", (c) => {
  const error = c.req.query("error") || "auth_error";
  const hostHeader = c.req.header("host") || "";
  const defaultDashboard =
    config.NODE_ENV === "production"
      ? `https://app.${config.PLATFORM_ROOT_DOMAIN}/`
      : (hostHeader.includes("5173") ? `http://${hostHeader}/` : "http://localhost:5173/");
  return c.redirect(`${defaultDashboard}?error=${encodeURIComponent(error)}`);
});

customAuthRouter.post("/google/demo", async (c) => {
  // Only permit in development or test environments
  if (config.NODE_ENV === "production" && config.DEV_TENANT_FALLBACK !== "1") {
    return c.json(
      {
        type: "https://httpstatuses.com/403",
        title: "Forbidden",
        status: 403,
        detail: "Demo authentication is disabled in production.",
      },
      403
    );
  }

  let body: any = {};
  try {
    body = await c.req.json();
  } catch {}

  const isFreshTrial = body?.freshTrial === true || body?.newUser === true || c.req.query("fresh") === "1";

  const demoGoogleUserId = isFreshTrial ? "usr_demo_google_trial" : "usr_demo_google_merchant";
  const demoGoogleEmail = isFreshTrial ? "google.trial@demo.com" : "google.merchant@demo.com";
  const demoGoogleName = isFreshTrial ? "Google Trial User" : "Google Merchant (Demo)";
  const trialEndsAt = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString();

  let demoGoogleStore: any;
  let demoGoogleOrgId: string;

  if (isFreshTrial) {
    demoGoogleOrgId = "org_demo_google_trial";
    const trialSubdomain = `trial-${Math.floor(1000 + Math.random() * 9000)}`;
    demoGoogleStore = {
      id: crypto.randomUUID(),
      organizationId: demoGoogleOrgId,
      name: "Google Trial Store",
      subdomain: trialSubdomain,
      phone: "+8801700112233",
      ownerName: demoGoogleName,
      email: demoGoogleEmail,
      plan: "pilot",
      status: "trialing",
      trialEndsAt,
      themeArchetype: "viral-funnel",
      settings: {
        storeName: "Google Trial Store",
        ownerName: demoGoogleName,
        email: demoGoogleEmail,
        supportPhone: "+8801700112233",
        onboardingCompleted: false,
        trialEndsAt,
      },
    };
    memStores.set(trialSubdomain, demoGoogleStore);
    memAccounts.delete(demoGoogleUserId);
  } else {
    demoGoogleOrgId = demoOrgId;
    const demoGoogleSubdomain = "grihogadget";
    demoGoogleStore = memStores.get(demoGoogleSubdomain) || demoStore;
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionId = `sess_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  const demoGoogleUser = {
    id: demoGoogleUserId,
    name: demoGoogleName,
    email: demoGoogleEmail,
    role: "merchant",
    store: demoGoogleStore,
    organizationId: demoGoogleOrgId,
  };

  memUsers.set(demoGoogleEmail, demoGoogleUser);

  try {
    const existing = await db.query.user.findFirst({
      where: eq(user.email, demoGoogleEmail),
    });

    if (!existing) {
      await db.insert(user).values({
        id: demoGoogleUserId,
        name: demoGoogleName,
        email: demoGoogleEmail,
        role: "user",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(account).values({
        id: `acc_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        accountId: demoGoogleEmail,
        providerId: "google",
        userId: demoGoogleUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await db.insert(session).values({
      id: sessionId,
      token: sessionToken,
      userId: demoGoogleUserId,
      activeOrganizationId: demoGoogleOrgId,
      expiresAt,
      ipAddress: c.req.header("x-forwarded-for") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch {
    // DB offline fallback
  }

  memSessions.set(sessionToken, {
    id: sessionId,
    token: sessionToken,
    userId: demoGoogleUserId,
    activeOrganizationId: demoGoogleOrgId,
    expiresAt,
    user: demoGoogleUser,
    store: demoGoogleStore,
    role: "owner",
  });

  setSessionCookie(c, sessionToken);

  return c.json({
    success: true,
    message: "গুগল অ্যাকাউন্ট দিয়ে সফলভাবে লগইন হয়েছে",
    user: {
      id: demoGoogleUserId,
      name: demoGoogleName,
      email: demoGoogleEmail,
      role: "merchant",
    },
    store: {
      id: demoGoogleStore.id,
      name: demoGoogleStore.name,
      subdomain: demoGoogleStore.subdomain,
      plan: demoGoogleStore.plan || "pilot",
      status: demoGoogleStore.status || "trialing",
      trialEndsAt: demoGoogleStore.trialEndsAt || trialEndsAt,
      isTrial: true,
      onboardingCompleted: !isFreshTrial,
    },
    token: sessionToken,
    needsOnboarding: isFreshTrial,
  });
});

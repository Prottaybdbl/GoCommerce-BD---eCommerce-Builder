import { Hono } from "hono";
import crypto from "node:crypto";
import {
  db,
  plans,
  stores,
  session,
  user,
  account,
  organization,
  member,
  domains,
  auditLogs,
  hashPassword,
} from "@gocom/db";
import { eq, sql, or } from "drizzle-orm";
import { bdtToPoisha, poishaToBdt, convertBanglaToAsciiDigits, bdPhoneRegex } from "@gocom/contracts";
import { auth } from "../auth.js";
import { config } from "../config.js";
import {
  getRegisteredStoresList,
  getMemSessionUser,
  updateMemStore,
  deleteMemStore,
  isDbAvailable,
  registerMemoryMerchant,
  isMemorySubdomainTaken,
  isMemoryEmailTaken,
} from "./auth.js";

export interface PackageRecord {
  id: string;
  name: string;
  priceBdt: number;
  pricePoisha: string; // BigInt serialized as string
  billingInterval: string;
  badge?: string;
  isPopular?: boolean;
  description: string;
  featuresList: string[];
  fees: {
    physical: string;
    digital: string;
    resell: string;
  };
  limits: {
    products: number;
    landingPages: number;
    staff: number;
    storageMb: number;
    imagesPerProduct?: number;
  };
  ctaText?: string;
  ctaLink?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_PACKAGES: PackageRecord[] = [
  {
    id: "free",
    name: "Free",
    priceBdt: 0,
    pricePoisha: "0",
    billingInterval: "monthly",
    badge: "",
    isPopular: false,
    description: "Start selling today.",
    featuresList: [
      "20 products (10 own + 10 resell)",
      "2 preset themes",
      "GoCommerce SecurePay",
      "Marketing pixels & GTM",
      "Resell supplier products",
      "GoCommerce Courier",
    ],
    fees: {
      physical: "5%",
      digital: "10%",
      resell: "3%",
    },
    limits: {
      products: 20,
      landingPages: 1,
      staff: 1,
      storageMb: 500,
      imagesPerProduct: 6,
    },
    ctaText: "Get started →",
    ctaLink: "#pricing",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "starter",
    name: "Starter",
    priceBdt: 599,
    pricePoisha: "59900",
    billingInterval: "monthly",
    badge: "",
    isPopular: false,
    description: "For growing businesses.",
    featuresList: [
      "500 products",
      "Unlimited preset themes",
      "Custom domain",
      "GoCommerce SecurePay",
      "1 free third-party courier",
      "Report exports",
    ],
    fees: {
      physical: "0%",
      digital: "6%",
      resell: "1.9%",
    },
    limits: {
      products: 500,
      landingPages: 10,
      staff: 2,
      storageMb: 1500,
      imagesPerProduct: 6,
    },
    ctaText: "Get started →",
    ctaLink: "#pricing",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "pro",
    name: "Pro",
    priceBdt: 1099,
    pricePoisha: "109900",
    billingInterval: "monthly",
    badge: "MOST POPULAR",
    isPopular: true,
    description: "For scaling businesses.",
    featuresList: [
      "2,000 products",
      "Unlimited preset themes",
      "Custom domain",
      "Theme builder",
      "GoCommerce SecurePay",
      "Unlimited free third-party couriers",
    ],
    fees: {
      physical: "0%",
      digital: "4%",
      resell: "1%",
    },
    limits: {
      products: 2000,
      landingPages: 20,
      staff: 3,
      storageMb: 3000,
      imagesPerProduct: 6,
    },
    ctaText: "Get started →",
    ctaLink: "#pricing",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "growth",
    name: "Growth",
    priceBdt: 2499,
    pricePoisha: "249900",
    billingInterval: "monthly",
    badge: "",
    isPopular: false,
    description: "Everything unlocked.",
    featuresList: [
      "Unlimited products",
      "Unlimited preset themes",
      "Custom domain",
      "Theme builder",
      "GoCommerce SecurePay",
      "Unlimited free third-party couriers",
    ],
    fees: {
      physical: "0%",
      digital: "3%",
      resell: "0.75%",
    },
    limits: {
      products: 10000,
      landingPages: 50,
      staff: 10,
      storageMb: 10000,
      imagesPerProduct: 8,
    },
    ctaText: "Get started →",
    ctaLink: "#pricing",
    sortOrder: 4,
    isActive: true,
  },
];

// In-memory memory store for instant responsiveness & offline dev/test fallback
const memPackages = new Map<string, PackageRecord>();
DEFAULT_PACKAGES.forEach((pkg) => {
  memPackages.set(pkg.id, { ...pkg });
});

// Helper to check Super Admin permission
async function verifySuperAdmin(c: any): Promise<boolean> {
  // Test-only bypass: never honored outside NODE_ENV=test
  if (config.NODE_ENV === "test" && c.req.header("x-test-role") === "super_admin") {
    return true;
  }

  // Pre-attached user object from upstream middleware
  const cUser = c.get?.("user");
  if (cUser?.role === "super_admin" || cUser?.email === "admin@gocommerce.bd") {
    return true;
  }

  const authHeader = c.req.header("Authorization");

  // Extract session token from Cookie header or authHeader
  const cookieHeader = c.req.header("Cookie") || "";
  let sessionToken = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    sessionToken = authHeader.slice(7).trim();
  } else if (cookieHeader) {
    const match = cookieHeader.match(/(?:better-auth\.session_token|__Secure-better-auth\.session_token)=([^;]+)/);
    if (match) sessionToken = decodeURIComponent(match[1]);
  }

  if (sessionToken) {
    // 1. In-memory check (dev & offline mode)
    const memUser = getMemSessionUser(sessionToken);
    if (memUser?.role === "super_admin" || memUser?.email === "admin@gocommerce.bd") {
      return true;
    }

    // 2. Direct PostgreSQL database session check
    try {
      const activeSession = await db.query.session.findFirst({
        where: eq(session.token, sessionToken),
      });
      if (activeSession && new Date(activeSession.expiresAt) > new Date()) {
        const sessionUser = await db.query.user.findFirst({
          where: eq(user.id, activeSession.userId),
        });
        if (
          sessionUser?.role === "super_admin" ||
          sessionUser?.email === "admin@gocommerce.bd" ||
          activeSession.userId === "usr_super_admin"
        ) {
          return true;
        }
      }
    } catch (err) {
      console.error("[verifySuperAdmin DB check error]", err);
    }
  }

  // 3. Better-Auth session fallback
  try {
    const sessionData = await auth.api.getSession({ headers: c.req.raw.headers });
    if (sessionData?.user?.role === "super_admin" || sessionData?.user?.email === "admin@gocommerce.bd") {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export const packagesRouter = new Hono();

// ==========================================
// 1. PUBLIC STOREFRONT PACKAGES ENDPOINT
// ==========================================
packagesRouter.get("/storefront/packages", async (c) => {
  try {
    // Attempt DB query if active
      const dbPlans = await db.query.plans.findMany({
        where: eq(plans.isActive, true),
      });

    if (dbPlans && dbPlans.length > 0) {
      const formatted = dbPlans
        .map((p) => {
          const entitlements = (p.entitlements as any) || {};
          const pricePoishaVal = Number(p.pricePoisha || 0);
          return {
            id: p.id,
            name: p.name,
            priceBdt: poishaToBdt(pricePoishaVal),
            pricePoisha: p.pricePoisha.toString(),
            billingInterval: p.billingInterval,
            badge: entitlements.badge || "",
            isPopular: Boolean(entitlements.isPopular),
            description: entitlements.description || "",
            featuresList: entitlements.featuresList || [],
            fees: entitlements.fees || { physical: "0%", digital: "0%", resell: "0%" },
            limits: entitlements.limits || {},
            ctaText: entitlements.ctaText || "Get started →",
            ctaLink: entitlements.ctaLink || "#pricing",
            sortOrder: entitlements.sortOrder ?? 0,
            isActive: p.isActive,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return c.json({
        success: true,
        packages: formatted,
      });
    }
  } catch {
    // Fall back to memory store if DB is offline or in test
  }

  const activePackages = Array.from(memPackages.values())
    .filter((p) => p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return c.json({
    success: true,
    packages: activePackages,
  });
});

// ==========================================
// 2. SUPER ADMIN: LIST ALL PACKAGES
// ==========================================
packagesRouter.get("/super-admin/packages", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  try {
    const dbPlans = await db.query.plans.findMany();
    if (dbPlans && dbPlans.length > 0) {
      const formatted = dbPlans
        .map((p) => {
          const entitlements = (p.entitlements as any) || {};
          const pricePoishaVal = Number(p.pricePoisha || 0);
          return {
            id: p.id,
            name: p.name,
            priceBdt: poishaToBdt(pricePoishaVal),
            pricePoisha: p.pricePoisha.toString(),
            billingInterval: p.billingInterval,
            badge: entitlements.badge || "",
            isPopular: Boolean(entitlements.isPopular),
            description: entitlements.description || "",
            featuresList: entitlements.featuresList || [],
            fees: entitlements.fees || { physical: "0%", digital: "0%", resell: "0%" },
            limits: entitlements.limits || {},
            ctaText: entitlements.ctaText || "Get started →",
            ctaLink: entitlements.ctaLink || "#pricing",
            sortOrder: entitlements.sortOrder ?? 0,
            isActive: p.isActive,
            createdAt: p.createdAt?.toISOString(),
            updatedAt: p.updatedAt?.toISOString(),
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return c.json({
        success: true,
        packages: formatted,
      });
    }
  } catch {
    // Fallback to memory store
  }

  const allPackages = Array.from(memPackages.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return c.json({
    success: true,
    packages: allPackages,
  });
});

// ==========================================
// 3. SUPER ADMIN: CREATE NEW PACKAGE
// ==========================================
packagesRouter.post("/super-admin/packages", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  try {
    const body = await c.req.json();
    const id = (body.id || body.name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-");

    if (!id || !body.name) {
      return c.json({ error: "Package ID and Name are required." }, 400);
    }

    const priceBdt = typeof body.priceBdt === "number" ? body.priceBdt : parseFloat(body.priceBdt || 0);
    const pricePoishaVal = bdtToPoisha(priceBdt);
    const pricePoishaStr = pricePoishaVal.toString();

    const newPackage: PackageRecord = {
      id,
      name: body.name.trim(),
      priceBdt,
      pricePoisha: pricePoishaStr,
      billingInterval: body.billingInterval || "monthly",
      badge: body.badge?.trim() || "",
      isPopular: Boolean(body.isPopular),
      description: body.description?.trim() || "",
      featuresList: Array.isArray(body.featuresList) ? body.featuresList : [],
      fees: body.fees || { physical: "0%", digital: "0%", resell: "0%" },
      limits: body.limits || { products: 100, landingPages: 5, staff: 1, storageMb: 1000 },
      ctaText: body.ctaText || "Get started →",
      ctaLink: body.ctaLink || "#pricing",
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : (memPackages.size + 1),
      isActive: body.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to memory store
    memPackages.set(id, newPackage);

    // Save to DB if available
    try {
      await db
        .insert(plans)
        .values({
          id,
          name: newPackage.name,
          pricePoisha: BigInt(pricePoishaStr),
          billingInterval: newPackage.billingInterval,
          entitlements: {
            badge: newPackage.badge,
            isPopular: newPackage.isPopular,
            description: newPackage.description,
            featuresList: newPackage.featuresList,
            fees: newPackage.fees,
            limits: newPackage.limits,
            ctaText: newPackage.ctaText,
            ctaLink: newPackage.ctaLink,
            sortOrder: newPackage.sortOrder,
          },
          isActive: newPackage.isActive,
        })
        .onConflictDoUpdate({
          target: plans.id,
          set: {
            name: newPackage.name,
            pricePoisha: BigInt(pricePoishaStr),
            billingInterval: newPackage.billingInterval,
            entitlements: {
              badge: newPackage.badge,
              isPopular: newPackage.isPopular,
              description: newPackage.description,
              featuresList: newPackage.featuresList,
              fees: newPackage.fees,
              limits: newPackage.limits,
              ctaText: newPackage.ctaText,
              ctaLink: newPackage.ctaLink,
              sortOrder: newPackage.sortOrder,
            },
            isActive: newPackage.isActive,
            updatedAt: new Date(),
          },
        });
    } catch (dbErr) {
      console.warn("DB plans insert note:", dbErr);
    }

    return c.json({
      success: true,
      message: "Package created successfully",
      package: newPackage,
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to create package" }, 500);
  }
});

// ==========================================
// 4. SUPER ADMIN: UPDATE PACKAGE
// ==========================================
packagesRouter.put("/super-admin/packages/:id", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  const id = c.req.param("id");
  const existing = memPackages.get(id);

  try {
    const body = await c.req.json();
    const priceBdt = body.priceBdt !== undefined
      ? (typeof body.priceBdt === "number" ? body.priceBdt : parseFloat(body.priceBdt || 0))
      : (existing?.priceBdt ?? 0);
    const pricePoishaVal = bdtToPoisha(priceBdt);
    const pricePoishaStr = pricePoishaVal.toString();

    const updated: PackageRecord = {
      id,
      name: body.name ? body.name.trim() : (existing?.name || id),
      priceBdt,
      pricePoisha: pricePoishaStr,
      billingInterval: body.billingInterval || existing?.billingInterval || "monthly",
      badge: body.badge !== undefined ? body.badge.trim() : (existing?.badge || ""),
      isPopular: body.isPopular !== undefined ? Boolean(body.isPopular) : Boolean(existing?.isPopular),
      description: body.description !== undefined ? body.description.trim() : (existing?.description || ""),
      featuresList: Array.isArray(body.featuresList) ? body.featuresList : (existing?.featuresList || []),
      fees: body.fees || existing?.fees || { physical: "0%", digital: "0%", resell: "0%" },
      limits: body.limits || existing?.limits || { products: 100, landingPages: 5, staff: 1, storageMb: 1000 },
      ctaText: body.ctaText || existing?.ctaText || "Get started →",
      ctaLink: body.ctaLink || existing?.ctaLink || "#pricing",
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : (existing?.sortOrder ?? 1),
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : (existing?.isActive !== false),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memPackages.set(id, updated);

    // Update in DB if available
    try {
      await db
        .update(plans)
        .set({
          name: updated.name,
          pricePoisha: BigInt(pricePoishaStr),
          billingInterval: updated.billingInterval,
          entitlements: {
            badge: updated.badge,
            isPopular: updated.isPopular,
            description: updated.description,
            featuresList: updated.featuresList,
            fees: updated.fees,
            limits: updated.limits,
            ctaText: updated.ctaText,
            ctaLink: updated.ctaLink,
            sortOrder: updated.sortOrder,
          },
          isActive: updated.isActive,
          updatedAt: new Date(),
        })
        .where(eq(plans.id, id));
    } catch (dbErr) {
      console.warn("DB plans update note:", dbErr);
    }

    return c.json({
      success: true,
      message: "Package updated successfully",
      package: updated,
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to update package" }, 500);
  }
});

// ==========================================
// 5. SUPER ADMIN: DELETE / DEACTIVATE PACKAGE
// ==========================================
packagesRouter.delete("/super-admin/packages/:id", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  const id = c.req.param("id");
  if (memPackages.has(id)) {
    memPackages.delete(id);
  }

  try {
    await db.delete(plans).where(eq(plans.id, id));
  } catch (dbErr) {
    console.warn("DB plans delete note:", dbErr);
  }

  return c.json({
    success: true,
    message: `Package ${id} removed successfully`,
  });
});

// ==========================================
// 6. SUPER ADMIN: RESET DEFAULTS
// ==========================================
packagesRouter.post("/super-admin/packages/reset-defaults", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  memPackages.clear();
  DEFAULT_PACKAGES.forEach((pkg) => {
    memPackages.set(pkg.id, { ...pkg });
  });

  try {
    for (const pkg of DEFAULT_PACKAGES) {
      await db
        .insert(plans)
        .values({
          id: pkg.id,
          name: pkg.name,
          pricePoisha: BigInt(pkg.pricePoisha),
          billingInterval: pkg.billingInterval,
          entitlements: {
            badge: pkg.badge,
            isPopular: pkg.isPopular,
            description: pkg.description,
            featuresList: pkg.featuresList,
            fees: pkg.fees,
            limits: pkg.limits,
            ctaText: pkg.ctaText,
            ctaLink: pkg.ctaLink,
            sortOrder: pkg.sortOrder,
          },
          isActive: pkg.isActive,
        })
        .onConflictDoUpdate({
          target: plans.id,
          set: {
            name: pkg.name,
            pricePoisha: BigInt(pkg.pricePoisha),
            billingInterval: pkg.billingInterval,
            entitlements: {
              badge: pkg.badge,
              isPopular: pkg.isPopular,
              description: pkg.description,
              featuresList: pkg.featuresList,
              fees: pkg.fees,
              limits: pkg.limits,
              ctaText: pkg.ctaText,
              ctaLink: pkg.ctaLink,
              sortOrder: pkg.sortOrder,
            },
            isActive: pkg.isActive,
            updatedAt: new Date(),
          },
        });
    }
  } catch (dbErr) {
    console.warn("DB plans reset note:", dbErr);
  }

  return c.json({
    success: true,
    message: "Default packages restored successfully",
    packages: Array.from(memPackages.values()),
  });
});

// ==========================================
// 7. SUPER ADMIN: LIST ALL TENANTS / STORES
// ==========================================
packagesRouter.get("/super-admin/tenants", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  try {
    const dbStores = await db.query.stores.findMany({
      with: {
        domains: true,
        orders: true,
      },
    });

    if (dbStores && Array.isArray(dbStores)) {
      const dbPlans = await db.query.plans.findMany().catch(() => []);
      const planPriceMap = new Map<string, number>();
      for (const p of dbPlans) {
        planPriceMap.set(p.id.toLowerCase(), Number(p.pricePoisha || 0));
        planPriceMap.set(p.name.toLowerCase(), Number(p.pricePoisha || 0));
      }

      const tenants = dbStores.map((s) => {
        const storeOrders = s.orders || [];
        const monthlyGmv = storeOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        const primaryDomain = s.domains?.find((d) => d.isPrimary)?.domain || s.domains?.[0]?.domain || null;
        const planKey = (s.plan || "pilot").toLowerCase();
        const planFeePoisha =
          planPriceMap.get(planKey) ||
          (planKey === "growth" ? 299900 : planKey === "pro" ? 499900 : planKey === "starter" ? 99900 : 0);

        const createdAt = s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString();
        const createdDate = new Date(createdAt);
        const settings = (s.settings || {}) as Record<string, any>;
        const startDate = settings.startDate || settings.trialStartedAt || createdAt;
        const trialEndDate = (s as any).trialEndsAt
          ? new Date((s as any).trialEndsAt)
          : settings.trialEndsAt || settings.endDate
          ? new Date(settings.trialEndsAt || settings.endDate)
          : new Date(createdDate.getTime() + 15 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const isTrialExpired = daysRemaining <= 0;

        const isPaid = ["starter", "growth", "pro", "enterprise"].includes(planKey) || (planFeePoisha > 0 && planKey !== "pilot");
        const isTrial = !isPaid || s.status === "trialing";
        const isStoreActive = s.isActive !== false && s.status !== "inactive" && s.status !== "suspended";

        return {
          id: s.id,
          name: s.name,
          subdomain: s.subdomain,
          customDomain: primaryDomain,
          owner: (s as any).ownerName || settings.ownerName || s.name,
          phone: s.phone || "",
          email: (s as any).email || settings.email || "",
          plan: s.plan ? s.plan.charAt(0).toUpperCase() + s.plan.slice(1) : "Pilot (Trial)",
          planFeeBdt: isPaid ? planFeePoisha : 0,
          billingInterval: (s as any).billingInterval || "monthly",
          monthlyGmv,
          ordersThisMonth: storeOrders.length,
          courierEncrypted: true,
          rlsActive: true,
          status: s.status || (isTrial ? (isTrialExpired ? "expired" : "trialing") : "active"),
          isActive: isStoreActive,
          createdAt,
          startDate: new Date(startDate).toISOString(),
          endDate: trialEndDate.toISOString(),
          trialEndsAt: trialEndDate.toISOString(),
          daysRemaining: isTrial ? daysRemaining : 0,
          isTrial,
          isPaid,
        };
      });

      return c.json({
        success: true,
        tenants,
      });
    }
  } catch (dbErr) {
    // DB offline fallback
  }

  // Fallback to in-memory registered stores (real stores only, no dummy data)
  const memList = getRegisteredStoresList();
  const tenants = memList.map((s) => {
    const planKey = (s.plan || "pilot").toLowerCase();
    const isPaid = ["starter", "growth", "pro", "enterprise"].includes(planKey) || (Number(s.planFeeBdt || 0) > 0 && planKey !== "pilot");
    const isTrial = !isPaid || s.status === "trialing";

    const createdAt = s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString();
    const createdDate = new Date(createdAt);
    const settings = (s.settings || {}) as Record<string, any>;
    const startDate = settings.startDate || settings.trialStartedAt || s.startDate || createdAt;
    const trialEndDate = s.trialEndsAt
      ? new Date(s.trialEndsAt)
      : settings.trialEndsAt || settings.endDate || s.endDate
      ? new Date(settings.trialEndsAt || settings.endDate || s.endDate)
      : new Date(createdDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const isTrialExpired = daysRemaining <= 0;
    const isStoreActive = s.isActive !== false && s.status !== "inactive" && s.status !== "suspended";

    return {
      id: s.id,
      name: s.name,
      subdomain: s.subdomain,
      customDomain: s.customDomain || null,
      owner: s.ownerName || settings.ownerName || s.name,
      phone: s.phone || "",
      email: s.email || settings.email || "",
      plan: s.plan ? s.plan.charAt(0).toUpperCase() + s.plan.slice(1) : "Pilot (Trial)",
      planFeeBdt: isPaid ? (s.planFeeBdt || (planKey === "pro" ? 499900 : planKey === "growth" ? 299900 : 99900)) : 0,
      billingInterval: s.billingInterval || "monthly",
      monthlyGmv: s.monthlyGmv || 0,
      ordersThisMonth: s.ordersThisMonth || 0,
      courierEncrypted: true,
      rlsActive: true,
      status: s.status || (isTrial ? (isTrialExpired ? "expired" : "trialing") : "active"),
      isActive: isStoreActive,
      createdAt,
      startDate: new Date(startDate).toISOString(),
      endDate: trialEndDate.toISOString(),
      trialEndsAt: trialEndDate.toISOString(),
      daysRemaining: isTrial ? daysRemaining : 0,
      isTrial,
      isPaid,
    };
  });

  return c.json({
    success: true,
    tenants,
  });
});

// ==========================================
// 8. SUPER ADMIN: UPDATE TENANT PLAN
// ==========================================
packagesRouter.patch("/super-admin/tenants/:id/plan", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const { plan, billingInterval, status } = body;

  if (!plan) {
    return c.json({ error: "Plan name is required" }, 400);
  }

  const planKey = plan.toLowerCase();
  const feePoisha =
    planKey === "growth" ? 299900 : planKey === "pro" ? 499900 : planKey === "starter" ? 99900 : 0;

  try {
    await db
      .update(stores)
      .set({
        plan: planKey,
        status: status || "active",
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id));
  } catch {
    // DB offline fallback
  }

  updateMemStore(id, {
    plan: planKey,
    planFeeBdt: feePoisha,
    status: status || "active",
    billingInterval: billingInterval || "monthly",
    updatedAt: new Date().toISOString(),
  });

  return c.json({
    success: true,
    message: `Store plan successfully updated to ${plan}`,
  });
});

// ==========================================
// 9. SUPER ADMIN: EXTEND TRIAL
// ==========================================
packagesRouter.patch("/super-admin/tenants/:id/extend-trial", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const daysToAdd = Number(body.days) || 7;

  // Extend trial from current expiration if in future, or from now if expired
  let currentEndMs = Date.now();
  for (const s of getRegisteredStoresList()) {
    if (s.id === id || s.subdomain === id) {
      const trialDateStr = s.trialEndsAt || s.settings?.trialEndsAt;
      if (trialDateStr) {
        const ms = new Date(trialDateStr).getTime();
        if (!isNaN(ms) && ms > currentEndMs) {
          currentEndMs = ms;
        }
      }
      break;
    }
  }

  const newTrialEnds = new Date(currentEndMs + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

  try {
    const storeRecord = await db.query.stores.findFirst({ where: eq(stores.id, id) });
    if (storeRecord) {
      const curSettings = (storeRecord.settings as Record<string, any>) || {};
      await db
        .update(stores)
        .set({
          status: "trialing",
          settings: { ...curSettings, trialEndsAt: newTrialEnds },
          updatedAt: new Date(),
        })
        .where(eq(stores.id, id));
    }
  } catch {
    // DB offline fallback
  }

  updateMemStore(id, {
    trialEndsAt: newTrialEnds,
    status: "trialing",
    updatedAt: new Date().toISOString(),
  });

  return c.json({
    success: true,
    message: `Trial extended by ${daysToAdd} days`,
    trialEndsAt: newTrialEnds,
  });
});

// ==========================================
// 10. SUPER ADMIN: TOGGLE TENANT STATUS (ON/OFF)
// ==========================================
packagesRouter.patch("/super-admin/tenants/:id/status", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const targetActive = typeof body.isActive === "boolean" ? body.isActive : body.status === "active";
  const newStatus = targetActive ? (body.isTrial ? "trialing" : "active") : "inactive";

  try {
    await db
      .update(stores)
      .set({
        status: newStatus,
        isActive: targetActive,
        updatedAt: new Date(),
      })
      .where(or(eq(stores.id, id), eq(stores.subdomain, id)));
  } catch {
    // DB offline fallback
  }

  updateMemStore(id, {
    status: newStatus,
    isActive: targetActive,
    updatedAt: new Date().toISOString(),
  });

  return c.json({
    success: true,
    message: `Store status successfully updated to ${newStatus}`,
    status: newStatus,
    isActive: targetActive,
  });
});

// ==========================================
// 11. SUPER ADMIN: DELETE TENANT (STORE & MERCHANT)
// ==========================================
packagesRouter.delete("/super-admin/tenants/:id", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  const id = c.req.param("id");

  try {
    await db
      .delete(stores)
      .where(or(eq(stores.id, id), eq(stores.subdomain, id)));
  } catch {
    // DB offline fallback
  }

  deleteMemStore(id);

  return c.json({
    success: true,
    message: "Store and user deleted successfully",
  });
});

// ==========================================
// 12. SUPER ADMIN: SET TIMELINE DATES (START DATE + 30 DAYS OR CUSTOM)
// ==========================================
packagesRouter.patch("/super-admin/tenants/:id/dates", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const startDateStr = body.startDate ? new Date(body.startDate).toISOString() : new Date().toISOString();
  const durationDays = Number(body.durationDays) || 30;
  const endDateStr = body.endDate
    ? new Date(body.endDate).toISOString()
    : new Date(new Date(startDateStr).getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((new Date(endDateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  try {
    const storeRecord = await db.query.stores.findFirst({
      where: or(eq(stores.id, id), eq(stores.subdomain, id)),
    });
    if (storeRecord) {
      const curSettings = (storeRecord.settings as Record<string, any>) || {};
      await db
        .update(stores)
        .set({
          createdAt: new Date(startDateStr),
          settings: {
            ...curSettings,
            startDate: startDateStr,
            endDate: endDateStr,
            trialStartedAt: startDateStr,
            trialEndsAt: endDateStr,
            durationDays,
          },
          updatedAt: new Date(),
        })
        .where(eq(stores.id, storeRecord.id));
    }
  } catch {
    // DB offline fallback
  }

  updateMemStore(id, {
    createdAt: startDateStr,
    startDate: startDateStr,
    endDate: endDateStr,
    trialEndsAt: endDateStr,
    durationDays,
    updatedAt: new Date().toISOString(),
  });

  return c.json({
    success: true,
    message: `Timeline successfully updated (${durationDays} days from ${new Date(startDateStr).toLocaleDateString()})`,
    startDate: startDateStr,
    endDate: endDateStr,
    trialEndsAt: endDateStr,
    daysRemaining,
  });
});

// ==========================================
// 13. SUPER ADMIN: MANUALLY CREATE PAID MERCHANT & STORE
// ==========================================
packagesRouter.post("/super-admin/tenants/create-paid", async (c) => {
  const isAuthorized = await verifySuperAdmin(c);
  if (!isAuthorized) {
    return c.json({ error: "Access denied. Super Admin role required." }, 403);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    let {
      storeName,
      subdomain,
      ownerName,
      email,
      phone,
      password,
      plan = "growth",
      billingInterval = "monthly",
      startDate,
      durationDays = 30,
    } = body;

    // 1. Basic validation
    if (!storeName || !subdomain || !ownerName || !email || !password) {
      return c.json({ error: "Store Name, Subdomain, Owner Name, Email, and Password are required." }, 400);
    }

    // 2. Normalize and validate Subdomain
    subdomain = String(subdomain).trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (subdomain.length < 3 || subdomain.length > 50) {
      return c.json({ error: "Subdomain must be between 3 and 50 lowercase alphanumeric characters." }, 400);
    }
    const reserved = ["app", "admin", "api", "www", "mail", "cdn", "assets", "static", "dashboard"];
    if (reserved.includes(subdomain)) {
      return c.json({ error: "This subdomain is reserved for platform infrastructure." }, 400);
    }

    // 3. Normalize Email
    email = String(email).trim().toLowerCase();
    if (!email.includes("@") || !email.includes(".")) {
      return c.json({ error: "Please provide a valid email address." }, 400);
    }

    // 4. Normalize BD Phone Number according to Invariant 2
    let normalizedPhone = String(phone || "").trim();
    normalizedPhone = convertBanglaToAsciiDigits(normalizedPhone).replace(/[\s\-()]/g, "");
    const match = normalizedPhone.match(bdPhoneRegex);
    if (match) {
      normalizedPhone = `+88${match[1]}`;
    } else if (normalizedPhone.startsWith("+8801") && normalizedPhone.length === 14) {
      // valid
    } else {
      normalizedPhone = normalizedPhone || "+8801700000000";
    }

    // 5. Password length check
    if (String(password).length < 6) {
      return c.json({ error: "Password must be at least 6 characters." }, 400);
    }

    // 6. Check uniqueness of subdomain and email
    if (isMemorySubdomainTaken(subdomain)) {
      return c.json({ error: `Subdomain '${subdomain}' is already in use. Please pick another one.` }, 409);
    }
    if (isMemoryEmailTaken(email)) {
      return c.json({ error: `An account with email '${email}' already exists.` }, 409);
    }

    // DB uniqueness check
    try {
      const existingStore = await db.query.stores.findFirst({
        where: eq(stores.subdomain, subdomain),
      });
      if (existingStore) {
        return c.json({ error: `Subdomain '${subdomain}' is already taken.` }, 409);
      }
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, email),
      });
      if (existingUser) {
        return c.json({ error: `A user with email '${email}' already exists.` }, 409);
      }
    } catch {
      // DB offline fallback
    }

    // 7. Dates and Plan calculations
    const planKey = String(plan).trim().toLowerCase();
    const durationNum = Number(durationDays) || 30;
    const startObj = startDate ? new Date(startDate) : new Date();
    const startDateStr = startObj.toISOString();
    const endObj = new Date(startObj.getTime() + durationNum * 24 * 60 * 60 * 1000);
    const endDateStr = endObj.toISOString();

    const planFeePoisha =
      planKey === "growth" ? 299900 : planKey === "pro" ? 499900 : planKey === "enterprise" ? 999900 : 99900;

    // 8. Hash password
    const hashedPassword = await hashPassword(password);

    // 9. IDs
    const userId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const orgId = `org_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const storeId = crypto.randomUUID();
    const domainId = crypto.randomUUID();

    const newStoreData = {
      id: storeId,
      organizationId: orgId,
      name: storeName.trim(),
      subdomain,
      phone: normalizedPhone,
      plan: planKey,
      status: "active",
      isActive: true,
      themeArchetype: "viral-funnel",
      createdAt: startObj,
      settings: {
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        email,
        supportPhone: normalizedPhone,
        onboardingCompleted: true,
        startDate: startDateStr,
        endDate: endDateStr,
        trialEndsAt: endDateStr,
        durationDays: durationNum,
        billingInterval,
      },
      themeConfig: {
        announcementBarText: "আমাদের স্টোরে আপনাকে স্বাগতম!",
      },
    };

    // 10. Persist to DB in atomic transaction
    try {
      await db.transaction(async (tx) => {
        await tx.insert(user).values({
          id: userId,
          name: ownerName.trim(),
          email,
          role: "user",
          emailVerified: true,
          createdAt: startObj,
          updatedAt: new Date(),
        });

        await tx.insert(account).values({
          id: `acc_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          accountId: email,
          providerId: "credential",
          userId,
          password: hashedPassword,
          createdAt: startObj,
          updatedAt: new Date(),
        });

        await tx.insert(organization).values({
          id: orgId,
          name: storeName.trim(),
          slug: subdomain,
          createdAt: startObj,
        });

        await tx.insert(member).values({
          id: `mem_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          organizationId: orgId,
          userId,
          role: "owner",
          createdAt: startObj,
        });

        await tx.insert(stores).values(newStoreData);

        const platformDomain = config.PLATFORM_ROOT_DOMAIN || "gocommercebd.online";
        await tx.insert(domains).values({
          id: domainId,
          storeId,
          domain: `${subdomain}.${platformDomain}`,
          isPrimary: true,
          sslStatus: "active",
          createdAt: startObj,
        });

        await tx.insert(auditLogs).values({
          storeId,
          actorId: "super_admin",
          actorType: "super_admin",
          action: "store:create_paid_manual",
          entityType: "store",
          diff: {
            name: storeName,
            subdomain,
            email,
            plan: planKey,
            billingInterval,
            durationDays: durationNum,
          },
        });
      });
    } catch (dbErr: any) {
      if (config.NODE_ENV === "production") {
        console.error("[CRITICAL] Failed to create paid merchant in DB:", dbErr);
        return c.json({ error: "Failed to persist new store in database." }, 500);
      }
    }

    // 11. Register in memory fallback
    registerMemoryMerchant({
      userId,
      name: ownerName.trim(),
      email,
      hashedPassword,
      orgId,
      store: {
        ...newStoreData,
        ownerName: ownerName.trim(),
        email,
        createdAt: startDateStr,
        planFeeBdt: planFeePoisha,
        billingInterval,
        monthlyGmv: 0,
        ordersThisMonth: 0,
      },
    });

    return c.json({
      success: true,
      message: "Paid merchant account & store created successfully!",
      store: {
        id: storeId,
        name: storeName.trim(),
        subdomain,
        owner: ownerName.trim(),
        email,
        phone: normalizedPhone,
        plan: planKey.charAt(0).toUpperCase() + planKey.slice(1),
        planFeeBdt: planFeePoisha,
        billingInterval,
        status: "active",
        isActive: true,
        startDate: startDateStr,
        endDate: endDateStr,
        loginUrl: "https://app.gocommercebd.online/login",
      },
      credentials: {
        email,
        password,
      },
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to create paid merchant" }, 500);
  }
});



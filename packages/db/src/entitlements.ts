import { db } from "./client.js";
import { plans } from "./schema.js";
import { eq } from "drizzle-orm";

/**
 * Plan Entitlements — cumulative resolution (T-1)
 *
 * Features are declared as DELTAS over an inheritance chain, then resolved into
 * flat arrays at load time. `can()` therefore stays a plain array lookup and no
 * downstream caller changes.
 *
 * Invariant #6: never compare plan names in business logic. Always ask
 * `can(store, feature)` / `limit(store, resource)`.
 */

export interface PlanLimits {
  products: number;
  /** Canonical page budget (landing pages + shop pages). */
  pages: number;
  /** @deprecated alias of `pages`, retained for one release during migration. */
  landingPages: number;
  staff: number;
  imagesPerProduct: number;
  storageMb: number;
  /** Abuse guard on template switching. */
  templateSwitchesPerMonth: number;
  [key: string]: number | undefined;
}

export interface PlanEntitlements {
  limits: PlanLimits;
  features: string[];
}

/**
 * Plan inheritance chain. A plan inherits every feature of its parent.
 * `pilot` and `package_1` are roots.
 */
export const PLAN_CHAIN: Record<string, string | null> = {
  pilot: null,
  package_1: null,
  package_2: "package_1",
  package_3: "package_2",
  package_4: "package_3",
};

/**
 * Features ADDED by each plan over its parent. Never restate inherited features.
 */
export const PLAN_FEATURE_DELTAS: Record<string, string[]> = {
  pilot: [
    "landing",
    "guest_cod",
    "incomplete_orders",
    "pixel",
    "courier:steadfast",
    "template_library:landing",
  ],
  package_1: [
    "landing",
    "guest_cod",
    "incomplete_orders",
    "pixel",
    "courier:steadfast",
    "template_library:landing",
  ],
  package_2: ["multi_landing", "custom_domain", "coupons", "template_variants"],
  package_3: [
    "shop",
    "customer_accounts",
    "courier:pathao",
    "fraud_rules",
    "template_library:shop",
    "reviews:ugc",
  ],
  package_4: ["shop_pro", "all_couriers", "advanced_reports", "meta_capi"],
};

/**
 * Per-plan limits (absolute, not deltas — limits do not accumulate, they replace).
 */
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  pilot: {
    products: 50,
    pages: 1,
    landingPages: 1,
    staff: 1,
    imagesPerProduct: 6,
    storageMb: 500,
    templateSwitchesPerMonth: 5,
  },
  package_1: {
    products: 50,
    pages: 1,
    landingPages: 1,
    staff: 1,
    imagesPerProduct: 6,
    storageMb: 500,
    templateSwitchesPerMonth: 5,
  },
  package_2: {
    products: 150,
    pages: 10,
    landingPages: 10,
    staff: 2,
    imagesPerProduct: 6,
    storageMb: 1500,
    templateSwitchesPerMonth: 20,
  },
  package_3: {
    products: 500,
    pages: 20,
    landingPages: 20,
    staff: 3,
    imagesPerProduct: 6,
    storageMb: 3000,
    templateSwitchesPerMonth: 20,
  },
  package_4: {
    products: 2000,
    pages: 50,
    landingPages: 50,
    staff: 10,
    imagesPerProduct: 8,
    storageMb: 10000,
    templateSwitchesPerMonth: 100,
  },
};

/**
 * Walks the inheritance chain and unions the deltas into a flat feature array.
 */
export function resolveFeatures(plan: string): string[] {
  const out = new Set<string>();
  for (let p: string | null = plan; p; p = PLAN_CHAIN[p] ?? null) {
    for (const f of PLAN_FEATURE_DELTAS[p] ?? []) out.add(f);
  }
  return [...out];
}

export function resolveLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.pilot;
}

export function resolvePlanEntitlements(plan: string): PlanEntitlements {
  return { limits: resolveLimits(plan), features: resolveFeatures(plan) };
}

/**
 * Static resolved entitlements per plan. Used as the fallback when the `plans`
 * table is unreachable, and as the seed payload so DB and code agree.
 */
export const DEFAULT_PLAN_ENTITLEMENTS: Record<string, PlanEntitlements> = Object.fromEntries(
  Object.keys(PLAN_CHAIN).map((plan) => [plan, resolvePlanEntitlements(plan)])
);

/**
 * Normalises a stored entitlements row against the resolved chain.
 *
 * A stale `plans.entitlements` row must never be able to *remove* an inherited
 * feature — otherwise a DB row silently bypasses T-1. Stored features are
 * therefore unioned with the resolved set; stored limits win (so an operator can
 * grant a custom quota) but missing keys fall back to the resolved defaults.
 */
export function normalizeEntitlements(
  plan: string,
  stored: Partial<PlanEntitlements> | null | undefined
): PlanEntitlements {
  const resolved = resolvePlanEntitlements(plan);
  if (!stored) return resolved;

  const features = new Set(resolved.features);
  for (const f of stored.features ?? []) features.add(f);

  return {
    limits: { ...resolved.limits, ...(stored.limits ?? {}) } as PlanLimits,
    features: [...features],
  };
}

const entitlementsCache = new Map<string, { entitlements: PlanEntitlements; expiresAt: number }>();

/** Exposed for tests — clears the 5 minute entitlements cache. */
export function clearEntitlementsCache(): void {
  entitlementsCache.clear();
}

export async function getStoreEntitlements(store: {
  id?: string;
  plan?: string;
}): Promise<PlanEntitlements> {
  const planKey = store.plan || "pilot";
  const now = Date.now();
  const cached = entitlementsCache.get(planKey);
  if (cached && cached.expiresAt > now) return cached.entitlements;

  let stored: Partial<PlanEntitlements> | null = null;
  try {
    const planRecord = await db.query.plans.findFirst({ where: eq(plans.id, planKey) });
    if (planRecord && planRecord.entitlements) {
      stored = planRecord.entitlements as unknown as Partial<PlanEntitlements>;
    }
  } catch {
    // Database offline (dev/test) — fall through to the static resolved set.
  }

  const entitlements = normalizeEntitlements(planKey, stored);
  entitlementsCache.set(planKey, { entitlements, expiresAt: now + 300_000 });
  return entitlements;
}

export async function can(
  store: { id?: string; plan?: string },
  feature: string
): Promise<boolean> {
  const entitlements = await getStoreEntitlements(store);
  if (!entitlements.features) return false;
  return (
    entitlements.features.includes(feature) ||
    entitlements.features.includes("all") ||
    entitlements.features.includes("*")
  );
}

export async function limit(
  store: { id?: string; plan?: string },
  resource: keyof PlanLimits | string
): Promise<number> {
  const entitlements = await getStoreEntitlements(store);
  const direct = entitlements.limits[resource as string];
  if (typeof direct === "number") return direct;
  // Migration alias: `pages` supersedes `landingPages`.
  if (resource === "pages") return entitlements.limits.landingPages ?? 0;
  if (resource === "landingPages") return entitlements.limits.pages ?? 0;
  return 0;
}

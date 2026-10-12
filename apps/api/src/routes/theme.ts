import { Hono } from "hono";
import { z } from "zod";
import {
  stores,
  storeThemes,
  storeThemeRevisions,
  auditLogs,
  withTenant,
  can,
  limit,
  getStoreEntitlements,
  signPreviewToken,
  PREVIEW_TOKEN_TTL_MINUTES,
} from "@gocom/db";
import { eq, and, desc } from "drizzle-orm";
import {
  getAllManifests,
  getManifest,
  resolveTheme,
  buildDraftFromManifest,
  validateDraft,
  listAddableSections,
} from "@gocom/themes";
import { requirePermission, requireSession, requireStoreMembership, type StaffRole } from "../middleware/auth.js";
import { getTemplateSourceStatus, sanitizeTemplateOverrides } from "@gocom/themes/html";
import { purgeStoreCache } from "../services/cloudflare-cache.js";
import { describeTemplateSource } from "./templates.js";
import { config } from "../config.js";

type MerchantEnv = {
  Variables: {
    user: any;
    session: any;
    store: typeof stores.$inferSelect;
    memberRole: StaffRole;
  };
};

export const themeRouter = new Hono<MerchantEnv>();

// Apply session and store membership authentication to all theme routes
themeRouter.use("*", requireSession);
themeRouter.use("*", requireStoreMembership);

const saveDraftSchema = z.object({
  templateId: z.string().optional(),
  templateVersion: z.number().int().positive().optional(),
  presetId: z.string().optional(),
  tokenOverrides: z.record(z.string(), z.unknown()).optional(),
  globalSections: z.record(z.string(), z.unknown()).optional(),
  draft: z.record(z.string(), z.unknown()),
});

const rollbackSchema = z.object({
  version: z.number().int().positive(),
});

/**
 * GET /v1/templates — Lists templates with package gating status for the store.
 * Allows preview of all templates, but locks templates exceeding store package.
 */
themeRouter.get("/templates", async (c) => {
  const store = c.get("store");
  const all = getAllManifests();

  const [hasShopLib, hasShop, hasMultiLanding, hasLandingLib, hasLanding] = await Promise.all([
    can(store, "template_library:shop"),
    can(store, "shop"),
    can(store, "multi_landing"),
    can(store, "template_library:landing"),
    can(store, "landing"),
  ]);

  const canUseShop = hasShopLib || hasShop;
  const canUseMulti = hasMultiLanding;
  const canUseLanding = hasLandingLib || hasLanding;

  const templatesWithGating = all.map((t) => {
    let isUnlocked = true;
    let requiredPlanLabel = "প্যাকেজ ১ (সিঙ্গেল ল্যান্ডিং)";

    if (t.tier === "shop") {
      isUnlocked = canUseShop;
      requiredPlanLabel = "প্যাকেজ ৩ (ফুল ই-কমার্স শপ)";
    } else if (t.requiresFeature && t.requiresFeature.includes("multi_landing")) {
      isUnlocked = canUseMulti;
      requiredPlanLabel = "প্যাকেজ ২ (মাল্টি-পেজ ফানেল)";
    } else if (t.requiresFeature && t.requiresFeature.includes("landing")) {
      isUnlocked = canUseLanding;
      requiredPlanLabel = "প্যাকেজ ১ (সিঙ্গেল ল্যান্ডিং)";
    }

    return {
      ...t,
      ...describeTemplateSource(t.id),
      isUnlocked,
      requiredPlanLabel,
      canPreview: true,
    };
  });

  return c.json({
    success: true,
    templates: templatesWithGating,
  });
});

/**
 * GET /v1/theme — Returns current store theme, active draft, published snapshot, and manifest.
 *
 * Also returns everything the dashboard's theme editor needs to render itself
 * without guessing: the merchant's entitlement features (which gate the addable
 * section catalogue), the addable catalogue itself, and the remaining monthly
 * template-switch allowance.
 */
themeRouter.get("/theme", async (c) => {
  const store = c.get("store");

  const storeTheme = await withTenant(store.id, async (tx) => {
    return tx.query.storeThemes.findFirst({
      where: eq(storeThemes.storeId, store.id),
    });
  });

  const templateId = storeTheme?.templateId || store.themeArchetype || "viral-funnel";
  const manifest = getManifest(templateId);
  const entitlements = await getStoreEntitlements(store);

  // A store that has never opened the editor has an empty `draft` jsonb. Seed it
  // from the manifest so the editor always starts on a complete, renderable tree.
  const storedDraft = storeTheme?.draft as any;
  const hasDraft = Boolean(storedDraft && (storedDraft.pages || Array.isArray(storedDraft.sections)));
  const draft = hasDraft ? storedDraft : buildDraftFromManifest(manifest);

  return c.json({
    success: true,
    theme: storeTheme
      ? { ...storeTheme, draft }
      : {
          storeId: store.id,
          templateId,
          templateVersion: manifest.version,
          presetId: (store.themeConfig as any)?.presetId || manifest.defaultPreset,
          tokenOverrides: {},
          globalSections: {},
          draft,
          published: null,
          draftRevision: 0,
          publishedVersion: 0,
        },
    manifest,
    templateSource: describeTemplateSource(manifest.id),
    features: entitlements.features,
    addableSections: listAddableSections(entitlements.features),
    templateSwitches: await describeTemplateSwitches(store, storeTheme),
    store: {
      name: store.name,
      subdomain: store.subdomain,
      liveUrl: storeBaseUrl(store),
    },
  });
});

/** Current UTC month, the bucket the per-plan template-switch quota resets on. */
function currentSwitchPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * The public base URL of a merchant's storefront.
 *
 * Stores are served **path-based** (`https://gocommercebd.online/<subdomain>`)
 * because no wildcard `*.gocommercebd.online` DNS/TLS record exists — the
 * previous `${subdomain}.${STOREFRONT_ROOT_DOMAIN}` form produced a dead host,
 * which is why the dashboard's preview frame and "view store" link went nowhere.
 */
function storeBaseUrl(store: typeof stores.$inferSelect): string {
  const customDomain = (store as any).customDomain || (store.settings as any)?.customDomain;
  if (customDomain) return `https://${customDomain}`;

  if (config.NODE_ENV === "development") {
    return `http://localhost:4321/${store.subdomain}`;
  }
  return `https://${config.STOREFRONT_ROOT_DOMAIN}/${store.subdomain}`;
}

async function describeTemplateSwitches(
  store: typeof stores.$inferSelect,
  storeTheme?: { templateSwitchCount?: number | null; templateSwitchPeriod?: string | null } | null
) {
  const allowed = await limit(store, "templateSwitchesPerMonth");
  const period = currentSwitchPeriod();
  const used = storeTheme?.templateSwitchPeriod === period ? storeTheme?.templateSwitchCount ?? 0 : 0;
  return {
    period,
    used,
    allowed,
    remaining: allowed < 0 ? -1 : Math.max(0, allowed - used),
  };
}

/**
 * Turns a published snapshot back into an editable draft tree, so that
 * discarding edits or rolling back leaves the editor showing what is live.
 * Falls back to the template defaults when there is no usable snapshot.
 */
function snapshotToDraft(snapshot: any, templateId: string) {
  const manifest = getManifest(templateId);
  if (!snapshot?.pages && !Array.isArray(snapshot?.sections)) {
    return buildDraftFromManifest(manifest);
  }

  const sourcePages: Record<string, any> = snapshot.pages ?? {
    main: { shell: snapshot.shell, sections: snapshot.sections ?? [] },
  };

  const pages: Record<string, any> = {};
  for (const [key, page] of Object.entries<any>(sourcePages)) {
    const manifestPage = manifest.pages[key];
    pages[key] = {
      kind: manifestPage?.kind ?? "landing",
      title: manifestPage?.title ?? key,
      shell: page?.shell?.id ?? manifestPage?.shell ?? manifest.shell,
      sections: Array.isArray(page?.sections) ? page.sections : [],
    };
  }

  return {
    templateId: snapshot.templateId ?? templateId,
    templateVersion: snapshot.templateVersion ?? manifest.version,
    pages,
    ...(snapshot.html ? { html: snapshot.html } : {}),
  };
}

/** True when the template is served from its own markup rather than built from sections. */
function isHtmlTemplate(templateId: string): boolean {
  return getTemplateSourceStatus(templateId) === "ok";
}

/**
 * The merchant's text and image replacements for an HTML template, reduced to
 * the ones that still name a real slot of that template. Returns `undefined`
 * for section-engine templates, which have no such layer.
 */
function htmlLayerFor(templateId: string, draft: any): { pages: Record<string, any> } | undefined {
  if (!isHtmlTemplate(templateId)) return undefined;
  return { pages: sanitizeTemplateOverrides(templateId, draft?.html?.pages) };
}

/**
 * POST /v1/theme/draft — Autosaves or updates the theme draft tree with schema validation.
 */
themeRouter.post("/theme/draft", requirePermission("theme:manage"), async (c) => {
  const store = c.get("store");
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = saveDraftSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        type: "https://httpstatuses.com/400",
        title: "Invalid Theme Draft",
        status: 400,
        detail: "Draft validation failed against schema.",
        errors: parsed.error.format(),
      },
      400
    );
  }

  const { templateId, templateVersion, presetId, tokenOverrides, globalSections } = parsed.data;
  const draft: Record<string, any> = { ...parsed.data.draft };

  const existing = await withTenant(store.id, async (tx) => {
    return tx.query.storeThemes.findFirst({
      where: eq(storeThemes.storeId, store.id),
    });
  });

  const previousTemplateId = existing?.templateId || store.themeArchetype || "viral-funnel";
  const targetTemplateId = templateId || previousTemplateId;
  const manifest = getManifest(targetTemplateId);
  const entitlements = await getStoreEntitlements(store);

  // Every section the merchant kept must exist, validate, be entitled, respect
  // its per-page cap, and no template-pinned section may have been dropped.
  const errors = validateDraft(draft, { manifest, features: entitlements.features });
  if (errors.length > 0) {
    return c.json(
      {
        type: "https://httpstatuses.com/422",
        title: "Invalid Theme Draft",
        status: 422,
        detail: errors[0].message,
        errors,
      },
      422
    );
  }

  // Replacements are stored only for slots the chosen template actually has, so
  // edits made on one design never leak into another after a switch.
  const htmlLayer = htmlLayerFor(manifest.id, draft);
  if (htmlLayer) draft.html = htmlLayer;
  else delete draft.html;

  // Switching template is metered per plan (templateSwitchesPerMonth).
  const period = currentSwitchPeriod();
  const isSwitch = targetTemplateId !== previousTemplateId;

  if (isSwitch && !describeTemplateSource(manifest.id).isAvailable) {
    return c.json(
      {
        type: "https://httpstatuses.com/409",
        title: "Template Not Available Yet",
        status: 409,
        detail: "এই ডিজাইনটি এখনো ব্যবহারের জন্য প্রস্তুত নয়। অনুগ্রহ করে অন্য একটি ডিজাইন বেছে নিন।",
      },
      409
    );
  }
  let switchCount = existing?.templateSwitchPeriod === period ? existing?.templateSwitchCount ?? 0 : 0;

  if (isSwitch) {
    const allowed = await limit(store, "templateSwitchesPerMonth");
    if (allowed >= 0 && switchCount >= allowed) {
      return c.json(
        {
          type: "https://httpstatuses.com/429",
          title: "Template Switch Limit Reached",
          status: 429,
          detail: `আপনার প্যাকেজে প্রতি মাসে ${allowed} বার টেমপ্লেট পরিবর্তন করা যায়। পরবর্তী মাসে আবার চেষ্টা করুন অথবা প্যাকেজ আপগ্রেড করুন।`,
          allowed,
          used: switchCount,
        },
        429
      );
    }
    switchCount += 1;
  }

  const targetPresetId = presetId || existing?.presetId || manifest.defaultPreset;

  const updated = await withTenant(store.id, async (tx) => {
    const newRevision = (existing?.draftRevision || 0) + 1;

    const [row] = await tx
      .insert(storeThemes)
      .values({
        storeId: store.id,
        templateId: targetTemplateId,
        templateVersion: templateVersion || manifest.version || 1,
        presetId: targetPresetId,
        tokenOverrides: tokenOverrides || existing?.tokenOverrides || {},
        globalSections: globalSections || existing?.globalSections || {},
        draft,
        draftRevision: newRevision,
        templateSwitchCount: switchCount,
        templateSwitchPeriod: period,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [storeThemes.storeId],
        set: {
          templateId: targetTemplateId,
          ...(templateVersion ? { templateVersion } : {}),
          presetId: targetPresetId,
          ...(tokenOverrides ? { tokenOverrides } : {}),
          ...(globalSections ? { globalSections } : {}),
          draft,
          draftRevision: newRevision,
          templateSwitchCount: switchCount,
          templateSwitchPeriod: period,
          updatedAt: new Date(),
        },
      })
      .returning();

    await tx.insert(auditLogs).values({
      storeId: store.id,
      actorId: user.id,
      actorType: "user",
      action: "theme:save_draft",
      entityType: "store_themes",
      entityId: row.id,
      diff: { draftRevision: newRevision, templateId: targetTemplateId, templateSwitched: isSwitch },
    });

    return row;
  });

  return c.json({
    success: true,
    data: updated,
    templateSwitches: await describeTemplateSwitches(store, updated),
  });
});

/**
 * POST /v1/theme/preview-token — Mints a short-lived token that lets the
 * dashboard preview iframe render this store's UNPUBLISHED draft on the real
 * storefront. Without it the storefront only ever serves the published snapshot.
 */
themeRouter.post("/theme/preview-token", requirePermission("theme:manage"), async (c) => {
  const store = c.get("store");
  const token = signPreviewToken(store.id);
  const base = storeBaseUrl(store);

  return c.json({
    success: true,
    token,
    expiresInMinutes: PREVIEW_TOKEN_TTL_MINUTES,
    liveUrl: base,
    previewUrl: `${base}?preview=draft&t=${encodeURIComponent(token)}`,
  });
});

/**
 * POST /v1/theme/publish — Resolves draft into a published snapshot, increments version,
 * archives to store_theme_revisions, and purges storefront edge cache (Invariant #8).
 */
themeRouter.post("/theme/publish", requirePermission("theme:manage"), async (c) => {
  const store = c.get("store");
  const user = c.get("user");

  const storeTheme = await withTenant(store.id, async (tx) => {
    return tx.query.storeThemes.findFirst({
      where: eq(storeThemes.storeId, store.id),
    });
  });

  const templateId = storeTheme?.templateId || store.themeArchetype || "viral-funnel";
  const manifest = getManifest(templateId);
  const rawDraft = (storeTheme?.draft as any) || store.themeConfig || {};
  const hasDraft = Boolean(rawDraft && (rawDraft.pages || Array.isArray(rawDraft.sections)));
  const draft = hasDraft ? rawDraft : buildDraftFromManifest(manifest);
  const presetId = storeTheme?.presetId || (store.themeConfig as any)?.presetId || manifest.defaultPreset;
  const tokenOverrides = (storeTheme?.tokenOverrides as any) || {};
  const globalSections = (storeTheme?.globalSections as any) || {};
  const entitlements = await getStoreEntitlements(store);

  const errors = validateDraft(draft, { manifest, features: entitlements.features });
  if (errors.length > 0) {
    return c.json(
      {
        type: "https://httpstatuses.com/422",
        title: "Draft Cannot Be Published",
        status: 422,
        detail: errors[0].message,
        errors,
      },
      422
    );
  }

  // Resolve EVERY page the template defines. Shop-tier templates carry
  // main/product/collection/cart; publishing only `main` would leave their
  // product and collection pages on manifest defaults forever.
  const pageKeys = Object.keys(draft.pages ?? manifest.pages ?? { main: {} });
  const resolveInput = {
    templateId,
    templateVersion: storeTheme?.templateVersion || manifest.version || 1,
    presetId,
    tokenOverrides,
    globalSections,
    draft,
    features: entitlements.features,
  };

  const publishedPages: Record<string, { shell: any; sections: any[] }> = {};
  let mainResolved = resolveTheme(resolveInput, { page: pageKeys[0], isEditor: true });

  for (const pageKey of pageKeys) {
    const resolved = resolveTheme(resolveInput, { page: pageKey, isEditor: true });
    publishedPages[pageKey] = { shell: resolved.shell, sections: resolved.sections };
    if (pageKey === "main") mainResolved = resolved;
  }

  const nextPublishedVersion = (storeTheme?.publishedVersion || 0) + 1;
  const snapshot = {
    templateId: mainResolved.templateId,
    templateVersion: mainResolved.templateVersion,
    preset: mainResolved.preset,
    shell: mainResolved.shell,
    pages: publishedPages,
    // Kept for backward compatibility with readers that expect a flat array.
    sections: mainResolved.sections,
    // HTML templates are served from their own markup; this is what the merchant changed in it.
    ...(htmlLayerFor(manifest.id, draft) ? { renderMode: "html", html: htmlLayerFor(manifest.id, draft) } : {}),
    publishedAt: new Date().toISOString(),
  };

  await withTenant(store.id, async (tx) => {
    // 1. Update or insert store_themes published snapshot
    await tx
      .insert(storeThemes)
      .values({
        storeId: store.id,
        templateId,
        templateVersion: mainResolved.templateVersion,
        presetId,
        tokenOverrides,
        globalSections,
        draft,
        published: snapshot,
        publishedVersion: nextPublishedVersion,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [storeThemes.storeId],
        set: {
          published: snapshot,
          publishedVersion: nextPublishedVersion,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    // 2. Insert into store_theme_revisions (retention/rollback)
    await tx.insert(storeThemeRevisions).values({
      storeId: store.id,
      version: nextPublishedVersion,
      snapshot,
      createdBy: user.id,
      note: `Published version ${nextPublishedVersion}`,
    });

    // 3. Insert audit log
    await tx.insert(auditLogs).values({
      storeId: store.id,
      actorId: user.id,
      actorType: "user",
      action: "theme:publish",
      entityType: "store_themes",
      diff: { publishedVersion: nextPublishedVersion },
    });
  });

  // Invariant #8: Purge edge cache on publish
  await purgeStoreCache(store.id, ["theme", "home", "page:*"]);

  return c.json({
    success: true,
    publishedVersion: nextPublishedVersion,
    liveUrl: storeBaseUrl(store),
    snapshot,
  });
});

/**
 * POST /v1/theme/discard-draft — Throws away unpublished edits, restoring the
 * draft to whatever is currently live (or to the template defaults when the
 * store has never published).
 */
themeRouter.post("/theme/discard-draft", requirePermission("theme:manage"), async (c) => {
  const store = c.get("store");
  const user = c.get("user");

  const storeTheme = await withTenant(store.id, async (tx) => {
    return tx.query.storeThemes.findFirst({
      where: eq(storeThemes.storeId, store.id),
    });
  });

  const templateId = storeTheme?.templateId || store.themeArchetype || "viral-funnel";
  const draft = snapshotToDraft(storeTheme?.published, templateId);

  const updated = await withTenant(store.id, async (tx) => {
    const [row] = await tx
      .update(storeThemes)
      .set({ draft, draftRevision: (storeTheme?.draftRevision || 0) + 1, updatedAt: new Date() })
      .where(eq(storeThemes.storeId, store.id))
      .returning();

    await tx.insert(auditLogs).values({
      storeId: store.id,
      actorId: user.id,
      actorType: "user",
      action: "theme:discard_draft",
      entityType: "store_themes",
      diff: { restoredFromPublishedVersion: storeTheme?.publishedVersion ?? 0 },
    });

    return row;
  });

  return c.json({ success: true, data: updated ?? { draft } });
});

/**
 * GET /v1/theme/revisions — Lists recent revision history for one-click rollback.
 */
themeRouter.get("/theme/revisions", async (c) => {
  const store = c.get("store");

  const revisions = await withTenant(store.id, async (tx) => {
    return tx.query.storeThemeRevisions.findMany({
      where: eq(storeThemeRevisions.storeId, store.id),
      orderBy: [desc(storeThemeRevisions.version)],
      limit: 20,
    });
  });

  return c.json({
    success: true,
    revisions,
  });
});

/**
 * POST /v1/theme/rollback — Restores a previous snapshot revision by version number.
 */
themeRouter.post("/theme/rollback", requirePermission("theme:manage"), async (c) => {
  const store = c.get("store");
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = rollbackSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        type: "https://httpstatuses.com/400",
        title: "Invalid Rollback Request",
        status: 400,
        detail: "A positive integer 'version' is required.",
      },
      400
    );
  }

  const { version } = parsed.data;

  const targetRevision = await withTenant(store.id, async (tx) => {
    return tx.query.storeThemeRevisions.findFirst({
      where: and(eq(storeThemeRevisions.storeId, store.id), eq(storeThemeRevisions.version, version)),
    });
  });

  if (!targetRevision) {
    return c.json(
      {
        type: "https://httpstatuses.com/404",
        title: "Revision Not Found",
        status: 404,
        detail: `No theme revision found for version ${version}.`,
      },
      404
    );
  }

  const storeTheme = await withTenant(store.id, async (tx) => {
    return tx.query.storeThemes.findFirst({
      where: eq(storeThemes.storeId, store.id),
    });
  });

  const nextVersion = (storeTheme?.publishedVersion || 0) + 1;
  const restoredTemplateId =
    (targetRevision.snapshot as any)?.templateId ||
    storeTheme?.templateId ||
    store.themeArchetype ||
    "viral-funnel";
  // Rolling back is only coherent if the editor also shows what is now live.
  const restoredDraft = snapshotToDraft(targetRevision.snapshot, restoredTemplateId);

  await withTenant(store.id, async (tx) => {
    await tx
      .update(storeThemes)
      .set({
        templateId: restoredTemplateId,
        published: targetRevision.snapshot,
        publishedVersion: nextVersion,
        draft: restoredDraft,
        draftRevision: (storeTheme?.draftRevision || 0) + 1,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storeThemes.storeId, store.id));

    await tx.insert(storeThemeRevisions).values({
      storeId: store.id,
      version: nextVersion,
      snapshot: targetRevision.snapshot as any,
      createdBy: user.id,
      note: `Rollback to version ${version}`,
    });

    await tx.insert(auditLogs).values({
      storeId: store.id,
      actorId: user.id,
      actorType: "user",
      action: "theme:rollback",
      entityType: "store_themes",
      diff: { restoredFromVersion: version, newVersion: nextVersion },
    });
  });

  // Invariant #8: Purge cache on rollback
  await purgeStoreCache(store.id, ["theme", "home", "page:*"]);

  return c.json({
    success: true,
    restoredVersion: version,
    publishedVersion: nextVersion,
    snapshot: targetRevision.snapshot,
  });
});

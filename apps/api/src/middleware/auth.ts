import { createMiddleware } from "hono/factory";
import { auth } from "../auth.js";
import { db, stores, member, session, user } from "@gocom/db";
import { eq, and } from "drizzle-orm";
import { config } from "../config.js";

export type StaffRole = "owner" | "admin" | "manager" | "call_staff" | "packer";

export type Permission =
  | "billing:manage"          // owner
  | "staff:invite"            // owner, admin
  | "products:manage"         // owner, admin, manager
  | "orders:view"             // owner, admin, manager, call_staff, packer
  | "orders:update_status"    // owner, admin, manager, call_staff
  | "advance:verify"          // owner, admin, manager
  | "courier:book"            // owner, admin, manager, packer
  | "courier:configure"       // owner, admin — Task 2.5 (V-15)
  | "customers:export"        // owner, admin
  | "reports:view"            // owner, admin, manager
  | "theme:manage"            // owner, admin, manager
  | "pages:manage"            // owner, admin, manager
  | "media:manage";           // owner, admin, manager

const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: [
    "billing:manage",
    "staff:invite",
    "products:manage",
    "orders:view",
    "orders:update_status",
    "advance:verify",
    "courier:book",
    "courier:configure",
    "customers:export",
    "reports:view",
    "theme:manage",
    "pages:manage",
    "media:manage",
  ],
  admin: [
    "staff:invite",
    "products:manage",
    "orders:view",
    "orders:update_status",
    "advance:verify",
    "courier:book",
    "courier:configure",
    "customers:export",
    "reports:view",
    "theme:manage",
    "pages:manage",
    "media:manage",
  ],
  manager: [
    "products:manage",
    "orders:view",
    "orders:update_status",
    "advance:verify",
    "courier:book",
    "reports:view",
    "theme:manage",
    "pages:manage",
    "media:manage",
  ],
  call_staff: [
    "orders:view",
    "orders:update_status",
  ],
  packer: [
    "orders:view",
    "courier:book",
  ],
};

/**
 * Reads the session token from `Authorization: Bearer` or the session cookie.
 * Better Auth cookies are `<token>.<signature>` and, on HTTPS, carry the
 * `__Secure-` prefix; both forms resolve to the bare token stored in `session`.
 */
export function extractSessionToken(authHeader?: string | null, cookieHeader?: string | null): string | null {
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  for (const part of (cookieHeader ?? "").split(";")) {
    const cookie = part.trim();
    for (const name of ["__Secure-better-auth.session_token=", "better-auth.session_token="]) {
      if (!cookie.startsWith(name)) continue;
      let raw = cookie.slice(name.length);
      try {
        raw = decodeURIComponent(raw);
      } catch {
        // keep the raw value
      }
      const tokenPart = raw.split(".")[0];
      if (tokenPart) return tokenPart;
    }
  }
  return null;
}

export function hasPermission(role: string, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role as StaffRole];
  return allowed ? allowed.includes(permission) : false;
}

/**
 * 1. Require Authenticated Session (Better Auth)
 * Resolves session from Better Auth cookie / Bearer token.
 * In test mode only, supports mock session via 'x-test-session' header.
 */
export const requireSession = createMiddleware<{
  Variables: {
    user: any;
    session: any;
  };
}>(async (c, next) => {
  // Test mode mock session bypass
  if (config.NODE_ENV === "test" && c.req.header("x-test-session")) {
    try {
      const mock = JSON.parse(c.req.header("x-test-session")!);
      c.set("user", mock.user);
      c.set("session", mock.session);
      return await next();
    } catch {
      // invalid JSON, fall through to standard auth
    }
  }

  try {
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (sessionData?.session && sessionData?.user) {
      c.set("user", sessionData.user);
      c.set("session", sessionData.session);
      return await next();
    }
  } catch (err) {
    // If DB is offline, fall through to memory session validation
  }

  // Fallback: sessions minted by the platform's own login routes (routes/auth.ts)
  // are stored with a raw token rather than a Better Auth signed one, so
  // `getSession` above does not recognise them. Look the token up directly.
  const token = extractSessionToken(c.req.header("Authorization"), c.req.header("Cookie"));

  if (token) {
    try {
      // Two plain lookups rather than a relational `with`: this path must not
      // depend on relation metadata being present to authenticate a request.
      const dbSession = await db.query.session.findFirst({
        where: eq(session.token, token),
      });

      if (dbSession && new Date(dbSession.expiresAt) > new Date()) {
        const sessionUser = await db.query.user.findFirst({
          where: eq(user.id, dbSession.userId),
        });

        if (sessionUser) {
          c.set("user", sessionUser);
          c.set("session", {
            id: dbSession.id,
            token: dbSession.token,
            userId: dbSession.userId,
            activeOrganizationId: dbSession.activeOrganizationId,
            expiresAt: dbSession.expiresAt,
          });
          return await next();
        }
      }
    } catch (err) {
      // In test/dev the DB may be offline; fall through to the memory session.
      if (config.NODE_ENV === "production") {
        console.error("[auth] session lookup failed:", (err as Error)?.message);
      }
    }

    if (config.NODE_ENV !== "production") {
      const { getMemSession } = await import("../routes/auth.js");
      const mem = getMemSession(token);
      if (mem && mem.user) {
        c.set("user", mem.user);
        c.set("session", {
          id: mem.id || "session_mem",
          token: mem.token || token,
          userId: mem.userId || mem.user.id,
          activeOrganizationId: mem.activeOrganizationId || "org_grihogadget",
          expiresAt: mem.expiresAt,
        });
        return await next();
      }
    }
  }

  return c.json(
    {
      type: "https://httpstatuses.com/401",
      title: "Unauthorized",
      status: 401,
      detail: "Authentication session is missing or expired. Please sign in.",
    },
    401
  );

  await next();
});

/**
 * 2. Require Membership in the Active Store's Organization
 * Invariant #4: Merchant API (/v1/...) resolves store ID strictly from the authenticated session (activeOrganizationId).
 */
export const requireStoreMembership = createMiddleware<{
  Variables: {
    user: any;
    session: any;
    store: typeof stores.$inferSelect;
    memberRole: StaffRole;
  };
}>(async (c, next) => {
  const user = c.get("user");
  const session = c.get("session");

  if (!user || !session) {
    return c.json(
      {
        type: "https://httpstatuses.com/401",
        title: "Unauthorized",
        status: 401,
        detail: "Authentication session is missing or expired.",
      },
      401
    );
  }

  // Super admins bypass store membership checks
  if (user.role === "super_admin") {
    let store = null;
    try {
      store = await db.query.stores.findFirst({
        where: eq(stores.isActive, true),
      });
    } catch {
      // Database may be offline in dev/test environment
    }

    if (!store && (config.NODE_ENV === "development" || config.NODE_ENV === "test")) {
      store = {
        id: "00000000-0000-0000-0000-000000000001",
        organizationId: "org_grihogadget",
        name: "গৃহগ্যাজেট (Grihogadget)",
        subdomain: "grihogadget",
        phone: "+8801711223344",
        plan: "package_4",
        isActive: true,
      } as any;
    }

    if (store) {
      c.set("store", store);
      c.set("memberRole", "owner");
      return await next();
    }
  }

  // Active Organization resolution
  const activeOrgId = session.activeOrganizationId;

  // In test mode, allow direct store resolution if mocked
  if (config.NODE_ENV === "test" && session._testStore) {
    const s = session._testStore;
    if (s.deletedAt) {
      return c.json(
        {
          type: "https://httpstatuses.com/404",
          title: "Store Not Found",
          status: 404,
          detail: "Store not found for organization.",
        },
        404
      );
    }
    if (s.status === "suspended" || s.isActive === false) {
      return c.json(
        {
          type: "https://httpstatuses.com/403",
          title: "Store Suspended",
          status: 403,
          detail: "This store has been suspended. Please contact platform support.",
        },
        403
      );
    }
    c.set("store", s);
    c.set("memberRole", (session._testRole || "owner") as StaffRole);
    return await next();
  }

  if (!activeOrgId) {
    // Check if user has at least one organization membership
    const firstMembership = await db.query.member.findFirst({
      where: eq(member.userId, user.id),
    });

    if (!firstMembership) {
      return c.json(
        {
          type: "https://httpstatuses.com/403",
          title: "Forbidden",
          status: 403,
          detail: "You do not belong to any store organization.",
        },
        403
      );
    }

    const store = await db.query.stores.findFirst({
      where: eq(stores.organizationId, firstMembership.organizationId),
    });

    if (!store || store.deletedAt) {
      return c.json(
        {
          type: "https://httpstatuses.com/404",
          title: "Store Not Found",
          status: 404,
          detail: "Store not found for organization.",
        },
        404
      );
    }

    if (store.status === "suspended" || !store.isActive) {
      return c.json(
        {
          type: "https://httpstatuses.com/403",
          title: "Store Suspended",
          status: 403,
          detail: "This store has been suspended. Please contact platform support.",
        },
        403
      );
    }

    c.set("store", store);
    c.set("memberRole", firstMembership.role as StaffRole);
    return await next();
  }

  // Validate user membership in this organization
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, activeOrgId),
      eq(member.userId, user.id)
    ),
  });

  if (!membership) {
    return c.json(
      {
        type: "https://httpstatuses.com/403",
        title: "Forbidden",
        status: 403,
        detail: "You do not have access to this store organization.",
      },
      403
    );
  }

  const store = await db.query.stores.findFirst({
    where: eq(stores.organizationId, activeOrgId),
  });

  if (!store || store.deletedAt) {
    return c.json(
      {
        type: "https://httpstatuses.com/404",
        title: "Store Not Found",
        status: 404,
        detail: "Store not found for organization.",
      },
      404
    );
  }

  if (store.status === "suspended" || !store.isActive) {
    return c.json(
      {
        type: "https://httpstatuses.com/403",
        title: "Store Suspended",
        status: 403,
        detail: "This store has been suspended. Please contact platform support.",
      },
      403
    );
  }

  c.set("store", store);
  c.set("memberRole", membership.role as StaffRole);

  await next();
});

/**
 * 3. Require Specific RBAC Permission
 */
export function requirePermission(permission: Permission) {
  return createMiddleware<{
    Variables: {
      memberRole: StaffRole;
    };
  }>(async (c, next) => {
    const role = c.get("memberRole");

    if (!role || !hasPermission(role, permission)) {
      return c.json(
        {
          type: "https://httpstatuses.com/403",
          title: "Forbidden",
          status: 403,
          detail: `Your role (${role || "none"}) does not grant permission: '${permission}'`,
        },
        403
      );
    }

    await next();
  });
}

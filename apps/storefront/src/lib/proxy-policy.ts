/**
 * Storefront → API proxy policy (audit V-04). Pure functions, unit-testable.
 */
const SHOPPER_ALLOWED_EXACT = new Set(["/api/orders", "/api/incomplete-orders"]);
const SHOPPER_ALLOWED_PREFIX = ["/api/storefront/", "/api/app/", "/api/templates/"];
const PLATFORM_ALLOWED_PREFIX = ["/api/auth/", "/api/storefront/", "/api/app/", "/api/templates/"];

export function platformHosts(env: Record<string, string | undefined> = process.env): Set<string> {
  const root = (env.PLATFORM_ROOT_DOMAIN || "gocommercebd.online").toLowerCase();
  const hosts = new Set([root, `www.${root}`, `app.${root}`, `admin.${root}`]);
  if (env.NODE_ENV !== "production") {
    hosts.add("localhost");
    hosts.add("127.0.0.1");
  }
  return hosts;
}

export function isPathAllowed(pathname: string, isPlatformHost: boolean): boolean {
  if (SHOPPER_ALLOWED_EXACT.has(pathname)) return true;
  const prefixes = isPlatformHost ? PLATFORM_ALLOWED_PREFIX : SHOPPER_ALLOWED_PREFIX;
  return prefixes.some((p) => pathname.startsWith(p));
}

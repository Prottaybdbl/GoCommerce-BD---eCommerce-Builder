import type { APIRoute } from "astro";

/**
 * Storefront → API reverse proxy (audit V-04 / C9).
 *
 * - Upstream is API_INTERNAL_URL (docker: http://api:3000), never "localhost" inside the container.
 * - The ORIGINAL Host header is preserved so the API can resolve the tenant from Host (Invariant #4).
 * - Path allow-list, per host class:
 *     shopper hosts  (<store>.root, custom domains): public storefront endpoints only
 *     platform hosts (root, app., admin., www.):     + /api/auth/* for the login / create-store pages
 *   /api/admin, /api/super-admin and /v1 are never proxied.
 * - On shopper hosts cookies are neither forwarded nor returned (Invariant #8).
 * - Errors never leak upstream URLs or causes.
 */

import { isPathAllowed, platformHosts } from "../../lib/proxy-policy.js";


const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const ALL: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const originalHost = (request.headers.get("host") || url.host).toLowerCase();
  const hostname = originalHost.split(":")[0];
  const isPlatformHost = platformHosts().has(hostname);

  if (!isPathAllowed(url.pathname, isPlatformHost)) {
    return json(404, { error: "Not found" });
  }

  const upstreamBase =
    process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.API_PORT || "3000"}`;
  const targetUrl = new URL(url.pathname + url.search, upstreamBase);

  const forwardHeaders = new Headers(request.headers);
  // Preserve the tenant-bearing Host; also expose it explicitly.
  forwardHeaders.set("Host", originalHost);
  forwardHeaders.set("X-Forwarded-Host", originalHost);
  forwardHeaders.delete("expect");
  forwardHeaders.delete("connection");
  forwardHeaders.delete("keep-alive");
  forwardHeaders.delete("transfer-encoding");
  forwardHeaders.delete("x-tenant-id");

  // Trust Cloudflare's connecting IP over any client-supplied X-Forwarded-For
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "127.0.0.1";
  forwardHeaders.set("X-Forwarded-For", clientIp);

  if (!isPlatformHost) {
    forwardHeaders.delete("cookie");
    forwardHeaders.delete("authorization");
  }

  try {
    const apiRes = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? await request.arrayBuffer()
          : undefined,
      redirect: "manual",
    });

    const responseHeaders = new Headers(apiRes.headers);
    if (!isPlatformHost) {
      responseHeaders.delete("set-cookie");
    }
    // Never advertise credentialed cross-origin access from the proxy
    responseHeaders.delete("access-control-allow-credentials");

    return new Response(apiRes.body, {
      status: apiRes.status,
      statusText: apiRes.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Storefront API Proxy Error:", (err as Error)?.message);
    return json(502, { error: "API proxy unavailable" });
  }
};

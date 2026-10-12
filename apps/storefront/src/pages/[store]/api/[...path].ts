import type { APIRoute } from "astro";

/**
 * Storefront API for path-based stores: `/<subdomain>/api/...`.
 *
 * The API resolves the tenant strictly from `Host` (Invariant #4). A store
 * served at `https://<root>/<subdomain>` shares the platform's host, so a plain
 * `/api/orders` call carried no tenant at all and every checkout answered
 * "Store not found". Here the store is identified by the URL path — the tenant
 * identity of a path-based store — and the request is forwarded upstream under
 * that store's canonical host, which the API resolves as it always has.
 *
 * Only the public shopper endpoints are reachable, and neither credentials nor
 * cookies cross this proxy in either direction (Invariant #8).
 */

import { isPathAllowed } from "../../../lib/proxy-policy.js";
import { findPathStore } from "../../../lib/path-store.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const ALL: APIRoute = async ({ request, params }) => {
  const url = new URL(request.url);
  const apiPath = `/api/${params.path ?? ""}`;

  if (!isPathAllowed(apiPath, false)) {
    return json(404, { error: "Not found" });
  }

  const store = await findPathStore(params.store);
  if (!store) {
    return json(404, {
      type: "https://httpstatuses.com/404",
      title: "Store Not Found",
      status: 404,
      detail: "Store not found for this address.",
    });
  }

  const root = (
    process.env.STOREFRONT_ROOT_DOMAIN ||
    process.env.PLATFORM_ROOT_DOMAIN ||
    "gocommercebd.online"
  ).toLowerCase();
  const tenantHost = `${store.subdomain}.${root}`;

  const upstreamBase =
    process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.API_PORT || "3000"}`;
  const targetUrl = new URL(apiPath + url.search, upstreamBase);

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set("Host", tenantHost);
  forwardHeaders.set("X-Forwarded-Host", tenantHost);
  for (const name of [
    "expect", "connection", "keep-alive", "transfer-encoding", "content-length",
    "x-tenant-id", "cookie", "authorization",
  ]) {
    forwardHeaders.delete(name);
  }

  // Trust Cloudflare's connecting IP over any client-supplied X-Forwarded-For
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "127.0.0.1";
  forwardHeaders.set("X-Forwarded-For", clientIp);

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
    responseHeaders.delete("set-cookie");
    responseHeaders.delete("access-control-allow-credentials");
    // The body is re-streamed, so upstream framing headers no longer describe it.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new Response(apiRes.body, {
      status: apiRes.status,
      statusText: apiRes.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Path-store API Proxy Error:", (err as Error)?.message);
    return json(502, { error: "API proxy unavailable" });
  }
};

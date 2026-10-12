import { defineMiddleware } from "astro:middleware";
import { previewFrameAncestors } from "./lib/frame-ancestors.ts";

const BASE_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:; img-src 'self' data: https:; connect-src 'self' https:;";

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  // Invariant #8: Storefront HTML must never set cookies (Set-Cookie header is strictly forbidden)
  response.headers.delete("Set-Cookie");
  response.headers.delete("set-cookie");

  // Security Headers for Storefront (Task 5.3)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // A page rendered from a gallery template's own markup (lib/html-template.ts)
  // brings a sandboxing policy that isolates the template's third-party scripts
  // from this origin. It must be kept, not replaced by BASE_CSP — which would
  // also block every stylesheet and script the template is made of.
  const ownCsp = response.headers.get("Content-Security-Policy");
  if (ownCsp && /(^|;)\s*sandbox\b/.test(ownCsp)) {
    response.headers.delete("X-Frame-Options");
    return response;
  }

  const isDraftPreview = context.url.searchParams.get("preview") === "draft";

  if (isDraftPreview) {
    // `X-Frame-Options` has no working cross-origin allowlist in modern
    // browsers, so it is dropped in favour of CSP `frame-ancestors`.
    response.headers.delete("X-Frame-Options");
    response.headers.set(
      "Content-Security-Policy",
      `${BASE_CSP} frame-ancestors ${previewFrameAncestors(process.env)};`
    );
  } else {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("Content-Security-Policy", BASE_CSP);
  }

  return response;
});

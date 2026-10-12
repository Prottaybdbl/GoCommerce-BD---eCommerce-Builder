/**
 * Origins allowed to embed a theme draft preview in an iframe.
 *
 * The merchant dashboard lives on `app.<root>` while storefronts are served
 * from `<root>`, so a blanket `X-Frame-Options: SAMEORIGIN` left the theme
 * editor's preview pane blank. Only the `?preview=draft` request relaxes
 * framing, and only for the dashboard — a third-party page still cannot frame
 * it, because `frame-ancestors` names the allowed embedders explicitly.
 */
export function previewFrameAncestors(env: Record<string, string | undefined> = process.env): string {
  const root = (env.PLATFORM_ROOT_DOMAIN || "gocommercebd.online").toLowerCase();
  const origins = ["'self'", `https://${root}`, `https://www.${root}`, `https://app.${root}`];
  if (env.NODE_ENV !== "production") {
    origins.push("http://localhost:5173", "http://localhost:4321", "http://127.0.0.1:5173");
  }
  return origins.join(" ");
}

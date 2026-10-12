/**
 * `@gocom/themes/html` — node-only. Serves gallery templates from their
 * original markup. Kept out of the package's main entry so the dashboard's
 * browser bundle never pulls in `node:fs`.
 */
export * from "./registry.js";
export * from "./engine.js";
export { TEMPLATE_BRIDGE_SOURCE } from "./client-script.js";

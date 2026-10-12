#!/usr/bin/env node
/**
 * Env drift check (audit V-03).
 * 1. Every key declared in apps/api/src/config.ts must be documented in .env.example.
 * 2. Every security-critical key must be passed to the api service in docker-compose.prod.yml.
 * Exits non-zero on drift so CI blocks the merge.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const config = readFileSync(resolve(root, "apps/api/src/config.ts"), "utf8");
const example = readFileSync(resolve(root, ".env.example"), "utf8");
const compose = readFileSync(resolve(root, "deploy/coolify/docker-compose.prod.yml"), "utf8");

const start = config.indexOf("z.object({");
const schemaBlock = config.slice(start, config.indexOf("\n});", start));
const keys = [...schemaBlock.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):\s*z\./gm)].map((m) => m[1]);

const REQUIRED_IN_COMPOSE = [
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "PLATFORM_ROOT_DOMAIN",
  "STOREFRONT_ROOT_DOMAIN",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_DOMAIN",
  "ENCRYPTION_MASTER_KEY",
  "TURNSTILE_SECRET_KEY",
];
// SESSION_SECRET is a legacy alias of BETTER_AUTH_SECRET
REQUIRED_IN_COMPOSE.push("BETTER_AUTH_SECRET");

const problems = [];
for (const k of keys) {
  if (k === "SESSION_SECRET") continue;
  if (!new RegExp(`^${k}=?`, "m").test(example)) problems.push(`.env.example is missing ${k}`);
}
for (const k of REQUIRED_IN_COMPOSE) {
  if (!new RegExp(`^\\s+${k}:`, "m").test(compose)) problems.push(`docker-compose.prod.yml does not set ${k}`);
}

if (problems.length) {
  console.error("Env drift detected:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log(`Env check OK (${keys.length} config keys, ${REQUIRED_IN_COMPOSE.length} compose keys).`);

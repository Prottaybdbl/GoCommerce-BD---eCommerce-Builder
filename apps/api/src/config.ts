import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const isTestEnv = 
  process.env.NODE_ENV === "test" || 
  process.execArgv.includes("--test") || 
  process.argv.some((arg) => arg.includes("test")) ||
  process.env.npm_lifecycle_event === "test";

if (isTestEnv) {
  process.env.NODE_ENV = "test";
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default(isTestEnv ? "test" : "development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().url().default("postgres://gocom_user:gocom_local_secret@127.0.0.1:5432/gocom_db"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  PLATFORM_ROOT_DOMAIN: z.string().default("gocommercebd.online"),
  STOREFRONT_ROOT_DOMAIN: z.string().default("gocommercebd.online"),
  
  // Security & Auth
  SESSION_SECRET: z.string().min(16).default("dev_secret_must_be_changed_in_prod_12345"),
  BETTER_AUTH_URL: z.string().optional(),
  ENCRYPTION_MASTER_KEY: z.string().default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  DEV_TENANT_FALLBACK: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SUPERADMIN_EMAIL: z.string().optional(),

  // Couriers (Base URLs; credentials are per-store encrypted in DB)
  STEADFAST_BASE_URL: z.string().default("https://portal.packzy.com/api/v1"),
  PATHAO_BASE_URL: z.string().default("https://api-hermes.pathao.com"),

  // Cloudflare R2 Storage (Invariant #3: Zero Server Image Processing)
  R2_ACCOUNT_ID: z.string().default("dummy_r2_account_id"),
  R2_ACCESS_KEY_ID: z.string().default("dummy_r2_access_key"),
  R2_SECRET_ACCESS_KEY: z.string().default("dummy_r2_secret_key"),
  R2_BUCKET_NAME: z.string().default("gocom-media"),
  R2_PUBLIC_DOMAIN: z.string().default("media.yourbrand.com"),

  // Cloudflare Edge Cache Purge (Cache Purge by Tag)
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),

  // Bot protection (Cloudflare Turnstile)
  TURNSTILE_SECRET_KEY: z.string().optional(),
});

// Canonical secret name is BETTER_AUTH_SECRET (matches .env.example & compose).
// SESSION_SECRET is kept as a legacy alias.
const rawEnv: NodeJS.ProcessEnv = { ...process.env };
if (!rawEnv.SESSION_SECRET && rawEnv.BETTER_AUTH_SECRET) {
  rawEnv.SESSION_SECRET = rawEnv.BETTER_AUTH_SECRET;
}

const parsedEnv = envSchema.safeParse(rawEnv);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  throw new Error("Invalid environment configuration");
}

export const config = parsedEnv.data;

/**
 * Fail closed in production: refuse to boot with missing, default or weak secrets.
 */
const KNOWN_INSECURE_VALUES = new Set<string>([
  "dev_secret_must_be_changed_in_prod_12345",
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "dummy_r2_account_id",
  "dummy_r2_access_key",
  "dummy_r2_secret_key",
  "1x0000000000000000000000000000000AA",
  "gocom_local_secret",
]);

export function assertProductionConfig(
  env: NodeJS.ProcessEnv,
  cfg: typeof config
): string[] {
  const problems: string[] = [];
  const need = (name: string, value: string | undefined, minLen = 1) => {
    if (!value || value.length < minLen) {
      problems.push(`${name} is required in production${minLen > 1 ? ` (min ${minLen} chars)` : ""}`);
    } else if (KNOWN_INSECURE_VALUES.has(value) || [...KNOWN_INSECURE_VALUES].some((k) => value.includes(k))) {
      problems.push(`${name} uses a known insecure/default value`);
    }
  };

  need("BETTER_AUTH_SECRET (or SESSION_SECRET)", env.SESSION_SECRET, 32);
  need("ENCRYPTION_MASTER_KEY", env.ENCRYPTION_MASTER_KEY, 64);
  if (env.ENCRYPTION_MASTER_KEY && !/^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_MASTER_KEY)) {
    problems.push("ENCRYPTION_MASTER_KEY must be 64 hex characters (32 bytes)");
  }
  need("DATABASE_URL", env.DATABASE_URL);
  need("R2_ACCOUNT_ID", env.R2_ACCOUNT_ID);
  need("R2_ACCESS_KEY_ID", env.R2_ACCESS_KEY_ID);
  need("R2_SECRET_ACCESS_KEY", env.R2_SECRET_ACCESS_KEY);
  need("TURNSTILE_SECRET_KEY", env.TURNSTILE_SECRET_KEY, 20);
  if (!env.BETTER_AUTH_URL) problems.push("BETTER_AUTH_URL is required in production");
  if (cfg.DEV_TENANT_FALLBACK === "1") problems.push("DEV_TENANT_FALLBACK must not be enabled in production");
  return problems;
}

if (config.NODE_ENV === "production") {
  const problems = assertProductionConfig(rawEnv, config);
  if (problems.length > 0) {
    console.error("❌ Refusing to start in production:\n - " + problems.join("\n - "));
    throw new Error("Insecure production configuration");
  }
}

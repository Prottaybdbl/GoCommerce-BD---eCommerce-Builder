import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testFiles = [
  "api.test.ts",
  "checkout-concurrency-courier.test.ts",
  "media-and-cache.test.ts",
  "tenant-isolation-rbac.test.ts",
  "notifications-and-realtime.test.ts",
  "auth-store-onboarding.test.ts",
  "language-switcher.test.ts",
  "favicon-assets.test.ts",
  "packages.test.ts",
  "template-system.test.ts",
  "theme-editor.test.ts",
  "storefront-theme-render.test.ts",
  "phase1-security-remediation.test.ts",
  "phase2-security-remediation.test.ts",
  "phase3-security-remediation.test.ts",
  "phase4-security-remediation.test.ts",
  "phase5-security-remediation.test.ts",
  "template-preview-all.test.ts",
  "html-template-store.test.ts",
];

let hasFailure = false;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  const result = spawnSync(
    process.execPath,
    ["--test", "--import", "tsx", filePath],
    {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "test" },
    }
  );

  if (result.status !== 0) {
    hasFailure = true;
    break;
  }
}

process.exit(hasFailure ? 1 : 0);

import { Hono } from "hono";
import { config } from "../config.js";

export const appVersionRouter = new Hono();

export interface AppVersionInfo {
  versionName: string;
  versionCode: number;
  minSupportedVersion: number;
  downloadUrl: string;
  apkSha256?: string;
  releaseNotes: string;
  forceUpdate: boolean;
}

const EMPTY_STRING_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const SHA256_REGEX = /^[a-f0-9]{64}$/i;

export function getAppVersionInfo(forcedEnv?: string): AppVersionInfo {
  const env = forcedEnv || config.NODE_ENV || process.env.NODE_ENV;
  const configuredHash = process.env.APK_SHA256?.trim();

  let validHash: string | undefined = undefined;
  if (configuredHash && SHA256_REGEX.test(configuredHash)) {
    validHash = configuredHash.toLowerCase();
  }

  // In production, reject dummy empty-string sha256 to ensure APK integrity verification
  if (env === "production") {
    if (!validHash || validHash === EMPTY_STRING_SHA256) {
      console.warn("[SECURITY WARNING] Production APK SHA-256 is missing or dummy hash. Verification disabled.");
      validHash = undefined;
    }
  } else {
    validHash = validHash || EMPTY_STRING_SHA256;
  }

  return {
    versionName: "1.0.0",
    versionCode: 100,
    minSupportedVersion: 100,
    downloadUrl: `https://app.${config.PLATFORM_ROOT_DOMAIN}/download/gocom-merchant-v1.0.0.apk`,
    apkSha256: validHash,
    releaseNotes: "প্রাথমিক রিলিজ: উচ্চ-অগ্রাধিকার অর্ডার নোটিফিকেশন (Cha-Ching!), ১-ক্লিক কাস্টমার কল এবং সরাসরি পার্সেল বুকিং।",
    forceUpdate: false,
  };
}

// Check latest Android app version for in-app self-updater
appVersionRouter.get("/version", (c) => {
  const versionInfo = getAppVersionInfo();
  return c.json({
    success: true,
    data: versionInfo,
  });
});

// Direct APK download redirect or release info
appVersionRouter.get("/download", (c) => {
  const versionInfo = getAppVersionInfo();
  return c.redirect(versionInfo.downloadUrl, 302);
});

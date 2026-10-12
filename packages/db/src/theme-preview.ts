/**
 * Theme draft preview tokens.
 *
 * The dashboard's preview pane renders the real storefront against an
 * UNPUBLISHED draft. That must not be reachable by guessing a query string, so
 * the API mints a short-lived HMAC token and the storefront verifies it with
 * the same platform secret before it will serve a draft.
 *
 * Lives in `@gocom/db` because it is the only package both `apps/api` and the
 * Astro storefront already import, and because it is strictly server-side.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface PreviewTokenPayload {
  /** Store the token authorises. */
  storeId: string;
  /** Expiry, epoch milliseconds. */
  expiresAt: number;
}

/** Minutes a freshly minted preview token stays valid. */
export const PREVIEW_TOKEN_TTL_MINUTES = 30;

function previewSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
      return "dev-unsafe-preview-secret-key-change-in-prod-32ch";
    }
    throw new Error("BETTER_AUTH_SECRET (or SESSION_SECRET) is required to sign theme preview tokens.");
  }
  return secret;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadPart: string): string {
  return createHmac("sha256", previewSecret()).update(payloadPart).digest("base64url");
}

/** Mints `<payload>.<signature>` authorising draft preview of one store. */
export function signPreviewToken(
  storeId: string,
  ttlMinutes = PREVIEW_TOKEN_TTL_MINUTES
): string {
  const payload: PreviewTokenPayload = {
    storeId,
    expiresAt: Date.now() + ttlMinutes * 60_000,
  };
  const payloadPart = b64url(JSON.stringify(payload));
  return `${payloadPart}.${sign(payloadPart)}`;
}

/**
 * Returns the payload when the token is well-formed, correctly signed and
 * unexpired; `null` in every other case. Never throws on malformed input —
 * callers treat `null` as "serve the published version instead".
 */
export function verifyPreviewToken(token?: string | null): PreviewTokenPayload | null {
  if (!token || typeof token !== "string") return null;

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const payloadPart = token.slice(0, dot);
  const signaturePart = token.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(payloadPart);
  } catch {
    return null;
  }

  const a = Buffer.from(signaturePart);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: PreviewTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!payload?.storeId || typeof payload.expiresAt !== "number") return null;
  if (payload.expiresAt < Date.now()) return null;

  return payload;
}

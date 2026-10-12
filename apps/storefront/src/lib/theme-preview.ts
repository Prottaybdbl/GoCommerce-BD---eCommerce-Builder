/**
 * Theme draft preview tokens for the Astro storefront.
 *
 * The dashboard renders the live storefront inside an iframe using an
 * unpublished draft. To prevent leaking unreleased designs, the API mints
 * a short-lived HMAC token signed with the platform auth secret.
 *
 * This module verifies the token and returns the store ID it authorizes.
 */
import { verifyPreviewToken as dbVerifyPreviewToken } from "@gocom/db";

export function verifyPreviewToken(token?: string | null): string | null {
  if (!token) return null;
  const payload = dbVerifyPreviewToken(token);
  return payload?.storeId ?? null;
}

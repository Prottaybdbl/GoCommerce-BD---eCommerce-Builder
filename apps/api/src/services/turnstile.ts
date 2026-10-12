import { config } from "../config.js";

/**
 * Validates Cloudflare Turnstile token on public endpoints.
 * Protects against checkout bot spam and fake COD order attacks.
 */
export async function verifyTurnstileToken(
  token?: string,
  remoteIp?: string
): Promise<boolean> {
  // 1. Production Mode: Strict verification, fail closed
  if (config.NODE_ENV === "production") {
    if (!token) {
      return false;
    }

    // Reject bypass tokens in production
    if (
      token === "test-turnstile-token" ||
      token === "XXXX.DUMMY.TOKEN.XXXX" ||
      token.startsWith("bypass_")
    ) {
      return false;
    }

    const secretKey = config.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
    // Disallow default Cloudflare testing dummy secret in production
    if (!secretKey || secretKey === "1x0000000000000000000000000000000AA") {
      console.error("[CRITICAL SECURITY] Production TURNSTILE_SECRET_KEY is missing or set to dummy key. Failing closed.");
      return false;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("secret", secretKey);
      formData.append("response", token);
      if (remoteIp) {
        formData.append("remoteip", remoteIp);
      }

      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) return false;

      const outcome = (await res.json()) as { success: boolean };
      return Boolean(outcome.success);
    } catch (err) {
      console.warn("Turnstile verification network error:", err);
      // Strictly fail closed in production
      return false;
    }
  }

  // 2. Test Mode: Explicit rejection for bot/invalid tokens, accept test tokens
  if (config.NODE_ENV === "test") {
    if (token === "invalid-turnstile-token" || token === "bot-token" || token === "rejected-token") {
      return false;
    }
    return true;
  }

  // 3. Development Mode: Dev convenience if no token provided
  if (!token) {
    return true;
  }

  if (token === "test-turnstile-token" || token === "XXXX.DUMMY.TOKEN.XXXX") {
    return true;
  }

  const secretKey =
    config.TURNSTILE_SECRET_KEY ||
    process.env.TURNSTILE_SECRET_KEY ||
    "1x0000000000000000000000000000000AA";

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return false;

    const outcome = (await res.json()) as { success: boolean };
    return Boolean(outcome.success);
  } catch (err) {
    console.warn("Turnstile dev verification error:", err);
    return true; // fail open in development only
  }
}

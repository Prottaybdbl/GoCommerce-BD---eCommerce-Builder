import crypto from "node:crypto";
import { config } from "../config.js";

export interface PiiFreeOrderNotification {
  orderId: string;
  orderNumber: string;
  totalAmountBdt: string | number;
  itemCount: number;
  currency?: string;
  targetUrl?: string;
}

export interface FcmSendResult {
  success: boolean;
  sentCount: number;
  failedTokens: string[];
  mocked?: boolean;
  error?: string;
}

/**
 * Generates an OAuth2 access token for Google FCM HTTP v1
 * using standard Node.js crypto and JWT bearer grant (Zero external library bloat).
 */
class GoogleOAuth2TokenProvider {
  private cachedToken: string | null = null;
  private expiresAt: number = 0;

  constructor(
    private clientEmail: string,
    private privateKey: string
  ) {}

  async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    // Reuse cached token if valid for at least 5 more minutes
    if (this.cachedToken && this.expiresAt > now + 300) {
      return this.cachedToken;
    }

    const header = { alg: "RS256", typ: "JWT" };
    const claim = {
      iss: this.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const encodedClaim = Buffer.from(JSON.stringify(claim)).toString("base64url");
    const signInput = `${encodedHeader}.${encodedClaim}`;

    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signInput);
    const signature = signer.sign(this.privateKey, "base64url");
    const assertion = `${signInput}.${signature}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google OAuth2 token exchange failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.cachedToken = data.access_token;
    this.expiresAt = now + data.expires_in;
    return this.cachedToken;
  }
}

export class FcmService {
  private tokenProvider: GoogleOAuth2TokenProvider | null = null;
  private projectId: string | null = null;

  constructor() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      this.projectId = projectId;
      this.tokenProvider = new GoogleOAuth2TokenProvider(clientEmail, privateKey);
    }
  }

  /**
   * Builds an RFC/privacy-compliant PII-free notification payload.
   * STRICT INVARIANT: Must NEVER include customer name, phone number, or street address!
   */
  buildPiiFreeMessage(token: string, payload: PiiFreeOrderNotification) {
    const title = `💰 নতুন অর্ডার এসেছে! (#${payload.orderNumber})`;
    const body = `${payload.itemCount}টি আইটেম — মোট ৳${payload.totalAmountBdt}`;
    const targetUrl =
      payload.targetUrl || `https://app.yourbrand.com/#/orders?highlight=${payload.orderId}`;

    return {
      message: {
        token,
        notification: {
          title,
          body,
        },
        data: {
          orderId: String(payload.orderId),
          orderNumber: String(payload.orderNumber),
          totalAmountBdt: String(payload.totalAmountBdt),
          itemCount: String(payload.itemCount),
          target_url: targetUrl,
        },
        android: {
          priority: "HIGH",
          notification: {
            channel_id: "new_orders_v1",
            sound: "chaching",
            default_sound: false,
            default_vibrate_timings: true,
            notification_priority: "PRIORITY_MAX",
          },
        },
      },
    };
  }

  /**
   * Dispatches push notifications to active merchant device tokens.
   */
  async sendOrderNotification(
    tokens: string[],
    payload: PiiFreeOrderNotification
  ): Promise<FcmSendResult> {
    if (!tokens || tokens.length === 0) {
      return { success: true, sentCount: 0, failedTokens: [] };
    }

    // In local dev/test or when credentials are not configured, perform safe simulated dispatch
    if (!this.tokenProvider || !this.projectId) {
      console.log(
        `[FCM] (Mocked) Sent PII-free high-priority alert for Order #${payload.orderNumber} (৳${payload.totalAmountBdt}) to ${tokens.length} device(s)`
      );
      return {
        success: true,
        sentCount: tokens.length,
        failedTokens: [],
        mocked: true,
      };
    }

    const failedTokens: string[] = [];
    let sentCount = 0;

    try {
      const accessToken = await this.tokenProvider.getAccessToken();
      const endpoint = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;

      for (const token of tokens) {
        try {
          const body = this.buildPiiFreeMessage(token, payload);
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });

          if (res.ok) {
            sentCount++;
          } else {
            const errData = await res.json().catch(() => ({}));
            console.error(`[FCM] Failed to send to token ${token.slice(0, 10)}...:`, errData);
            failedTokens.push(token);
          }
        } catch (err: any) {
          console.error(`[FCM] Error dispatching to token:`, err.message);
          failedTokens.push(token);
        }
      }

      return {
        success: sentCount > 0 || failedTokens.length === 0,
        sentCount,
        failedTokens,
      };
    } catch (err: any) {
      console.error(`[FCM] OAuth2 / Dispatch error:`, err.message);
      return {
        success: false,
        sentCount: 0,
        failedTokens: tokens,
        error: err.message,
      };
    }
  }
}

export const fcmService = new FcmService();

import crypto from "node:crypto";
import { db } from "./client.js";
import { storeCredentials } from "./schema.js";
import { eq, and } from "drizzle-orm";

/**
 * Normalizes an arbitrary secret into a 32-byte (256-bit) buffer.
 */
function getKeyBuffer(masterKey: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(masterKey)) {
    return Buffer.from(masterKey, "hex");
  }
  return crypto.createHash("sha256").update(masterKey).digest();
}

export interface EncryptedPayload {
  encryptedData: string; // Base64
  iv: string; // Base64
  tag: string; // Base64
}

/**
 * Encrypts an object or string using AES-256-GCM.
 * Invariant #10: Per-store credentials encrypted at rest with AES-256-GCM.
 */
export function encryptData(data: unknown, masterKey: string): EncryptedPayload {
  const key = getKeyBuffer(masterKey);
  const iv = crypto.randomBytes(12); // 96-bit IV standard for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plaintext = typeof data === "string" ? data : JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encryptedData: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 */
export function decryptData<T = any>(payload: EncryptedPayload, masterKey: string): T {
  const key = getKeyBuffer(masterKey);
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const encrypted = Buffer.from(payload.encryptedData, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const text = decrypted.toString("utf8");

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

const memoryCredentialsStore = new Map<string, EncryptedPayload>();

/**
 * Retrieves and decrypts per-store credentials from store_credentials table.
 */
export async function getStoreCredentials<T = any>(
  storeId: string,
  service: string,
  masterKey: string
): Promise<T | null> {
  const memKey = `${storeId}:${service}`;

  try {
    const record = await db.query.storeCredentials.findFirst({
      where: and(
        eq(storeCredentials.storeId, storeId),
        eq(storeCredentials.service, service)
      ),
    });

    if (record) {
      return decryptData<T>(
        {
          encryptedData: record.encryptedData,
          iv: record.iv,
          tag: record.tag,
        },
        masterKey
      );
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      throw err;
    }
  }

  if (process.env.NODE_ENV === "test") {
    const inMem = memoryCredentialsStore.get(memKey);
    if (inMem) {
      try {
        return decryptData<T>(inMem, masterKey);
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Encrypts and persists per-store credentials in store_credentials table.
 */
export async function saveStoreCredentials(
  storeId: string,
  service: string,
  credentials: unknown,
  masterKey: string
): Promise<void> {
  const encrypted = encryptData(credentials, masterKey);
  const memKey = `${storeId}:${service}`;

  if (process.env.NODE_ENV === "test") {
    memoryCredentialsStore.set(memKey, encrypted);
  }

  try {
    const existing = await db.query.storeCredentials.findFirst({
      where: and(
        eq(storeCredentials.storeId, storeId),
        eq(storeCredentials.service, service)
      ),
    });

    if (existing) {
      await db
        .update(storeCredentials)
        .set({
          encryptedData: encrypted.encryptedData,
          iv: encrypted.iv,
          tag: encrypted.tag,
          updatedAt: new Date(),
        })
        .where(eq(storeCredentials.id, existing.id));
    } else {
      await db.insert(storeCredentials).values({
        storeId,
        service,
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        tag: encrypted.tag,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      throw err;
    }
    // Database offline; saved in memoryCredentialsStore for test/mock execution
  }
}

/**
 * Memory-hard password hashing using Node crypto.scrypt.
 * Uses 16-byte random salt and 64-byte key length.
 * Format: `${saltHex}:${derivedKeyHex}`
 */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Timing-safe password verification against a stored scrypt hash.
 * Prevents timing side-channel attacks by executing timingSafeEqual.
 */
export function verifyPassword(password: string, combinedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!combinedHash || typeof combinedHash !== "string") {
      return resolve(false);
    }
    const parts = combinedHash.split(":");
    if (parts.length !== 2) {
      return resolve(false);
    }
    const [salt, expectedKeyHex] = parts;
    const expectedKey = Buffer.from(expectedKeyHex, "hex");
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return resolve(false);
      if (expectedKey.length !== derivedKey.length) return resolve(false);
      try {
        resolve(crypto.timingSafeEqual(expectedKey, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}


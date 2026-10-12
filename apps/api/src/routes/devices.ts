import { Hono } from "hono";
import { z } from "zod";
import { db, deviceTokens, withTenant } from "@gocom/db";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "../middleware/auth.js";

type MerchantEnv = {
  Variables: {
    user: any;
    session: any;
    store: any;
    memberRole: any;
  };
};

const registerDeviceSchema = z.object({
  token: z.string().min(10, "FCM Device Token is required"),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  deviceName: z.string().max(120).optional(),
});

export const devicesRouter = new Hono<MerchantEnv>();

// Register or refresh merchant device token for FCM push alerts
devicesRouter.post("/register", requirePermission("orders:view"), async (c) => {
  const store = c.get("store");
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = registerDeviceSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        type: "https://errors.gocom.bd/invalid-device-payload",
        title: "Invalid Device Payload",
        status: 400,
        errors: parsed.error.flatten().fieldErrors,
      },
      400
    );
  }

  const { token, platform, deviceName } = parsed.data;

  const result = await withTenant(store.id, async (tx) => {
    // Check if token already registered for this store
    const existing = await tx.query.deviceTokens.findFirst({
      where: and(
        eq(deviceTokens.storeId, store.id),
        eq(deviceTokens.token, token)
      ),
    });

    if (existing) {
      const [updated] = await tx
        .update(deviceTokens)
        .set({
          userId: user.id,
          platform,
          deviceName: deviceName || existing.deviceName,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(deviceTokens.id, existing.id),
            eq(deviceTokens.storeId, store.id)
          )
        )
        .returning();
      return updated;
    }

    const [inserted] = await tx
      .insert(deviceTokens)
      .values({
        storeId: store.id,
        userId: user.id,
        token,
        platform,
        deviceName: deviceName || "Android Merchant Device",
        isActive: true,
      })
      .returning();
    return inserted;
  });

  return c.json({ success: true, data: result }, 201);
});

// Deactivate device token (e.g. On user logout)
devicesRouter.delete("/unregister", requirePermission("orders:view"), async (c) => {
  const store = c.get("store");
  const body = await c.req.json().catch(() => ({}));
  const token = body.token;

  if (!token) {
    return c.json({ error: "Token is required" }, 400);
  }

  await withTenant(store.id, async (tx) => {
    await tx
      .update(deviceTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(deviceTokens.storeId, store.id),
          eq(deviceTokens.token, token)
        )
      );
  });

  return c.json({ success: true, message: "Device unregistered" });
});

// List registered devices for merchant store
devicesRouter.get("/", requirePermission("orders:view"), async (c) => {
  const store = c.get("store");
  const devices = await withTenant(store.id, async (tx) => {
    return tx.query.deviceTokens.findMany({
      where: and(
        eq(deviceTokens.storeId, store.id),
        eq(deviceTokens.isActive, true)
      ),
    });
  });

  return c.json({
    success: true,
    data: devices.map((d) => ({
      id: d.id,
      platform: d.platform,
      deviceName: d.deviceName,
      createdAt: d.createdAt,
      lastActive: d.updatedAt,
    })),
  });
});

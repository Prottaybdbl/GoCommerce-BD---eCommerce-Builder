import { Hono } from "hono";
import { captureIncompleteOrderSchema } from "@gocom/contracts";
import { incompleteOrders, stores, withTenant } from "@gocom/db";
import { and, eq } from "drizzle-orm";
import { verifyTurnstileToken } from "../services/turnstile.js";

export const incompleteRouter = new Hono<{
  Variables: {
    store?: typeof stores.$inferSelect;
  };
}>();

// Capture or update abandoned checkout lead
incompleteRouter.post("/incomplete-orders", async (c) => {
  const store = c.get("store");
  if (!store) {
    return c.json({ error: "Store not found" }, 404);
  }

  const body = await c.req.json();

  // Task 3.2: Turnstile bot protection for abandoned checkout leads
  const clientIp =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
    "127.0.0.1";
  const isHuman = await verifyTurnstileToken(body.turnstileToken, clientIp);
  if (!isHuman) {
    return c.json(
      {
        type: "https://httpstatuses.com/403",
        title: "Bot Verification Failed",
        status: 403,
        detail: "Cloudflare Turnstile verification failed. Please complete the captcha.",
      },
      403
    );
  }

  const parsed = captureIncompleteOrderSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid data", details: parsed.error.format() }, 400);
  }

  const data = parsed.data;

  // Task 2.3 (V-10): All incomplete-order mutations run inside withTenant
  // so that RLS app.store_id is set and cross-tenant writes are impossible.
  const result = await withTenant(store.id, async (tx) => {
    // Check if a recent incomplete record exists for this phone in the same store
    const existing = await tx.query.incompleteOrders.findFirst({
      where: and(
        eq(incompleteOrders.storeId, store.id),
        eq(incompleteOrders.phone, data.phone),
        eq(incompleteOrders.status, "abandoned")
      ),
    });

    if (existing) {
      // Update existing lead — explicit storeId predicate for defense in depth
      const [updated] = await tx
        .update(incompleteOrders)
        .set({
          customerName: data.customerName || existing.customerName,
          deliveryDistrict: data.deliveryDistrict || existing.deliveryDistrict,
          deliveryAddress: data.deliveryAddress || existing.deliveryAddress,
          items: data.items.length > 0 ? data.items : existing.items,
          estimatedAmount: data.estimatedAmount || existing.estimatedAmount,
          lastStep: data.lastStep,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(incompleteOrders.id, existing.id),
            eq(incompleteOrders.storeId, store.id)
          )
        )
        .returning();

      return { id: updated.id, isNew: false };
    }

    // Insert new incomplete lead
    const [created] = await tx
      .insert(incompleteOrders)
      .values({
        storeId: store.id,
        phone: data.phone,
        customerName: data.customerName,
        deliveryDistrict: data.deliveryDistrict,
        deliveryAddress: data.deliveryAddress,
        items: data.items,
        estimatedAmount: data.estimatedAmount,
        lastStep: data.lastStep,
        status: "abandoned",
      })
      .returning();

    return { id: created.id, isNew: true };
  });

  return c.json(
    { success: true, id: result.id },
    result.isNew ? 201 : 200
  );
});


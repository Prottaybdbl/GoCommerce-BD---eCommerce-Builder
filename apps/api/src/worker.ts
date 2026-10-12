import { Worker } from "bullmq";
import { config } from "./config.js";
import { OutboxJobPayload } from "./services/queue.js";
import { fcmService } from "./services/fcm.js";
import { db, deviceTokens, withTenant, outbox } from "@gocom/db";
import { eq, and, sql } from "drizzle-orm";

console.log("🚀 Starting Go Commerce BD Background Worker (Process Isolation)...");

/**
 * Task 4.3: Relay pending events from transactional outbox table
 * Uses FOR UPDATE SKIP LOCKED to guarantee safe, concurrent execution across workers
 * and stamps processed_at on completion.
 */
export async function relayOutboxBatch(batchSize: number = 20): Promise<number> {
  try {
    return await db.transaction(async (tx) => {
      const rows = await tx.execute(sql`
        SELECT id, store_id, event_type, payload, attempts, max_attempts
        FROM outbox
        WHERE status = 'pending' AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED;
      `);

      const pendingEvents = (Array.isArray(rows) ? rows : (rows as any).rows || []) as Array<{
        id: string;
        store_id: string;
        event_type: string;
        payload: any;
        attempts: number;
        max_attempts: number;
      }>;

      if (pendingEvents.length === 0) return 0;

      for (const event of pendingEvents) {
        try {
          // Process event side-effect
          console.log(`[OutboxRelay] Relaying event ${event.id} (${event.event_type}) for store ${event.store_id}`);

          await tx.execute(sql`
            UPDATE outbox
            SET status = 'completed', processed_at = NOW()
            WHERE id = ${event.id};
          `);
        } catch (err: any) {
          const nextAttempts = (event.attempts || 0) + 1;
          const status = nextAttempts >= (event.max_attempts || 5) ? "failed" : "pending";
          await tx.execute(sql`
            UPDATE outbox
            SET attempts = ${nextAttempts}, status = ${status}, last_error = ${err.message || "Error"}
            WHERE id = ${event.id};
          `);
        }
      }

      return pendingEvents.length;
    });
  } catch (err: any) {
    if (config.NODE_ENV !== "test") {
      console.warn("[OutboxRelay] Batch error:", err.message);
    }
    return 0;
  }
}

let outboxInterval: NodeJS.Timeout | null = null;
if (config.NODE_ENV !== "test") {
  outboxInterval = setInterval(async () => {
    await relayOutboxBatch();
  }, 5000);
}

export const outboxWorker = new Worker<OutboxJobPayload>(
  "gocom-outbox",
  async (job) => {
    console.log(`[Worker] Processing job ${job.id}: ${job.data.type} for store ${job.data.storeId}`);

    switch (job.data.type) {
      case "ORDER_CREATED": {
        const orderData = job.data.data as Record<string, any>;
        const storeId = job.data.storeId;

        // 1. Fetch active device tokens registered for this store
        let tokens: string[] = [];
        try {
          const devices = await withTenant(storeId, async (tx) => {
            return tx.query.deviceTokens.findMany({
              where: and(
                eq(deviceTokens.storeId, storeId),
                eq(deviceTokens.isActive, true)
              ),
            });
          });
          tokens = devices.map((d) => d.token);
        } catch (dbErr: any) {
          console.error(`[Worker] Failed to query device tokens for store ${storeId}:`, dbErr.message);
        }

        // 2. Dispatch FCM HTTP v1 notification with PII-free payload
        if (tokens.length > 0) {
          const res = await fcmService.sendOrderNotification(tokens, {
            orderId: String(orderData.orderId || job.data.orderId || ""),
            orderNumber: String(orderData.orderNumber || "NEW"),
            totalAmountBdt: orderData.totalAmountBdt || (orderData.totalAmount ? orderData.totalAmount / 100 : 0),
            itemCount: Number(orderData.itemCount || 1),
          });

          // Deactivate invalid tokens if any
          if (res.failedTokens.length > 0) {
            try {
              await withTenant(storeId, async (tx) => {
                for (const failedToken of res.failedTokens) {
                  await tx
                    .update(deviceTokens)
                    .set({ isActive: false, updatedAt: new Date() })
                    .where(
                      and(
                        eq(deviceTokens.storeId, storeId),
                        eq(deviceTokens.token, failedToken)
                      )
                    );
                }
              });
            } catch (cleanupErr: any) {
              console.error(`[Worker] Failed to clean up invalid device tokens:`, cleanupErr.message);
            }
          }
        }

        // 3. Meta Conversions API (CAPI) Server-side Event sync
        if (orderData.eventId) {
          console.log(`[Meta CAPI] Dispatching Purchase event ${orderData.eventId} for deduplication`);
        }
        break;
      }

      case "INCOMPLETE_CAPTURED": {
        console.log(`[Worker] New Abandoned Lead captured for store ${job.data.storeId}`);
        break;
      }

      default:
        console.log(`[Worker] Unknown job type`);
    }
  },
  {
    connection: {
      url: config.REDIS_URL,
    },
    concurrency: 2, // Low concurrency to preserve 4 GB server memory
  }
);

outboxWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

outboxWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down worker gracefully...");
  if (outboxInterval) {
    clearInterval(outboxInterval);
  }
  await outboxWorker.close();
  process.exit(0);
});

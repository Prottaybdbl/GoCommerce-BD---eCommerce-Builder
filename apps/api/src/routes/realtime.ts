import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { requirePermission } from "../middleware/auth.js";
import { realtimeOrderBus } from "../services/realtime.js";

type MerchantEnv = {
  Variables: {
    user: any;
    session: any;
    store: any;
    memberRole: any;
  };
};

export const realtimeRouter = new Hono<MerchantEnv>();

// SSE realtime order stream with 25s keep-alive heartbeat
realtimeRouter.get("/orders", requirePermission("orders:view"), async (c) => {
  const store = c.get("store");

  return streamSSE(c, async (stream) => {
    // 1. Initial connection greeting
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({
        storeId: store.id,
        connectedAt: new Date().toISOString(),
      }),
    });

    // 2. Set up 25-second keep-alive heartbeat (Master Plan Phase 5 requirement)
    const pingInterval = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: "ping",
          data: JSON.stringify({ ts: Date.now() }),
        });
      } catch (err) {
        clearInterval(pingInterval);
      }
    }, 25000);
    pingInterval.unref();

    // 3. Subscribe to real-time events for this tenant store
    const unsubscribe = realtimeOrderBus.subscribe(store.id, async (evt) => {
      try {
        await stream.writeSSE({
          event: evt.event,
          data: JSON.stringify(evt.data),
        });
      } catch (err) {
        unsubscribe();
      }
    });

    // 4. Clean up listener and heartbeat when client aborts/disconnects
    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        clearInterval(pingInterval);
        unsubscribe();
        resolve();
      });
    });
  });
});

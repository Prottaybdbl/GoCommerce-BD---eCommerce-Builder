import { Hono } from "hono";
import { db } from "@gocom/db";
import { sql } from "drizzle-orm";

export const healthRouter = new Hono();

healthRouter.get("/health/live", (c) => {
  return c.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/health", async (c) => {
  try {
    // Check DB liveness
    await db.execute(sql`SELECT 1`);
    
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
    });
  } catch (err) {
    return c.json(
      {
        status: "error",
        database: "disconnected",
        message:
          process.env.NODE_ENV === "production"
            ? "Database connection failed"
            : err instanceof Error
            ? err.message
            : "Health check failed",
      },
      503
    );
  }
});

import { Queue } from "bullmq";
import { config } from "../config.js";

const redisConnection = {
  url: config.REDIS_URL,
};

export const outboxQueue = new Queue("gocom-outbox", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const courierQueue = new Queue("gocom-courier", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 50,
  },
});

export interface OutboxJobPayload {
  type: "ORDER_CREATED" | "CALL_STATUS_CHANGED" | "INCOMPLETE_CAPTURED";
  storeId: string;
  orderId?: string;
  incompleteId?: string;
  data: Record<string, unknown>;
}

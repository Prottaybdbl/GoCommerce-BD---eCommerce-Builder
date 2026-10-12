import { EventEmitter } from "node:events";

export interface RealtimeOrderEvent {
  event: "order_created" | "order_status_changed" | "call_status_changed" | "ping";
  data: any;
  timestamp: string;
}

class RealtimeOrderBus {
  private emitter = new EventEmitter();

  constructor() {
    // Increase max listeners for multiple connected dashboards / browser tabs
    this.emitter.setMaxListeners(200);
  }

  private channelKey(storeId: string): string {
    return `store:${storeId}:orders`;
  }

  /**
   * Broadcasts an order event to all active SSE streams connected to this store.
   * Strictly scopes delivery by storeId.
   */
  broadcast(storeId: string, event: RealtimeOrderEvent["event"], data: any): void {
    const payload: RealtimeOrderEvent = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit(this.channelKey(storeId), payload);
  }

  /**
   * Subscribes an SSE connection to realtime events for a given store.
   * Returns an unsubscribe teardown function.
   */
  subscribe(
    storeId: string,
    listener: (event: RealtimeOrderEvent) => void
  ): () => void {
    const key = this.channelKey(storeId);
    this.emitter.on(key, listener);
    return () => {
      this.emitter.off(key, listener);
    };
  }

  listenerCount(storeId: string): number {
    return this.emitter.listenerCount(this.channelKey(storeId));
  }
}

export const realtimeOrderBus = new RealtimeOrderBus();

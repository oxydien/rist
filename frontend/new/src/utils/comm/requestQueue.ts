import type { RateLimiter } from "./rateLimiter.ts";

type EventCallback = (data?: unknown) => void;

class RequestQueue {
  private rateLimiter: RateLimiter;
  private concurrencyLimit: number;
  private retryLimit: number;
  private activeRequests = 0;
  private queue: Array<() => Promise<void>> = [];
  private eventListeners: { [event: string]: EventCallback[] } = {};

  constructor(concurrencyLimit: number, rateLimiter: RateLimiter, retryLimit = 3) {
    this.concurrencyLimit = concurrencyLimit;
    this.rateLimiter = rateLimiter;
    this.retryLimit = retryLimit;
  }

  // Add a request to the queue
  add(requestFn: () => Promise<unknown>) {
    const wrappedRequest = async () => {
      await this.rateLimiter.waitForToken();
      await this.processRequest(requestFn, this.retryLimit);
    };

    this.queue.push(wrappedRequest);
    this.processQueue();
  }

  // Process requests from the queue up to the concurrency limit
  private async processQueue() {
    while (this.activeRequests < this.concurrencyLimit && this.queue.length > 0) {
      const nextRequest = this.queue.shift();
      if (nextRequest) {
        this.activeRequests++;
        nextRequest().finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
      }
    }
  }

  // Process a single request with retry logic
  private async processRequest(requestFn: () => Promise<unknown>, retriesRemaining: number) {
    this.emit("requestStarted");
    try {
      await requestFn();
      this.emit("requestFinished");
    } catch (error) {
      if (retriesRemaining > 0) {
        this.emit("requestRetry", { retriesRemaining });
        await this.processRequest(requestFn, retriesRemaining - 1);
      } else {
        this.emit("requestFailed", { error });
      }
    }
  }

  // Event system
  on(event: string, callback: EventCallback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  private emit(event: string, data?: unknown) {
    const listeners = this.eventListeners[event];
    if (listeners) {
      for (const callback of listeners) {
        callback(data);
      }
    }
  }
}

export default RequestQueue;

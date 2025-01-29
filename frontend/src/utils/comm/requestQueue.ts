import type { RateLimiter } from "./rateLimiter.ts";

type EventCallback = (data?: unknown) => void;

class RequestQueue {
	private standardRateLimiter: RateLimiter;
	private concurrencyLimit: number;
	private retryLimit: number;
	private activeRequests = 0;
	private queue: Array<() => Promise<void>> = [];
	private eventListeners: { [event: string]: EventCallback[] } = {};
	private isCanceled = false;

	constructor(
		concurrencyLimit: number,
		standardRateLimiter: RateLimiter,
		retryLimit = 3,
	) {
		this.concurrencyLimit = concurrencyLimit;
		this.standardRateLimiter = standardRateLimiter;
		this.retryLimit = retryLimit;
	}

	// Add a request to the queue
	add(requestFn: () => Promise<unknown>) {
		const wrappedRequest = async () => {
			await this.standardRateLimiter.waitForToken();
			await this.processRequest(requestFn, this.retryLimit);
		};

		this.queue.push(wrappedRequest);
		this.processQueue();
	}

	cancel() {
		this.isCanceled = true;
	}

	async awaitZeroRequests() {
		while (this.activeRequests > 0) {
			if (this.isCanceled) break;

			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	// Process requests from the queue up to the concurrency limit
	private async processQueue() {
		while (
			this.activeRequests < this.concurrencyLimit &&
			this.queue.length > 0
		) {
			if (this.isCanceled) {
				console.debug("Process queue canceled, not processing new requests");
				break;
			}
			const nextRequest = this.queue.shift();
			if (nextRequest) {
				this.activeRequests++;
				nextRequest().finally(() => {
					this.activeRequests--;
					if (!this.isCanceled) this.processQueue();
				});
			}
		}
	}

	// Process a single request with retry logic
	private async processRequest(
		requestFn: () => Promise<unknown>,
		retriesRemaining: number,
	) {
		this.emit("requestStarted");
		try {
			const result = await requestFn();
			this.emit("requestFinished", result);
		} catch (error) {
			// If the error is an HTTP error with a status code >= 500, emit a "requestFailed" event
			if (
				error &&
				typeof error === "object" &&
				"status" in error &&
				typeof error.status === "number" &&
				error.status >= 500
			) {
				console.log("Request failed with status code", error.status);
				this.emit("requestFailed", error);
				return;
			}

			// If the error is not an >=500 HTTP error, try to retry the request
			if (retriesRemaining > 0) {
				this.emit("requestRetry", { retriesRemaining });
				await this.processRequest(requestFn, retriesRemaining - 1);
			} else {
				// If the request still fails after retries, emit a "requestFailed" event
				this.emit("requestFailed", error);
			}
		}
	}

	// Event system
	on(
		event:
			| "requestStarted"
			| "requestFinished"
			| "requestRetry"
			| "requestFailed",
		callback: EventCallback,
	) {
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

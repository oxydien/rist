class RateLimiter {
  limit: number;
  tokens: number;
  lastRefill: number;
  tokenRefillInterval: number;

  constructor(limit: number, timeWindowMs: number) {
    this.limit = limit;
    this.tokens = limit;
    this.lastRefill = Date.now();
    this.tokenRefillInterval = timeWindowMs / limit;
  }

  async waitForToken() {
    while (true) {
      this.refillTokens();
      if (this.tokens > 0) {
        this.tokens--;
        return;
      }
      const waitTime = Math.max(0, this.tokenRefillInterval - (Date.now() - this.lastRefill));
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  refillTokens() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const newTokens = Math.floor(timePassed / this.tokenRefillInterval);

    if (newTokens > 0) {
      this.tokens = Math.min(this.limit, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }
}

class RateLimiterFactory {
  private rate = 1; // Default rate
  private interval: 'second' | 'minute' | 'hour' | 'custom' = 'minute';
  private customTimeWindowMs: number | undefined;

  static createRateLimiter(): RateLimiterFactory {
    return new RateLimiterFactory();
  }

  setRate(rate: number): RateLimiterFactory {
    this.rate = rate;
    return this;
  }

  setInterval(interval: 'second' | 'minute' | 'hour' | 'custom'): RateLimiterFactory {
    this.interval = interval;
    return this;
  }

  setCustomTimeWindowMs(customTimeWindowMs: number): RateLimiterFactory {
    this.customTimeWindowMs = customTimeWindowMs;
    return this;
  }

  build(): RateLimiter {
    let timeWindowMs: number;

    switch (this.interval) {
      case 'second':
        timeWindowMs = 1000;
        break;
      case 'minute':
        timeWindowMs = 60000;
        break;
      case 'hour':
        timeWindowMs = 3600000;
        break;
      case 'custom':
        if (!this.customTimeWindowMs) throw new Error('Custom time window must be set for custom interval');
        timeWindowMs = this.customTimeWindowMs;
        break;
      default:
        throw new Error('Invalid interval specified');
    }

    return new RateLimiter(this.rate, timeWindowMs);
  }
}

export { RateLimiter, RateLimiterFactory };

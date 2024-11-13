// File to store defaults from the rust part

import { RateLimiterFactory } from "./rateLimiter";

const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

const baseRateLimit = 70;
const baseRateLimitGuard = new RateLimiterFactory().setRate(baseRateLimit).setInterval('minute').build();

const rateLimit = 10;
const rateLimitGuard = new RateLimiterFactory().setRate(rateLimit).setInterval('minute').build();

const strictRateLimit = 2;
const strictRateLimitGuard = new RateLimiterFactory().setRate(strictRateLimit).setInterval('minute').build();

export { UPLOAD_CHUNK_SIZE, baseRateLimit, baseRateLimitGuard, rateLimit, rateLimitGuard, strictRateLimit, strictRateLimitGuard };

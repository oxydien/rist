// File to store defaults from the rust part

import { RateLimiterFactory } from "./rateLimiter";

const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

const relaxedRateLimit = 90;
const relaxedRateLimitGuard = new RateLimiterFactory()
	.setRate(relaxedRateLimit)
	.setInterval("minute")
	.build();

const standardRateLimit = 15;
const standardRateLimitGuard = new RateLimiterFactory()
	.setRate(standardRateLimit)
	.setInterval("minute")
	.build();

const strictRateLimit = 4;
const strictRateLimitGuard = new RateLimiterFactory()
	.setRate(strictRateLimit)
	.setInterval("minute")
	.build();

export {
	UPLOAD_CHUNK_SIZE,
	relaxedRateLimit,
	relaxedRateLimitGuard,
	standardRateLimit,
	standardRateLimitGuard,
	strictRateLimit,
	strictRateLimitGuard,
};

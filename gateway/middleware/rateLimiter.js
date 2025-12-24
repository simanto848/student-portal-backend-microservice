import rateLimit from "express-rate-limit";
import { config } from "../config/config.js";
import { createLogger } from "shared";

const logger = createLogger("RATE_LIMITER");

const limiters = new Map();

export const createServiceRateLimiter = (serviceKey, options = {}) => {
    const serviceConfig = config.services[serviceKey];
    const rateLimitConfig = serviceConfig?.rateLimit || {
        windowMs: 60000,
        max: 100,
    };

    const limiter = rateLimit({
        windowMs: options.windowMs || rateLimitConfig.windowMs,
        max: options.max || rateLimitConfig.max,
        standardHeaders: true, // Return rate limit info in 'RateLimit-*' headers
        legacyHeaders: false, // Disable 'X-RateLimit-*' headers
        keyGenerator: (req) => {
            const userId = req.user?.id || req.cookies?.userId;
            const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
            return userId ? `user:${userId}:${serviceKey}` : `ip:${ip}:${serviceKey}`;
        },
        handler: (req, res) => {
            logger.warn(
                `Rate limit exceeded for ${serviceKey} from ${req.ip || "unknown"}`
            );
            res.status(429).json({
                success: false,
                message: "Too many requests. Please slow down.",
                error: "RATE_LIMIT_EXCEEDED",
                retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000),
            });
        },
        skip: (req) => {
            return req.path === "/health" || req.path.endsWith("/health");
        },
    });

    limiters.set(serviceKey, limiter);
    return limiter;
};

export const getServiceRateLimiter = (serviceKey) => {
    if (!limiters.has(serviceKey)) {
        return createServiceRateLimiter(serviceKey);
    }
    return limiters.get(serviceKey);
};

export const globalRateLimiter = rateLimit({
    windowMs: 60000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const userId = req.user?.id || req.cookies?.userId;
        const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
        return userId ? `user:${userId}:global` : `ip:${ip}:global`;
    },
    handler: (req, res) => {
        logger.warn(`Global rate limit exceeded from ${req.ip || "unknown"}`);
        res.status(429).json({
            success: false,
            message: "Too many requests. Please slow down.",
            error: "RATE_LIMIT_EXCEEDED",
            retryAfter: 60,
        });
    },
    skip: (req) => {
        return req.path === "/health" || req.path.endsWith("/health");
    },
});

export const rateLimiterMiddleware = (serviceKey) => {
    return getServiceRateLimiter(serviceKey);
};

export default {
    createServiceRateLimiter,
    getServiceRateLimiter,
    rateLimiterMiddleware,
    globalRateLimiter,
};

import ApiResponse from '../utils/ApiResponse.js';

const buckets = new Map();
const DEFAULTS = {
    windowMs: 60 * 1000,
    max: 120,
    keyGenerator: (req) => req.ip,
    message: 'Too many requests, please slow down'
};

const cleanupBuckets = () => {
    const now = Date.now();
    for (const [key, entry] of buckets.entries()) {
        if (entry.expiresAt <= now) {
            buckets.delete(key);
        }
    }
};

setInterval(cleanupBuckets, 60 * 1000).unref?.();

const rateLimiter = (options = {}) => {
    const config = { ...DEFAULTS, ...options };

    return (req, res, next) => {
        const now = Date.now();
        const key = config.keyGenerator(req);
        const bucket = buckets.get(key) || { count: 0, expiresAt: now + config.windowMs };

        if (now > bucket.expiresAt) {
            bucket.count = 0;
            bucket.expiresAt = now + config.windowMs;
        }

        bucket.count += 1;
        buckets.set(key, bucket);

        if (bucket.count > config.max) {
            return ApiResponse.tooManyRequests(res, config.message);
        }

        return next();
    };
};

export { rateLimiter };
export default rateLimiter;

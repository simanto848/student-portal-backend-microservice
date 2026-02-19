import { randomUUID } from "crypto";
import { config } from "../config/config.js";

export const transformerMiddleware = (req, res, next) => {
    const transformConfig = config.transformation;
    if (transformConfig.addRequestId && !req.headers["x-request-id"]) {
        req.headers["x-request-id"] = randomUUID();
    }

    // Add timestamp
    if (transformConfig.addTimestamp) {
        req.headers["x-request-timestamp"] = new Date().toISOString();
    }

    // Track request start time if not already tracked
    if (!req.startTime) {
        req.startTime = Date.now();
    }

    const originalWriteHead = res.writeHead;
    res.writeHead = function (statusCode, ...args) {
        if (transformConfig.standardizeHeaders && !res.headersSent) {
            res.setHeader("X-Request-ID", req.headers["x-request-id"] || "unknown");
            res.setHeader("X-Response-Time", Date.now() - req.startTime || 0);
        }
        return originalWriteHead.apply(this, [statusCode, ...args]);
    };

    next();
};

export const enrichRequestMiddleware = (req, res, next) => {
    const userId = req.cookies?.userId || req.headers["x-user-id"];
    const userRole = req.cookies?.userRole || req.headers["x-user-role"];

    if (userId) {
        req.headers["x-user-id"] = userId;
    }
    if (userRole) {
        req.headers["x-user-role"] = userRole;
    }

    next();
};

export const responseTimingMiddleware = (req, res, next) => {
    req.startTime = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - req.startTime;
        if (duration > 1000) {
            console.warn(
                `Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`
            );
        }
    });

    next();
};

export default {
    transformerMiddleware,
    enrichRequestMiddleware,
    responseTimingMiddleware,
};

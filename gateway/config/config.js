import { config as dotenvConfig } from "dotenv";
dotenvConfig();

export const config = {
    port: Number(process.env.PORT || 8000),

    services: {
        user: {
            name: "User Service",
            url: process.env.USER_SERVICE_URL,
            rateLimit: { windowMs: 60000, max: 100 }, // 100 requests per minute
        },
        academic: {
            name: "Academic Service",
            url: process.env.ACADEMIC_SERVICE_URL,
            rateLimit: { windowMs: 60000, max: 200 },
        },
        library: {
            name: "Library Service",
            url: process.env.LIBRARY_SERVICE_URL,
            rateLimit: { windowMs: 60000, max: 150 },
        },
        enrollment: {
            name: "Enrollment Service",
            url: process.env.ENROLLMENT_SERVICE_URL,
            rateLimit: { windowMs: 60000, max: 100 },
        },
        notification: {
            name: "Notification Service",
            url: process.env.NOTIFICATION_SERVICE_URL,
            rateLimit: { windowMs: 60000, max: 50 },
        },
        communication: {
            name: "Communication Service",
            url: process.env.COMMUNICATION_SERVICE_URL,
            rateLimit: { windowMs: 60000, max: 200 },
        },
        classroom: {
            name: "Classroom Service",
            url: process.env.CLASSROOM_SERVICE_URL,
            rateLimit: { windowMs: 60000, max: 150 },
        },
    },

    circuitBreaker: {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 5,
    },

    health: {
        timeoutMs: Number(process.env.HEALTH_TIMEOUT_MS || 2500),
        logLimit: Number(process.env.HEALTH_LOG_LIMIT || 50),
        probeIntervalMs: Number(process.env.HEALTH_PROBE_INTERVAL_MS || 5000),
    },

    alerting: {
        enabled: true,
        cooldownMs: 60000,
        thresholds: {
            errorRatePercent: 10,
            responseTimeMs: 2000,
            consecutiveFailures: 3,
        },
        channels: {
            console: true,
            webhook: process.env.ALERT_WEBHOOK_URL || null,
        },
    },

    transformation: {
        addRequestId: true,
        addTimestamp: true,
        standardizeHeaders: true,
    },
};

export const getAvailableServices = () => {
    return Object.entries(config.services)
        .filter(([_, service]) => Boolean(service.url))
        .map(([key, service]) => ({
            key,
            ...service,
        }));
};

export default config;

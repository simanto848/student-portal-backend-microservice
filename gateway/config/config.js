import { config as envConfig } from "shared"

export const config = {
    port: Number(envConfig.ports.gateway),

    services: {
        user: {
            name: "User Service",
            url: envConfig.services.user,
            rateLimit: { windowMs: 60000, max: 100 }, // 100 requests per minute
        },
        academic: {
            name: "Academic Service",
            url: envConfig.services.academic,
            rateLimit: { windowMs: 60000, max: 200 },
        },
        library: {
            name: "Library Service",
            url: envConfig.services.academic,
            rateLimit: { windowMs: 60000, max: 150 },
        },
        enrollment: {
            name: "Enrollment Service",
            url: envConfig.services.enrollment,
            rateLimit: { windowMs: 60000, max: 100 },
        },
        notification: {
            name: "Notification Service",
            url: envConfig.services.notification,
            rateLimit: { windowMs: 60000, max: 50 },
        },
        communication: {
            name: "Communication Service",
            url: envConfig.services.communication,
            rateLimit: { windowMs: 60000, max: 200 },
        },
        classroom: {
            name: "Classroom Service",
            url: envConfig.services.classroom,
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
        timeoutMs: Number(envConfig.health.timeoutMs),
        logLimit: Number(envConfig.health.logLimit),
        probeIntervalMs: Number(envConfig.health.probeIntervalMs),
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

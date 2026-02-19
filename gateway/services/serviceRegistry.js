import { config, getAvailableServices } from "../config/config.js";
import { createLogger } from "shared";

const logger = createLogger("SERVICE_REGISTRY");

class ServiceRegistry {
    constructor() {
        this.services = new Map();
        this.healthLogs = new Map();
        this.initialize();
    }

    initialize() {
        const availableServices = getAvailableServices();
        for (const service of availableServices) {
            this.register(service.key, {
                name: service.name,
                url: service.url,
                rateLimit: service.rateLimit,
                version: "1.0.0",
                registeredAt: new Date().toISOString(),
                metadata: {},
            });
        }
        logger.info(`Initialized ${this.services.size} services`);
    }

    register(key, serviceConfig) {
        const existing = this.services.get(key);
        this.services.set(key, {
            ...serviceConfig,
            key,
            status: "unknown",
            lastHealthCheck: null,
            consecutiveFailures: 0,
            metrics: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                avgResponseTime: 0,
                lastResponseTime: 0,
            },
            healthCheckMetrics: {
                totalChecks: 0,
                successfulChecks: 0,
                failedChecks: 0,
                avgResponseTime: 0,
                lastResponseTime: 0,
            },
            circuitState: "closed",
            ...(existing?.metrics ? { metrics: existing.metrics } : {}),
            ...(existing?.healthCheckMetrics ? { healthCheckMetrics: existing.healthCheckMetrics } : {}),
        });

        if (!this.healthLogs.has(key)) {
            this.healthLogs.set(key, []);
        }

        return this.services.get(key);
    }

    get(key) {
        return this.services.get(key);
    }

    getAll() {
        return Array.from(this.services.values());
    }

    getHealthy() {
        return this.getAll().filter((s) => s.status === "operational");
    }

    updateHealth(key, healthData) {
        const service = this.services.get(key);
        if (!service) return null;

        const { status, httpStatus, responseTimeMs } = healthData;
        const wasDown = service.status === "down";
        const isDown = status === "down";
        if (isDown) {
            service.consecutiveFailures++;
        } else {
            service.consecutiveFailures = 0;
        }

        if (!service.healthCheckMetrics) {
            service.healthCheckMetrics = {
                totalChecks: 0,
                successfulChecks: 0,
                failedChecks: 0,
                avgResponseTime: 0,
                lastResponseTime: 0,
            };
        }

        service.healthCheckMetrics.totalChecks++;
        if (status === "operational") {
            service.healthCheckMetrics.successfulChecks++;
        } else {
            service.healthCheckMetrics.failedChecks++;
        }

        const prevAvg = service.healthCheckMetrics.avgResponseTime;
        const totalReqs = service.healthCheckMetrics.totalChecks;
        service.healthCheckMetrics.avgResponseTime =
            (prevAvg * (totalReqs - 1) + responseTimeMs) / totalReqs;
        service.healthCheckMetrics.lastResponseTime = responseTimeMs;

        service.status = status;
        service.lastHealthCheck = new Date().toISOString();

        this.appendHealthLog(key, {
            at: service.lastHealthCheck,
            status,
            httpStatus,
            responseTimeMs,
        });

        this.services.set(key, service);

        return {
            service,
            statusChanged: wasDown !== isDown,
            recovered: wasDown && !isDown,
            wentDown: !wasDown && isDown,
        };
    }

    updateCircuitState(key, state) {
        const service = this.services.get(key);
        if (service) {
            service.circuitState = state;
            this.services.set(key, service);
        }
    }

    appendHealthLog(key, entry) {
        const logs = this.healthLogs.get(key) || [];
        logs.push(entry);
        if (logs.length > config.health.logLimit) {
            logs.splice(0, logs.length - config.health.logLimit);
        }
        this.healthLogs.set(key, logs);
    }

    getHealthLogs(key, limit = 20) {
        const logs = this.healthLogs.get(key) || [];
        return logs.slice(-Math.min(limit, config.health.logLimit)).reverse();
    }

    recordRequest(key, { success, responseTimeMs }) {
        const service = this.services.get(key);
        if (!service) return;

        service.metrics.totalRequests++;
        if (success) {
            service.metrics.successfulRequests++;
        } else {
            service.metrics.failedRequests++;
        }

        const prevAvg = service.metrics.avgResponseTime;
        const totalReqs = service.metrics.totalRequests;
        service.metrics.avgResponseTime =
            (prevAvg * (totalReqs - 1) + responseTimeMs) / totalReqs;
        service.metrics.lastResponseTime = responseTimeMs;

        this.services.set(key, service);
    }

    getErrorRate(key) {
        const service = this.services.get(key);
        if (!service || service.metrics.totalRequests === 0) return 0;
        return (
            (service.metrics.failedRequests / service.metrics.totalRequests) * 100
        );
    }

    getSystemHealth() {
        const services = this.getAll();
        const hasDown = services.some((s) => s.status === "down");
        const hasDegraded = services.some((s) => s.status === "degraded");

        return {
            overallStatus: hasDown ? "down" : hasDegraded ? "degraded" : "operational",
            services: services.map((s) => ({
                key: s.key,
                name: s.name,
                status: s.status,
                circuitState: s.circuitState,
                lastHealthCheck: s.lastHealthCheck,
                metrics: s.metrics,
                healthCheckMetrics: s.healthCheckMetrics,
                consecutiveFailures: s.consecutiveFailures,
            })),
        };
    }
}

export const serviceRegistry = new ServiceRegistry();
export default serviceRegistry;

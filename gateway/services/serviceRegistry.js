import { config, getAvailableServices } from "../config/config.js";
import { createLogger } from "shared";

const logger = createLogger("SERVICE_REGISTRY");

const VALID_CIRCUIT_STATES = Object.freeze(["closed", "open", "half-open"]);
const VALID_SERVICE_STATUSES = Object.freeze(["operational", "degraded", "down", "unknown"]);
const DEFAULT_HEALTH_LOG_LIMIT = 100;

class ServiceRegistry {
    constructor() {
        this.services = new Map();
        this.healthLogs = new Map();
        this.locks = new Map();
        this.initialize();
    }

    initialize() {
        try {
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
        } catch (error) {
            logger.error("Failed to initialize service registry:", error.message);
        }
    }

    validateKey(key) {
        if (!key || typeof key !== "string") {
            throw new Error("Service key must be a non-empty string");
        }
        return key.trim().toLowerCase();
    }

    validateStatus(status) {
        if (!VALID_SERVICE_STATUSES.includes(status)) {
            return "unknown";
        }
        return status;
    }

    validateCircuitState(state) {
        if (!VALID_CIRCUIT_STATES.includes(state)) {
            return "closed";
        }
        return state;
    }

    normalizeResponseTime(responseTimeMs) {
        const num = Number(responseTimeMs);
        return Number.isFinite(num) && num >= 0 ? num : 0;
    }

    getLogLimit() {
        const limit = config?.health?.logLimit;
        return Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_HEALTH_LOG_LIMIT;
    }

    async withLock(key, fn) {
        const normalizedKey = this.validateKey(key);

        while (this.locks.has(normalizedKey)) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.locks.set(normalizedKey, true);
        try {
            return await fn();
        } finally {
            this.locks.delete(normalizedKey);
        }
    }

    register(key, serviceConfig) {
        const normalizedKey = this.validateKey(key);
        const existing = this.services.get(normalizedKey);

        const service = {
            ...serviceConfig,
            key: normalizedKey,
            status: this.validateStatus(serviceConfig.status) || "unknown",
            lastHealthCheck: null,
            consecutiveFailures: 0,
            metrics: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                avgResponseTime: 0,
                lastResponseTime: 0,
            },
            circuitState: "closed",
        };

        if (existing?.metrics) {
            service.metrics = { ...service.metrics, ...existing.metrics };
        }

        this.services.set(normalizedKey, service);

        if (!this.healthLogs.has(normalizedKey)) {
            this.healthLogs.set(normalizedKey, []);
        }

        logger.debug(`Registered service: ${normalizedKey}`);
        return this.services.get(normalizedKey);
    }

    unregister(key) {
        const normalizedKey = this.validateKey(key);
        const existed = this.services.delete(normalizedKey);
        this.healthLogs.delete(normalizedKey);

        if (existed) {
            logger.info(`Unregistered service: ${normalizedKey}`);
        }
        return existed;
    }

    get(key) {
        try {
            const normalizedKey = this.validateKey(key);
            return this.services.get(normalizedKey);
        } catch {
            return undefined;
        }
    }

    getAll() {
        return Array.from(this.services.values());
    }

    getHealthy() {
        return this.getAll().filter((s) => s.status === "operational");
    }

    getUnhealthy() {
        return this.getAll().filter((s) => s.status !== "operational");
    }

    updateHealth(key, healthData) {
        const normalizedKey = this.validateKey(key);
        const service = this.services.get(normalizedKey);
        if (!service) {
            logger.warn(`Attempted to update health for unknown service: ${normalizedKey}`);
            return null;
        }

        const { status, httpStatus, responseTimeMs, error } = healthData || {};
        const normalizedStatus = this.validateStatus(status);
        const normalizedResponseTime = this.normalizeResponseTime(responseTimeMs);

        const wasDown = service.status === "down";
        const isDown = normalizedStatus === "down";

        if (isDown) {
            service.consecutiveFailures++;
        } else {
            service.consecutiveFailures = 0;
        }

        service.metrics.totalRequests++;
        if (normalizedStatus === "operational") {
            service.metrics.successfulRequests++;
        } else {
            service.metrics.failedRequests++;
        }

        const totalReqs = service.metrics.totalRequests;
        if (totalReqs > 0) {
            service.metrics.avgResponseTime =
                (service.metrics.avgResponseTime * (totalReqs - 1) + normalizedResponseTime) / totalReqs;
        }
        service.metrics.lastResponseTime = normalizedResponseTime;

        service.status = normalizedStatus;
        service.lastHealthCheck = new Date().toISOString();

        this.appendHealthLog(normalizedKey, {
            at: service.lastHealthCheck,
            status: normalizedStatus,
            httpStatus: httpStatus || null,
            responseTimeMs: normalizedResponseTime,
            error: error || null,
        });

        this.services.set(normalizedKey, service);

        return {
            service,
            statusChanged: wasDown !== isDown,
            recovered: wasDown && !isDown,
            wentDown: !wasDown && isDown,
        };
    }

    updateCircuitState(key, state) {
        const normalizedKey = this.validateKey(key);
        const service = this.services.get(normalizedKey);

        if (service) {
            service.circuitState = this.validateCircuitState(state);
            this.services.set(normalizedKey, service);
            logger.debug(`Circuit state for ${normalizedKey}: ${service.circuitState}`);
        }
    }

    appendHealthLog(key, entry) {
        const normalizedKey = this.validateKey(key);
        const logs = this.healthLogs.get(normalizedKey) || [];
        const logLimit = this.getLogLimit();

        logs.push({
            at: entry.at || new Date().toISOString(),
            status: entry.status || "unknown",
            httpStatus: entry.httpStatus || null,
            responseTimeMs: this.normalizeResponseTime(entry.responseTimeMs),
            error: entry.error || null,
        });

        while (logs.length > logLimit) {
            logs.shift();
        }

        this.healthLogs.set(normalizedKey, logs);
    }

    getHealthLogs(key, limit = 20) {
        try {
            const normalizedKey = this.validateKey(key);
            const logs = this.healthLogs.get(normalizedKey) || [];
            const safeLimit = Math.max(1, Math.min(limit, this.getLogLimit()));
            return logs.slice(-safeLimit).reverse();
        } catch {
            return [];
        }
    }

    recordRequest(key, { success, responseTimeMs }) {
        try {
            const normalizedKey = this.validateKey(key);
            const service = this.services.get(normalizedKey);
            if (!service) return;

            const normalizedResponseTime = this.normalizeResponseTime(responseTimeMs);

            service.metrics.totalRequests++;
            if (success) {
                service.metrics.successfulRequests++;
            } else {
                service.metrics.failedRequests++;
                service.consecutiveFailures++;
            }

            const totalReqs = service.metrics.totalRequests;
            if (totalReqs > 0) {
                service.metrics.avgResponseTime =
                    (service.metrics.avgResponseTime * (totalReqs - 1) + normalizedResponseTime) / totalReqs;
            }
            service.metrics.lastResponseTime = normalizedResponseTime;

            if (success) {
                service.consecutiveFailures = 0;
            }

            this.services.set(normalizedKey, service);
        } catch (error) {
            logger.warn(`Failed to record request for ${key}:`, error.message);
        }
    }

    getErrorRate(key) {
        try {
            const normalizedKey = this.validateKey(key);
            const service = this.services.get(normalizedKey);

            if (!service || service.metrics.totalRequests === 0) {
                return 0;
            }

            return (service.metrics.failedRequests / service.metrics.totalRequests) * 100;
        } catch {
            return 0;
        }
    }

    getSystemHealth() {
        const services = this.getAll();
        const hasDown = services.some((s) => s.status === "down");
        const hasDegraded = services.some((s) => s.status === "degraded");
        const hasUnknown = services.some((s) => s.status === "unknown");

        let overallStatus = "operational";
        if (hasDown) {
            overallStatus = "down";
        } else if (hasDegraded) {
            overallStatus = "degraded";
        } else if (hasUnknown && services.length > 0) {
            overallStatus = "unknown";
        }

        return {
            overallStatus,
            totalServices: services.length,
            healthyCount: services.filter((s) => s.status === "operational").length,
            unhealthyCount: services.filter((s) => s.status !== "operational").length,
            services: services.map((s) => ({
                key: s.key,
                name: s.name,
                url: s.url,
                status: s.status,
                circuitState: s.circuitState,
                lastHealthCheck: s.lastHealthCheck,
                metrics: { ...s.metrics },
                consecutiveFailures: s.consecutiveFailures,
            })),
        };
    }

    resetMetrics(key) {
        try {
            const normalizedKey = this.validateKey(key);
            const service = this.services.get(normalizedKey);

            if (service) {
                service.metrics = {
                    totalRequests: 0,
                    successfulRequests: 0,
                    failedRequests: 0,
                    avgResponseTime: 0,
                    lastResponseTime: 0,
                };
                service.consecutiveFailures = 0;
                this.services.set(normalizedKey, service);
                logger.info(`Reset metrics for service: ${normalizedKey}`);
            }
        } catch (error) {
            logger.warn(`Failed to reset metrics for ${key}:`, error.message);
        }
    }

    clearHealthLogs(key) {
        try {
            const normalizedKey = this.validateKey(key);
            this.healthLogs.set(normalizedKey, []);
        } catch {
            // ignore
        }
    }
}

export const serviceRegistry = new ServiceRegistry();
export default serviceRegistry;

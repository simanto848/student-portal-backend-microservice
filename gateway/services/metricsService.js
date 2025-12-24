import { serviceRegistry } from "./serviceRegistry.js";
import { getCircuitStats } from "../middleware/circuitBreaker.js";
import { createLogger } from "shared";

const logger = createLogger("METRICS");

class MetricsService {
    constructor() {
        this.startTime = Date.now();
        this.requestCounts = {
            total: 0,
            success: 0,
            failed: 0,
            byService: {},
        };
    }

    recordRequest(serviceKey, { success, statusCode, responseTimeMs }) {
        this.requestCounts.total++;
        if (success) {
            this.requestCounts.success++;
        } else {
            this.requestCounts.failed++;
        }

        if (!this.requestCounts.byService[serviceKey]) {
            this.requestCounts.byService[serviceKey] = {
                total: 0,
                success: 0,
                failed: 0,
                statusCodes: {},
            };
        }

        const serviceStats = this.requestCounts.byService[serviceKey];
        serviceStats.total++;
        if (success) {
            serviceStats.success++;
        } else {
            serviceStats.failed++;
        }

        const codeKey = String(statusCode);
        serviceStats.statusCodes[codeKey] =
            (serviceStats.statusCodes[codeKey] || 0) + 1;
    }

    getUptime() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
            rss: Math.round(usage.rss / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024),
        };
    }

    getMetrics() {
        const systemHealth = serviceRegistry.getSystemHealth();
        const circuitStats = getCircuitStats();

        return {
            gateway: {
                uptimeSeconds: this.getUptime(),
                startedAt: new Date(this.startTime).toISOString(),
                memory: this.getMemoryUsage(),
                nodeVersion: process.version,
            },
            requests: {
                total: this.requestCounts.total,
                success: this.requestCounts.success,
                failed: this.requestCounts.failed,
                successRate:
                    this.requestCounts.total > 0
                        ? (
                            (this.requestCounts.success / this.requestCounts.total) *
                            100
                        ).toFixed(2) + "%"
                        : "N/A",
                byService: this.requestCounts.byService,
            },
            services: systemHealth.services.map((service) => ({
                key: service.key,
                name: service.name,
                status: service.status,
                circuitState: circuitStats[service.key]?.state || service.circuitState || "closed",
                metrics: service.metrics,
                circuitStats: circuitStats[service.key]?.stats || null,
            })),
            timestamp: new Date().toISOString(),
        };
    }

    getSummary() {
        const systemHealth = serviceRegistry.getSystemHealth();
        return {
            uptime: this.getUptime(),
            overallStatus: systemHealth.overallStatus,
            totalRequests: this.requestCounts.total,
            successRate:
                this.requestCounts.total > 0
                    ? (
                        (this.requestCounts.success / this.requestCounts.total) *
                        100
                    ).toFixed(2) + "%"
                    : "N/A",
            servicesUp: systemHealth.services.filter(
                (s) => s.status === "operational"
            ).length,
            servicesTotal: systemHealth.services.length,
        };
    }
}

export const metricsService = new MetricsService();
export default metricsService;

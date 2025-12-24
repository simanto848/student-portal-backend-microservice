import { config } from "../config/config.js";
import { serviceRegistry } from "./serviceRegistry.js";
import { createLogger } from "shared";

const logger = createLogger("ALERTING");

class AlertingService {
    constructor() {
        this.alerts = [];
        this.alertCooldowns = new Map();
        this.maxAlerts = 100;
    }

    shouldAlert(alertKey) {
        const lastAlert = this.alertCooldowns.get(alertKey);
        if (!lastAlert) return true;

        const cooldownMs = config.alerting.cooldownMs;
        return Date.now() - lastAlert > cooldownMs;
    }

    markAlerted(alertKey) {
        this.alertCooldowns.set(alertKey, Date.now());
    }

    createAlert(type, severity, message, data = {}) {
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            severity, // 'info', 'warning', 'critical'
            message,
            data,
            createdAt: new Date().toISOString(),
            acknowledged: false,
        };

        this.alerts.push(alert);
        if (this.alerts.length > this.maxAlerts) {
            this.alerts.splice(0, this.alerts.length - this.maxAlerts);
        }

        this.dispatch(alert);
        return alert;
    }

    dispatch(alert) {
        const channels = config.alerting.channels;
        if (channels.console) {
            const logMethod =
                alert.severity === "critical"
                    ? "error"
                    : alert.severity === "warning"
                        ? "warn"
                        : "info";
            logger[logMethod](
                `[ALERT] ${alert.type}: ${alert.message}`,
                alert.data
            );
        }

        if (channels.webhook) {
            this.sendWebhook(alert, channels.webhook).catch((err) => {
                logger.error("Failed to send webhook alert:", err.message);
            });
        }
    }

    async sendWebhook(alert, webhookUrl) {
        try {
            await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: `🚨 *${alert.severity.toUpperCase()}* - ${alert.type}\n${alert.message}`,
                    alert,
                }),
            });
        } catch (error) {
            throw error;
        }
    }

    checkAndAlert(serviceKey, healthResult) {
        const thresholds = config.alerting.thresholds;
        const service = serviceRegistry.get(serviceKey);
        if (!service) return;

        if (healthResult.wentDown) {
            const alertKey = `down:${serviceKey}`;
            if (this.shouldAlert(alertKey)) {
                this.createAlert(
                    "SERVICE_DOWN",
                    "critical",
                    `${service.name} (${serviceKey}) is DOWN`,
                    { serviceKey, consecutiveFailures: service.consecutiveFailures }
                );
                this.markAlerted(alertKey);
            }
        }

        if (healthResult.recovered) {
            this.createAlert(
                "SERVICE_RECOVERED",
                "info",
                `${service.name} (${serviceKey}) has RECOVERED`,
                { serviceKey }
            );
            this.alertCooldowns.delete(`down:${serviceKey}`);
        }

        if (
            service.consecutiveFailures >= thresholds.consecutiveFailures &&
            !healthResult.wentDown
        ) {
            const alertKey = `failures:${serviceKey}`;
            if (this.shouldAlert(alertKey)) {
                this.createAlert(
                    "CONSECUTIVE_FAILURES",
                    "warning",
                    `${service.name} has ${service.consecutiveFailures} consecutive failures`,
                    { serviceKey, failures: service.consecutiveFailures }
                );
                this.markAlerted(alertKey);
            }
        }

        if (service.metrics.lastResponseTime > thresholds.responseTimeMs) {
            const alertKey = `slow:${serviceKey}`;
            if (this.shouldAlert(alertKey)) {
                this.createAlert(
                    "SLOW_RESPONSE",
                    "warning",
                    `${service.name} response time is ${service.metrics.lastResponseTime}ms (threshold: ${thresholds.responseTimeMs}ms)`,
                    { serviceKey, responseTime: service.metrics.lastResponseTime }
                );
                this.markAlerted(alertKey);
            }
        }

        const errorRate = serviceRegistry.getErrorRate(serviceKey);
        if (errorRate > thresholds.errorRatePercent) {
            const alertKey = `errorrate:${serviceKey}`;
            if (this.shouldAlert(alertKey)) {
                this.createAlert(
                    "HIGH_ERROR_RATE",
                    "warning",
                    `${service.name} error rate is ${errorRate.toFixed(2)}% (threshold: ${thresholds.errorRatePercent}%)`,
                    { serviceKey, errorRate }
                );
                this.markAlerted(alertKey);
            }
        }
    }

    alertCircuitOpen(serviceKey) {
        const service = serviceRegistry.get(serviceKey);
        const alertKey = `circuit:${serviceKey}`;
        if (this.shouldAlert(alertKey)) {
            this.createAlert(
                "CIRCUIT_OPEN",
                "critical",
                `Circuit breaker OPENED for ${service?.name || serviceKey}`,
                { serviceKey }
            );
            this.markAlerted(alertKey);
        }
    }

    getAlerts(limit = 20, includeAcknowledged = false) {
        let filtered = includeAcknowledged
            ? this.alerts
            : this.alerts.filter((a) => !a.acknowledged);
        return filtered.slice(-limit).reverse();
    }

    acknowledgeAlert(alertId) {
        const alert = this.alerts.find((a) => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    clearAlerts() {
        const count = this.alerts.length;
        this.alerts = [];
        return count;
    }
}

export const alertingService = new AlertingService();
export default alertingService;

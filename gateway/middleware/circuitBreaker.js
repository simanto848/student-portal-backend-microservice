import CircuitBreaker from "opossum";
import { createLogger } from "shared";
import { config } from "../config/config.js";
import { serviceRegistry } from "../services/serviceRegistry.js";

const logger = createLogger("CIRCUIT_BREAKER");

const circuits = new Map();

export const createCircuitBreaker = (serviceKey, proxyFunction) => {
    const cbConfig = config.circuitBreaker;

    const breaker = new CircuitBreaker(proxyFunction, {
        timeout: cbConfig.timeout,
        errorThresholdPercentage: cbConfig.errorThresholdPercentage,
        resetTimeout: cbConfig.resetTimeout,
        volumeThreshold: cbConfig.volumeThreshold,
        name: serviceKey,
    });

    breaker.on("open", () => {
        logger.warn(`Circuit OPEN for ${serviceKey} - requests will be rejected`);
        serviceRegistry.updateCircuitState(serviceKey, "open");
    });

    breaker.on("halfOpen", () => {
        logger.info(
            `Circuit HALF-OPEN for ${serviceKey} - testing if service recovered`
        );
        serviceRegistry.updateCircuitState(serviceKey, "half-open");
    });

    breaker.on("close", () => {
        logger.info(`Circuit CLOSED for ${serviceKey} - service is healthy`);
        serviceRegistry.updateCircuitState(serviceKey, "closed");
    });

    breaker.on("fallback", () => {
        logger.debug(`Circuit fallback triggered for ${serviceKey}`);
    });

    breaker.on("timeout", () => {
        logger.warn(`Request to ${serviceKey} timed out`);
    });

    circuits.set(serviceKey, breaker);
    return breaker;
};

export const getCircuitBreaker = (serviceKey) => {
    return circuits.get(serviceKey);
};

export const getCircuitStats = () => {
    const stats = {};
    for (const [key, breaker] of circuits.entries()) {
        stats[key] = {
            state: breaker.opened ? "open" : breaker.halfOpen ? "half-open" : "closed",
            stats: {
                successes: breaker.stats.successes,
                failures: breaker.stats.failures,
                rejects: breaker.stats.rejects,
                timeouts: breaker.stats.timeouts,
                fallbacks: breaker.stats.fallbacks,
            },
        };
    }
    return stats;
};

export const circuitBreakerMiddleware = (serviceKey, proxyHandler) => {
    const breaker = createCircuitBreaker(serviceKey, async (req, res) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const originalEnd = res.end;
            res.end = function (...args) {
                const responseTime = Date.now() - startTime;
                const success = res.statusCode < 500;

                serviceRegistry.recordRequest(serviceKey, {
                    success,
                    responseTimeMs: responseTime,
                });

                if (success) {
                    resolve();
                } else {
                    reject(new Error(`Service returned ${res.statusCode}`));
                }

                return originalEnd.apply(this, args);
            };

            try {
                proxyHandler(req, res, (err) => {
                    if (err) {
                        serviceRegistry.recordRequest(serviceKey, {
                            success: false,
                            responseTimeMs: Date.now() - startTime,
                        });
                        reject(err);
                    }
                });
            } catch (err) {
                serviceRegistry.recordRequest(serviceKey, {
                    success: false,
                    responseTimeMs: Date.now() - startTime,
                });
                reject(err);
            }
        });
    });

    breaker.fallback(() => {
        return { circuitOpen: true };
    });

    return async (req, res, next) => {
        try {
            const result = await breaker.fire(req, res);
            if (result && result.circuitOpen) {
                return res.status(503).json({
                    success: false,
                    message: `Service temporarily unavailable. Please try again later.`,
                    error: "CIRCUIT_OPEN",
                    service: serviceKey,
                });
            }
        } catch (error) {
            if (!res.headersSent) {
                return res.status(503).json({
                    success: false,
                    message: `Service error: ${error.message}`,
                    error: "SERVICE_ERROR",
                    service: serviceKey,
                });
            }
        }
    };
};

export default { createCircuitBreaker, getCircuitBreaker, getCircuitStats };

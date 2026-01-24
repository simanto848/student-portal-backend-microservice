
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { logger } from './logger.js';
import config from '../config/env.js';

export class ServiceClient {
    constructor(serviceName, baseURL) {
        this.serviceName = serviceName;
        this.client = axios.create({
            baseURL,
            timeout: 5000, // 5 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'X-Source-Service': process.env.SERVICE_NAME || 'unknown' // Identify caller
            }
        });

        // Configure Retries
        axiosRetry(this.client, {
            retries: 3,
            retryDelay: (retryCount) => {
                logger.warn(`[${serviceName}] Request failed, retrying (${retryCount}/3)...`);
                return axiosRetry.exponentialDelay(retryCount);
            },
            retryCondition: (error) => {
                // Retry on network errors or 5xx status codes
                return axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error);
            }
        });

        // Request Interceptor for Logging
        this.client.interceptors.request.use((config) => {
            config.metadata = { startTime: new Date() };
            return config;
        });

        // Response Interceptor for Logging & Performance
        this.client.interceptors.response.use(
            (response) => {
                const duration = new Date() - response.config.metadata.startTime;
                // Log only if needed (debug level) to avoid noise
                // logger.debug(`[${serviceName}] Call success (${duration}ms): ${response.config.method.toUpperCase()} ${response.config.url}`);
                return response;
            },
            (error) => {
                const duration = new Date() - error.config?.metadata?.startTime;
                logger.error(`[${serviceName}] Call failed (${duration}ms): ${error.message} - ${error.config?.url}`);
                return Promise.reject(error);
            }
        );
    }

    async get(path, config = {}) {
        return this.client.get(path, config);
    }

    async post(path, data, config = {}) {
        return this.client.post(path, data, config);
    }

    async put(path, data, config = {}) {
        return this.client.put(path, data, config);
    }

    async delete(path, config = {}) {
        return this.client.delete(path, config);
    }

    // Helper to attach auth token
    withAuth(token) {
        // Return a new instance or modified config? 
        // Better to just set headers for a specific call, but properly:
        // We can create a lightweight proxy or just use an option in methods.
        // For simplicity in this codebase, we supply headers in config.
        return {
            headers: { Authorization: `Bearer ${token}` }
        };
    }
}

// Factory
export const createServiceClient = (serviceName) => {
    // Map service name to URL from centralized config
    const serviceUrl = config.services[serviceName.toLowerCase()];
    if (!serviceUrl) {
        throw new Error(`Service URL not found for: ${serviceName}`);
    }
    return new ServiceClient(serviceName, serviceUrl);
};

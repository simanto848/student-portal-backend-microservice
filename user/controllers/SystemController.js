import { ApiResponse } from "shared";
import systemService from "../services/systemService.js";

class SystemController {
    // System Health
    async getHealth(req, res, next) {
        try {
            const health = await systemService.getHealth();
            return ApiResponse.success(res, health, "System health retrieved successfully");
        } catch (error) {
            next(error);
        }
    }

    // Database Stats
    async getDatabaseStats(req, res, next) {
        try {
            const dbStats = await systemService.getDatabaseStats();
            return ApiResponse.success(res, dbStats, "Database stats retrieved successfully");
        } catch (error) {
            next(error);
        }
    }

    async getLogs(req, res, next) {
        try {
            const logs = await systemService.getLogs(req.query);
            return ApiResponse.success(res, logs, "System logs retrieved successfully");
        } catch (error) {
            next(error);
        }
    }

    // Alerts
    async getAlerts(req, res, next) {
        try {
            const alerts = await systemService.getAlerts();
            return ApiResponse.success(res, alerts, "System alerts retrieved successfully");
        } catch (error) {
            next(error);
        }
    }

    // API Stats
    async getApiStats(req, res, next) {
        try {
            const stats = await systemService.getApiStats();
            return ApiResponse.success(res, stats, "API stats retrieved successfully");
        } catch (error) {
            next(error);
        }
    }
}

export default new SystemController();

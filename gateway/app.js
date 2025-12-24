import express from "express";
import expressProxy from "express-http-proxy";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createLogger, requestLoggerMiddleware } from "shared";

// Configuration
import { config, getAvailableServices } from "./config/config.js";

// Services
import { serviceRegistry } from "./services/serviceRegistry.js";
import { metricsService } from "./services/metricsService.js";
import { alertingService } from "./services/alertingService.js";

// Middleware
import { rateLimiterMiddleware, globalRateLimiter } from "./middleware/rateLimiter.js";
import { transformerMiddleware, responseTimingMiddleware } from "./middleware/transformer.js";

const logger = createLogger("GATEWAY");

const app = express();

// ========== Core Middleware ========== 

// Request timing (must be early)
app.use(responseTimingMiddleware);

// Request Logger Middleware
app.use(requestLoggerMiddleware("GATEWAY"));

// Skip morgan logging for health checks
app.use(morgan("dev", {
  skip: (req) => req.url === "/health"
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

// Cookie parser for rate limiting by user
app.use(cookieParser());

// Global rate limiting (fallback)
app.use(globalRateLimiter);

// Request transformation (adds request ID, timestamps)
app.use(transformerMiddleware);

// ========== Health & Monitoring Endpoints ========== 

// Basic health check (for Docker/load balancer)
app.get("/health", (req, res) => {
  res.status(200).json({
    message: "Gateway Service is running",
    status: true,
    statusCode: 200,
  });
});

// System health (aggregated service status)
app.get("/api/system-health", async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization;
    const services = getAvailableServices();

    // Check all services
    const checks = await Promise.all(
      services.map((service) => checkServiceHealth(service, authorizationHeader))
    );

    const checkedAt = new Date().toISOString();

    // Update registry and check for alerts
    for (const check of checks) {
      const result = serviceRegistry.updateHealth(check.key, check);
      if (config.alerting.enabled && result) {
        alertingService.checkAndAlert(check.key, result);
      }
    }

    const systemHealth = serviceRegistry.getSystemHealth();

    res.status(200).json({
      success: true,
      data: {
        checkedAt,
        ...systemHealth,
      },
    });
  } catch (error) {
    logger.error("System health check failed:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Service-specific health inspection
app.get("/api/system-health/:key/inspect", async (req, res) => {
  try {
    const { key } = req.params;
    const service = serviceRegistry.get(key);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const authorizationHeader = req.headers.authorization;
    const current = await checkServiceHealth(
      { key, name: service.name, url: service.url },
      authorizationHeader
    );

    const result = serviceRegistry.updateHealth(key, current);
    if (config.alerting.enabled && result) {
      alertingService.checkAndAlert(key, result);
    }

    res.status(200).json({
      success: true,
      data: {
        checkedAt: new Date().toISOString(),
        service: {
          key: service.key,
          name: service.name,
          url: service.url,
          version: service.version,
        },
        current,
        metrics: service.metrics,
        circuitState: service.circuitState,
      },
    });
  } catch (error) {
    logger.error("Service inspection failed:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Service health logs
app.get("/api/system-health/:key/logs", (req, res) => {
  try {
    const { key } = req.params;
    const service = serviceRegistry.get(key);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const limit = Math.min(Number(req.query.limit || 20), config.health.logLimit);
    const entries = serviceRegistry.getHealthLogs(key, limit);

    res.status(200).json({
      success: true,
      data: {
        service: {
          key: service.key,
          name: service.name,
        },
        entries,
      },
    });
  } catch (error) {
    logger.error("Failed to retrieve health logs:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Metrics endpoint
app.get("/api/metrics", (req, res) => {
  try {
    const metrics = metricsService.getMetrics();
    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error("Failed to retrieve metrics:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Metrics summary (lightweight)
app.get("/api/metrics/summary", (req, res) => {
  try {
    const summary = metricsService.getSummary();
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Alerts endpoint
app.get("/api/alerts", (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const includeAcknowledged = req.query.acknowledged === "true";
    const alerts = alertingService.getAlerts(limit, includeAcknowledged);

    res.status(200).json({
      success: true,
      data: {
        count: alerts.length,
        alerts,
      },
    });
  } catch (error) {
    logger.error("Failed to retrieve alerts:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Acknowledge alert
app.post("/api/alerts/:id/acknowledge", express.json(), (req, res) => {
  try {
    const { id } = req.params;
    const success = alertingService.acknowledgeAlert(id);

    if (success) {
      res.status(200).json({
        success: true,
        message: "Alert acknowledged",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});



// ========== Service Proxies with Rate Limiting ========== 

// Helper to create proxy with rate limiting
const createServiceProxy = (serviceKey, targetUrl, pathPrefix = null) => {
  const proxyOptions = pathPrefix
    ? {
      proxyReqPathResolver: (req) => pathPrefix + req.url,
    }
    : {};

  return [
    rateLimiterMiddleware(serviceKey),
    createMetricsProxy(serviceKey, expressProxy(targetUrl, proxyOptions)),
  ];
};

// Wrap proxy to record metrics
const createMetricsProxy = (serviceKey, proxy) => {
  return (req, res, next) => {
    const startTime = Date.now();

    // Intercept response to record metrics
    const originalEnd = res.end;
    res.end = function (...args) {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode < 500;

      metricsService.recordRequest(serviceKey, {
        success,
        statusCode: res.statusCode,
        responseTimeMs: responseTime,
      });

      serviceRegistry.recordRequest(serviceKey, {
        success,
        responseTimeMs: responseTime,
      });

      return originalEnd.apply(this, args);
    };

    proxy(req, res, next);
  };
};

// Service routes with per-service rate limiting
app.use("/api/academic", ...createServiceProxy("academic", process.env.ACADEMIC_SERVICE_URL));
app.use("/api/user", ...createServiceProxy("user", process.env.USER_SERVICE_URL));
app.use("/api/library", ...createServiceProxy("library", process.env.LIBRARY_SERVICE_URL));
app.use("/api/enrollment", ...createServiceProxy("enrollment", process.env.ENROLLMENT_SERVICE_URL));
app.use("/api/notification", ...createServiceProxy("notification", process.env.NOTIFICATION_SERVICE_URL));
app.use("/api/communication", ...createServiceProxy("communication", process.env.COMMUNICATION_SERVICE_URL));
app.use("/api/classroom", ...createServiceProxy("classroom", process.env.CLASSROOM_SERVICE_URL));

// Public assets proxy (no rate limiting)
app.use(
  "/public",
  expressProxy(process.env.USER_SERVICE_URL, {
    proxyReqPathResolver: (req) => "/public" + req.url,
  })
);

// ========== Health Check Utilities ========== 
const buildHealthUrl = (baseUrl) => {
  const url = new URL(baseUrl);
  url.pathname = "/health";
  url.search = "";
  return url.toString();
};

const mapStatusFromHttp = (httpStatus) => {
  if (httpStatus >= 200 && httpStatus < 300) return "operational";
  if (httpStatus === 401 || httpStatus === 403) return "operational";
  if (httpStatus >= 500) return "degraded";
  return "degraded";
};

const checkServiceHealth = async (service, authorizationHeader) => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.health.timeoutMs);

  try {
    const healthUrl = buildHealthUrl(service.url);
    const headers = {};
    if (authorizationHeader) {
      headers.Authorization = authorizationHeader;
    }

    const response = await fetch(healthUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    const responseTimeMs = Date.now() - startedAt;
    clearTimeout(timeoutId);

    return {
      key: service.key,
      name: service.name,
      status: mapStatusFromHttp(response.status),
      httpStatus: response.status,
      responseTimeMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      key: service.key,
      name: service.name,
      status: "down",
      httpStatus: null,
      responseTimeMs: Date.now() - startedAt,
    };
  }
};

// ========== Background Health Probe ========== 

const runBackgroundProbe = async () => {
  const services = getAvailableServices();

  const checks = await Promise.all(
    services.map((service) => checkServiceHealth(service))
  );

  for (const check of checks) {
    const result = serviceRegistry.updateHealth(check.key, check);
    if (config.alerting.enabled && result) {
      alertingService.checkAndAlert(check.key, result);
    }
  }
};

// ========== Start Server ========== 
app.listen(config.port, () => {
  logger.info(`Gateway server started on http://localhost:${config.port}`);
  logger.info(`Registered ${serviceRegistry.getAll().length} services`);

  // Background health probing
  if (config.health.probeIntervalMs > 0) {
    setInterval(() => {
      runBackgroundProbe().catch(() => { });
    }, config.health.probeIntervalMs);

    // Initial probe
    runBackgroundProbe().catch(() => { });
  }
});

export default app;

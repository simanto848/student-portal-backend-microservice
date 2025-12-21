import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../utils/logger.js";

/**
 * Middleware to add request correlation ID and logger instance to each request
 * Logs incoming requests and outgoing responses with timing information
 */
export const requestLoggerMiddleware = (serviceName = "APP") => {
  const logger = createLogger(serviceName);

  return (req, res, next) => {
    // Generate unique correlation ID for this request
    const requestId = req.headers["x-request-id"] || uuidv4();
    req.id = requestId;
    req.logger = logger;
    req.startTime = Date.now();

    // Log incoming request
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length ? req.query : undefined,
      ip: req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress,
    };

    // Skip logging for health check
    if (req.path === "/health") {
      res.set("X-Request-ID", requestId);
      return next();
    }

    logger.info(`${req.method} ${req.path}`, {
      requestId,
      method: req.method,
      path: req.path,
      ip: logData.ip,
    });

    // Capture response details
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - req.startTime;
      const statusCode = res.statusCode;

      logger.info(`${req.method} ${req.path} - ${statusCode}`, {
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        duration: `${duration}ms`,
      });

      return originalSend.call(this, data);
    };

    // Set correlation ID in response header for tracing
    res.set("X-Request-ID", requestId);

    next();
  };
};

export default requestLoggerMiddleware;

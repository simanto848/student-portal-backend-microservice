import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../utils/logger.js";

const SENSITIVE_QUERY_PARAMS = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization', 'credential'];

const sanitizeQueryParams = (query) => {
  if (!query || typeof query !== 'object') {
    return query;
  }

  const sanitized = { ...query };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_QUERY_PARAMS.some(param => key.toLowerCase().includes(param))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
};

const shouldSkipLogging = (path, skipPaths = []) => {
  const defaultSkipPaths = ['/health', '/metrics', '/favicon.ico'];
  const allSkipPaths = [...defaultSkipPaths, ...skipPaths];
  return allSkipPaths.some(skipPath => path === skipPath || path.startsWith(skipPath));
};

export const requestLoggerMiddleware = (serviceName = "APP", options = {}) => {
  const logger = createLogger(serviceName);
  const { skipPaths = [], logRequestBody = false, logResponseBody = false } = options;

  return (req, res, next) => {
    const requestId = req.headers["x-request-id"] || uuidv4();
    req.id = requestId;
    req.logger = logger.child({ requestId });
    req.startTime = Date.now();

    const clientIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;

    res.set("X-Request-ID", requestId);

    if (shouldSkipLogging(req.path, skipPaths)) {
      return next();
    }

    const requestLog = {
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length ? sanitizeQueryParams(req.query) : undefined,
      ip: clientIp,
      userAgent: req.headers['user-agent'],
    };

    if (logRequestBody && req.body && typeof req.body === 'object') {
      requestLog.bodySize = JSON.stringify(req.body).length;
    }

    logger.info(`${req.method} ${req.path}`, requestLog);

    let responseLogged = false;

    const logResponse = (statusCode, error = null) => {
      if (responseLogged) return;
      responseLogged = true;

      const duration = Date.now() - req.startTime;

      const responseLog = {
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        duration: `${duration}ms`,
      };

      if (error) {
        responseLog.error = error.message;
        logger.error(`${req.method} ${req.path} - ${statusCode}`, responseLog);
      } else if (statusCode >= 400) {
        logger.warn(`${req.method} ${req.path} - ${statusCode}`, responseLog);
      } else {
        logger.info(`${req.method} ${req.path} - ${statusCode}`, responseLog);
      }
    };

    const originalEnd = res.end;
    res.end = function (chunk, encoding, callback) {
      logResponse(res.statusCode);
      return originalEnd.call(this, chunk, encoding, callback);
    };

    res.on('finish', () => {
      logResponse(res.statusCode);
    });

    res.on('error', (error) => {
      logResponse(res.statusCode, error);
    });

    if (req.on) {
      req.on('error', (error) => {
        logResponse(res.statusCode || 500, error);
      });
    }

    next();
  };
};

export default requestLoggerMiddleware;

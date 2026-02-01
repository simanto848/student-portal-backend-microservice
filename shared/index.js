import ApiResponse, { ApiError, success, error } from "./utils/ApiResponse.js";
import { authenticate, authorize, optionalAuth } from "./middlewares/auth.js";
import validate, { validatePartial } from "./middlewares/validate.js";
import EventBus, {
  EVENTS,
  publishEvent,
  subscribeEvent,
  shutdownEventBus,
} from "./lib/eventBus.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import errorHandler, { notFoundHandler } from "./middlewares/errorHandler.js";
import rabbitmq from "./utils/rabbitmq.js";
import { createLogger, logger } from "./utils/logger.js";
import requestLoggerMiddleware from "./middlewares/requestLogger.js";
import apiStats from "./middlewares/apiStats.js";
import { createServiceClient } from "./utils/serviceClient.js";
import config from "./config/env.js";

// Models (Schemas)
import systemLogSchema, { systemLogSchemaDef, systemLogOptions } from "./models/SystemLog.js";
import apiMetricSchema from "./models/ApiMetric.js";

import MongoTransport from "./utils/MongoTransport.js";

export {
  // Utils
  ApiResponse,
  ApiError,
  success,
  error,

  // Middlewares
  authenticate,
  authorize,
  optionalAuth,
  validate,
  validatePartial,
  rateLimiter,
  errorHandler,
  notFoundHandler,
  requestLoggerMiddleware,

  // Logger
  createLogger,
  logger,
  MongoTransport,

  // Lib
  EventBus,
  EVENTS,
  publishEvent,
  subscribeEvent,
  shutdownEventBus,

  // Utils
  rabbitmq,
  createServiceClient,
  config,

  // Schemas
  systemLogSchema,
  systemLogSchemaDef, // Export def
  systemLogOptions,   // Export options
  apiMetricSchema,

  // New Middlewares
  apiStats
};

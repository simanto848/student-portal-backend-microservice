import ApiResponse, { ApiError, success, error } from './utils/ApiResponse.js';
import { authenticate, authorize, optionalAuth } from './middlewares/auth.js';
import validate, { validatePartial } from './middlewares/validate.js';
import EventBus, { EVENTS, publishEvent, subscribeEvent, shutdownEventBus } from './lib/eventBus.js';
import rateLimiter from './middlewares/rateLimiter.js';
import errorHandler, { notFoundHandler } from './middlewares/errorHandler.js';
import rabbitmq from './utils/rabbitmq.js';

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

    // Lib
    EventBus,
    EVENTS,
    publishEvent,
    subscribeEvent,
    shutdownEventBus,

    // Utils
    rabbitmq
};

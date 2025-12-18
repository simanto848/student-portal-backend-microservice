import { z } from "zod";
import ApiResponse, { ApiError } from "../utils/ApiResponse.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("ERROR_HANDLER");

const buildValidationErrors = (issues = []) =>
  issues.map((issue) => ({
    field: Array.isArray(issue.path)
      ? issue.path.join(".")
      : String(issue.path || ""),
    message: issue.message,
  }));

const formatMongooseValidation = (err) =>
  Object.values(err.errors || {}).map((e) => ({
    field: e.path,
    message: e.message,
  }));

export const notFoundHandler = (req, res) => {
  return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

export const errorHandler = (err, req, res, next) => {
  const requestId = req?.id;
  const loggerInstance = req?.logger || logger;

  if (err instanceof ApiError) {
    loggerInstance.warn(`API Error: ${err.message}`, {
      requestId,
      statusCode: err.statusCode,
      errors: err.errors,
    });
    return ApiResponse.error(res, err.message, err.statusCode, err.errors);
  }

  // Multer/file upload errors (avoid direct dependency on multer)
  if (err?.name === "MulterError") {
    const code = String(err?.code || "");
    if (code === "LIMIT_FILE_SIZE") {
      loggerInstance.warn("File upload error: File too large", { requestId });
      return ApiResponse.error(res, "Uploaded file is too large", 413);
    }
    if (code === "LIMIT_FILE_COUNT") {
      loggerInstance.warn("File upload error: Too many files", { requestId });
      return ApiResponse.badRequest(res, "Too many files uploaded");
    }
    if (code === "LIMIT_UNEXPECTED_FILE") {
      loggerInstance.warn("File upload error: Unexpected file field", {
        requestId,
      });
      return ApiResponse.badRequest(res, "Unexpected file field");
    }
    loggerInstance.warn(`File upload error: ${err.message}`, { requestId });
    return ApiResponse.badRequest(res, err.message || "File upload failed");
  }

  if (err instanceof z.ZodError) {
    loggerInstance.warn("Zod validation error", {
      requestId,
      errors: buildValidationErrors(err.issues),
    });
    return ApiResponse.validationError(
      res,
      "Validation failed",
      buildValidationErrors(err.issues)
    );
  }

  if (err?.name === "ValidationError") {
    loggerInstance.warn("Mongoose validation error", {
      requestId,
      errors: formatMongooseValidation(err),
    });
    return ApiResponse.validationError(
      res,
      "Validation failed",
      formatMongooseValidation(err)
    );
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    loggerInstance.warn(`Duplicate key error: ${field}`, { requestId });
    return ApiResponse.conflict(res, `${field} already exists`);
  }

  if (err?.name === "CastError") {
    loggerInstance.warn("Invalid resource identifier", { requestId });
    return ApiResponse.badRequest(res, "Invalid resource identifier provided");
  }

  if (err?.name === "JsonWebTokenError") {
    loggerInstance.warn("JWT validation error", { requestId });
    return ApiResponse.unauthorized(res, "Invalid authentication token");
  }

  if (err?.name === "TokenExpiredError") {
    loggerInstance.warn("JWT token expired", { requestId });
    return ApiResponse.unauthorized(res, "Authentication token has expired");
  }

  loggerInstance.error("Unhandled error", {
    requestId,
    error: err.message,
    stack: err.stack,
    name: err.name,
  });
  const message =
    process.env.NODE_ENV === "development"
      ? err.message
      : "Internal server error";
  return ApiResponse.serverError(res, message);
};

export default errorHandler;

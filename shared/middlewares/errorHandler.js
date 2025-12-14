import { z } from "zod";
import ApiResponse, { ApiError } from "../utils/ApiResponse.js";

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
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.message, err.statusCode, err.errors);
  }

  // Multer/file upload errors (avoid direct dependency on multer)
  if (err?.name === "MulterError") {
    const code = String(err?.code || "");
    if (code === "LIMIT_FILE_SIZE") {
      return ApiResponse.error(res, "Uploaded file is too large", 413);
    }
    if (code === "LIMIT_FILE_COUNT") {
      return ApiResponse.badRequest(res, "Too many files uploaded");
    }
    if (code === "LIMIT_UNEXPECTED_FILE") {
      return ApiResponse.badRequest(res, "Unexpected file field");
    }
    return ApiResponse.badRequest(res, err.message || "File upload failed");
  }

  if (err instanceof z.ZodError) {
    return ApiResponse.validationError(
      res,
      "Validation failed",
      buildValidationErrors(err.issues)
    );
  }

  if (err?.name === "ValidationError") {
    return ApiResponse.validationError(
      res,
      "Validation failed",
      formatMongooseValidation(err)
    );
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return ApiResponse.conflict(res, `${field} already exists`);
  }

  if (err?.name === "CastError") {
    return ApiResponse.badRequest(res, "Invalid resource identifier provided");
  }

  if (err?.name === "JsonWebTokenError") {
    return ApiResponse.unauthorized(res, "Invalid authentication token");
  }

  if (err?.name === "TokenExpiredError") {
    return ApiResponse.unauthorized(res, "Authentication token has expired");
  }

  console.error("Unhandled error:", err);
  const message =
    process.env.NODE_ENV === "development"
      ? err.message
      : "Internal server error";
  return ApiResponse.serverError(res, message);
};

export default errorHandler;

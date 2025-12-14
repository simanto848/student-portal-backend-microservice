import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import apiRoutes from "./routes/index.js";
import { ApiResponse, ApiError } from "shared";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/", apiRoutes);

app.get("/health", (req, res) => {
  return res
    .status(200)
    .json({
      message: "Classroom Service Healthy",
      status: true,
      statusCode: 200,
    });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.message, err.statusCode, err.errors);
  }

  // Multer/file upload errors
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

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiResponse.validationError(res, "Validation failed", errors);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return ApiResponse.conflict(res, `${field} already exists`);
  }

  if (err.name === "CastError") {
    return ApiResponse.badRequest(res, "Invalid ID format");
  }

  console.error("Unhandled error:", err);
  return ApiResponse.serverError(
    res,
    process.env.NODE_ENV === "development"
      ? err.message
      : "Internal server error"
  );
});

export default app;

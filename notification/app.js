import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import apiRoutes from "./routes/index.js";
import {
  ApiResponse,
  ApiError,
  authenticate,
  errorHandler,
  requestLoggerMiddleware,
} from "shared";

dotenv.config();

const app = express();

// Request Logger Middleware - Add at the top
app.use(requestLoggerMiddleware("NOTIFICATION"));

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

app.use("/", apiRoutes);

app.get("/health", authenticate, (req, res) => {
  return ApiResponse.success(
    res,
    { service: "notification", time: new Date().toISOString() },
    "Notification Service Healthy"
  );
});

// Global Error Handler
app.use(errorHandler);

export default app;

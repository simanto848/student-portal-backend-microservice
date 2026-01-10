import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes/index.js";
import {
  ApiResponse,
  ApiError,
  errorHandler,
  requestLoggerMiddleware,
} from "shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Request Logger Middleware - Add at the top
app.use(requestLoggerMiddleware("CLASSROOM"));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(morgan("dev"));

// Serve static files from public/uploads directory
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Routes
app.use("/", apiRoutes);

app.get("/health", (req, res) => {
  return res.status(200).json({
    message: "Classroom Service Healthy",
    status: true,
    statusCode: 200,
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

export default app;

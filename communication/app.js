import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/index.js";
import {
  ApiResponse,
  ApiError,
  errorHandler,
  requestLoggerMiddleware,
} from "shared";

const app = express();

// Request Logger Middleware - Add at the top
app.use(requestLoggerMiddleware("COMMUNICATION"));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/", apiRoutes);

app.get("/health", (req, res) => {
  try {
    res.status(200).json({
      message: "Welcome to Communication Service",
      status: true,
      statusCode: 200,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500,
    });
  }
});

// Global Error Handler Middleware
app.use(errorHandler);

export default app;

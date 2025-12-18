import express from "express";
import cors from "cors";
import apiRoutes from "./routes/index.js";
import {
  ApiResponse,
  ApiError,
  errorHandler,
  requestLoggerMiddleware,
} from "shared";
import cookieParser from "cookie-parser";

const app = express();

// Request Logger Middleware - Add at the top
app.use(requestLoggerMiddleware("ACADEMIC"));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/", apiRoutes);

app.get("/health", (req, res) => {
  try {
    res.status(200).json({
      message: "Welcome to Academic Service",
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

// Global Error Handler Middleware (must be last)
app.use(errorHandler);

export default app;

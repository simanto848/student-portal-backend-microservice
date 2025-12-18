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
app.use(requestLoggerMiddleware("USER"));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/public", express.static("public"));

// Routes
app.use("/", apiRoutes);

app.get("/health", (req, res) => {
  try {
    res.status(200).json({
      message: "Welcome to User Service",
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

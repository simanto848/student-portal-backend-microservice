import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import connectDB from "./config/database.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler, requestLoggerMiddleware } from "shared";

config();

const app = express();

// Request Logger Middleware - Add at the top
app.use(requestLoggerMiddleware("LIBRARY"));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Connect to MongoDB
connectDB();

// Middlewares
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Library service is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/", routes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

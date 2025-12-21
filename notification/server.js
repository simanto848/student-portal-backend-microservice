import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import schedulingService from "./services/schedulingService.js";
import { initRedis } from "./utils/redisClient.js";
import subscribeToStudentEvents from "./subscribers/studentSubscriber.js";
import { createLogger } from "shared";

dotenv.config();

const logger = createLogger("NOTIFICATION");
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 8007;

// Check email configuration
function checkEmailConfig() {
  const requiredEmailVars = ["MAIL_USER", "MAIL_PASS"];
  const missingVars = requiredEmailVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    logger.warn("WARNING: Email sending is NOT configured!", {
      missingVars: missingVars.join(", "),
    });
    logger.info("Notifications will be delivered via socket only.");
    logger.info("To enable email notifications, set the following:", {
      required: [
        "MAIL_HOST",
        "MAIL_PORT",
        "MAIL_USER",
        "MAIL_PASS",
        "MAIL_FROM",
      ],
    });
    return false;
  }

  logger.info("Email configuration found", {
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: process.env.MAIL_PORT || "587",
    from: process.env.MAIL_FROM || "EDUCATION HUB",
    gateway: process.env.GATEWAY_URL || "http://localhost:8000",
  });
  return true;
}

async function start() {
  try {
    logger.info("Starting Notification Service...");

    // Check email configuration
    const emailConfigured = checkEmailConfig();

    // Connect to database
    logger.info("Connecting to MongoDB...");
    await connectDB();
    logger.info("Connected to MongoDB");

    // Initialize Redis
    logger.info("Initializing Redis connection...");
    await initRedis();
    logger.info("Redis initialized");

    // Create HTTP server and initialize Socket.IO
    const server = http.createServer(app);
    initSocket(server);
    logger.info("Socket.IO initialized");

    // Start scheduling service for scheduled notifications
    schedulingService.start();
    logger.info("Scheduling service started");

    // Subscribe to student events
    await subscribeToStudentEvents();
    logger.info("Subscribed to student events");

    // Start listening
    server.listen(PORT, () => {
      logger.info(`Notification service running on port ${PORT}`, {
        emailNotifications: emailConfigured ? "ENABLED" : "DISABLED",
      });
    });
  } catch (err) {
    logger.error("Failed to start notification service", {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

start();

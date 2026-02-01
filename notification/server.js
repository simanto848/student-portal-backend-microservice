import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import schedulingService from "./services/schedulingService.js";
import { initRedis } from "./utils/redisClient.js";
import subscribeToStudentEvents from "./subscribers/studentSubscriber.js";
import { createLogger, MongoTransport, systemLogSchemaDef, systemLogOptions, config } from "shared";
import mongoose from "mongoose";

dotenv.config();

const logger = createLogger("NOTIFICATION");
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 8007;

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
    host: config.email.host || "smtp.gmail.com",
    port: config.email.port || "587",
    from: config.email.from || "EDUCATION HUB",
    gateway: config.services.gateway || "http://localhost:8000",
  });
  return true;
}

async function start() {
  try {
    logger.info("Starting Notification Service...");
    const emailConfigured = checkEmailConfig();

    logger.info("Connecting to MongoDB...");
    await connectDB();
    logger.info("Connected to MongoDB");

    try {
      let userDbUri = (config.services.notification || "").replace("notification_service", "user_service");
      if (!userDbUri || userDbUri === config.db.user) {
        userDbUri = config.db.user;
      }

      const logConnection = mongoose.createConnection(userDbUri);
      const localSchema = new mongoose.Schema(systemLogSchemaDef, systemLogOptions);
      const SystemLog = logConnection.model("SystemLog", localSchema);

      logger.add(new MongoTransport({ model: SystemLog, level: 'info' }));
      logger.info(`Connected to centralized log database at ${userDbUri}`);
    } catch (err) {
      logger.error("Failed to setup centralized logging:", err);
    }

    logger.info("Initializing Redis connection...");
    await initRedis();
    logger.info("Redis initialized");
    const server = http.createServer(app);
    initSocket(server);
    logger.info("Socket.IO initialized");

    schedulingService.start();
    logger.info("Scheduling service started");

    await subscribeToStudentEvents();
    logger.info("Subscribed to student events");

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

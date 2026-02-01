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
const PORT = config.ports.notification;

function checkEmailConfig() {
  const missingKeys = [];
  if (!config.email.user) missingKeys.push("MAIL_USER");
  if (!config.email.pass) missingKeys.push("MAIL_PASS");

  if (missingKeys.length > 0) {
    logger.warn("WARNING: Email sending configuration is NOT configured!", {
      missingVars: missingKeys.join(", "),
    });
    return false;
  }

  logger.info("Email configuration found");
  return true;
}

async function start() {
  try {
    logger.info("Starting Notification Service...");
    const emailConfigured = checkEmailConfig();
    await connectDB();

    try {
      let userDbUri = config.db.user;
      if (!userDbUri) {
        userDbUri = "mongodb://localhost:27017/student_portal_user_service";
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

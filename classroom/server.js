import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import { startDueReminderJob } from "./cron/dueReminderJob.js";
import { startQuizNotificationJob } from "./cron/quizNotificationJob.js";
import { createLogger, MongoTransport, systemLogSchemaDef, systemLogOptions, config } from "shared";
import mongoose from "mongoose";

dotenv.config();

const logger = createLogger("CLASSROOM");

const server = http.createServer(app);

const PORT = process.env.PORT || 8003;

server.listen(PORT, async () => {
  await connectDB();
  initSocket(server);
  startDueReminderJob();
  startQuizNotificationJob();

  // LOGGING SETUP
  try {
    const dbUri = config.db.classroom || "";
    const userDbUri = dbUri.replace("classroom_service", "user_service");
    if (userDbUri) {
      const logConnection = mongoose.createConnection(userDbUri);
      const localSchema = new mongoose.Schema(systemLogSchemaDef, systemLogOptions);
      const SystemLog = logConnection.model("SystemLog", localSchema);

      logger.add(new MongoTransport({ model: SystemLog, level: 'info' }));
      logger.info("Connected to centralized log database");
    }
  } catch (err) {
    logger.error("Failed to setup centralized logging:", err);
  }

  logger.info(`Server started on port http://localhost:${PORT}`);
});

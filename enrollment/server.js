import http from "http";
import app from "./app.js";
import { createLogger, MongoTransport, systemLogSchemaDef, systemLogOptions, config } from "shared";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const logger = createLogger("ENROLLMENT");

const server = http.createServer(app);

const PORT = process.env.PORT || 8005;

server.listen(PORT, async () => {
  // LOGGING SETUP
  try {
    const dbUri = config.db.enrollment || "";
    const userDbUri = dbUri.replace("enrollment_service", "user_service");
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

import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import { createLogger, MongoTransport, systemLogSchemaDef, systemLogOptions, config } from "shared";
import mongoose from "mongoose";

dotenv.config();

const logger = createLogger("COMMUNICATION");

const server = http.createServer(app);

import { initSocket } from "./socket.js";

const PORT = config.ports.communication;

server.listen(PORT, async () => {
  await connectDB();
  initSocket(server);

  // LOGGING SETUP
  try {
    const dbUri = config.db.communication || "";
    const userDbUri = dbUri.includes("communication_service")
      ? dbUri.replace("communication_service", "user_service")
      : dbUri.replace("communication", "student_portal_user_service");

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

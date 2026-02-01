import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./configs/db.js";
import { createLogger, config, MongoTransport, systemLogSchemaDef, systemLogOptions } from "shared";
import mongoose from "mongoose";

dotenv.config();

const logger = createLogger("ACADEMIC");

const server = http.createServer(app);

const PORT = config.ports.academic;

server.listen(PORT, async () => {
  await connectDB();

  let SystemLog;
  try {
    const userDbUri = config.db.user;
    const logConnection = mongoose.createConnection(userDbUri);

    const localSchema = new mongoose.Schema(systemLogSchemaDef, systemLogOptions);

    SystemLog = logConnection.model("SystemLog", localSchema);
    logger.info("Connected to centralized log database");
  } catch (err) {
    logger.error("Failed to connect to log DB, falling back to local:", err);
    const localSchema = new mongoose.Schema(systemLogSchemaDef, systemLogOptions);
    SystemLog = mongoose.model("SystemLog", localSchema);
  }
  const mongoTransport = new MongoTransport({
    model: SystemLog,
    level: 'info'
  });
  logger.add(mongoTransport);

  logger.info(`Academic Service started on port http://localhost:${PORT}`);
});

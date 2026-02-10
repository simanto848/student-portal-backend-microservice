import http from "http";
import app from "./app.js";
import setupEmailSubscriber from "./subscribers/emailSubscriber.js";
import notificationService from "./services/notificationService.js";
import { createLogger, MongoTransport, systemLogSchemaDef, systemLogOptions, config } from "shared";
import mongoose from "mongoose";

const logger = createLogger("LIBRARY");

const server = http.createServer(app);

const PORT = config.ports.library;

server.listen(PORT, async () => {
  // LOGGING SETUP
  try {
    let userDbUri = (config.db.library || "").replace("library_service", "user_service");
    if (!userDbUri || userDbUri === config.db.user) {
      userDbUri = config.db.user;
    }

    const logConnection = mongoose.createConnection(userDbUri);
    logConnection.on('error', (err) => logger.error("Log DB Connection Error:", err));
    logConnection.on('open', () => logger.info("Log DB Connection OPEN"));

    const localSchema = new mongoose.Schema(systemLogSchemaDef, systemLogOptions);
    const SystemLog = logConnection.model("SystemLog", localSchema);

    logger.add(new MongoTransport({ model: SystemLog, level: 'info' }));
    logger.info(`Connected to centralized log database at ${userDbUri}`);
    logger.info("Added MongoTransport to Library Logger");
  } catch (err) {
    logger.error("Failed to setup centralized logging:", err);
  }

  try {
    await setupEmailSubscriber();
  } catch (e) {
    logger.error("Failed to setup email subscriber:", e);
  }
  notificationService.startScheduledJobs();

  logger.info(`Library service started on http://localhost:${PORT}`);
  logger.info("Library Server Started message logged");
});

import http from "http";
import colors from "colors";
import app from "./app.js";
import setupEmailSubscriber from "./subscribers/emailSubscriber.js";
import notificationService from "./services/notificationService.js";
import { createLogger } from "shared";

const logger = createLogger("LIBRARY");

const server = http.createServer(app);

const PORT = process.env.PORT || 8006;

server.listen(PORT, async () => {
  await setupEmailSubscriber();
  notificationService.startScheduledJobs();
  logger.info(`Library service started on http://localhost:${PORT}`);
});

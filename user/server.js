import "dotenv/config";
import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { createLogger, apiStats, config } from "shared";
import ApiMetric from "./models/ApiMetric.js";

const logger = createLogger("USER");

const server = http.createServer(app);

app.use(apiStats("user", ApiMetric));

import { MongoTransport } from "shared";
import SystemLog from "./models/SystemLog.js";
const mongoTransport = new MongoTransport({
  model: SystemLog,
  level: 'info'
});

logger.add(mongoTransport);

const seedLogs = async () => {
  try {
    const count = await SystemLog.countDocuments();
    if (count === 0) {
      logger.info("System initialized", { component: "server", action: "startup" });
      logger.warn("Memory notice", { component: "system", memory: "checking" });
      logger.error("Test error for dashboard", { component: "test", details: "sample error" });
      logger.info("User service ready to accept connections");
    }
  } catch (e) {
    logger.error("Failed to seed logs", e);
  }
};

const PORT = config.ports.user;

server.listen(PORT, async () => {
  await connectDB();
  await seedLogs();
  logger.info(`Server started on port http://localhost:${PORT}`);
});

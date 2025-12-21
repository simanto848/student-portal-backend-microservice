import http from "http";
import dotenv from "dotenv";
import colors from "colors";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import { startDueReminderJob } from "./cron/dueReminderJob.js";
import { createLogger } from "shared";

dotenv.config();

const logger = createLogger("CLASSROOM");

const server = http.createServer(app);

const PORT = process.env.PORT || 8003;

server.listen(PORT, async () => {
  await connectDB();
  initSocket(server);
  startDueReminderJob();
  logger.info(`Server started on port http://localhost:${PORT}`);
});

import http from "http";
import dotenv from "dotenv";
import colors from "colors";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from './socket.js';
import { startDueReminderJob } from './cron/dueReminderJob.js';

dotenv.config();

const server = http.createServer(app);

const PORT = process.env.PORT || 8011;

server.listen(PORT, async () => {
    await connectDB();
    initSocket(server);
    startDueReminderJob();
    console.log(`Server started on port http://localhost:${PORT}`.green);
});
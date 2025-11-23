import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import connectDB from "./config/db.js";
import { initSocket } from './socket.js';
import schedulingService from './services/schedulingService.js';
import { initRedis } from './utils/redisClient.js';

dotenv.config();

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 8010;

async function start() {
  try {
      await connectDB();
      await initRedis();

      const server = http.createServer(app);
      initSocket(server);
      schedulingService.start();

      server.listen(PORT, () => {
          console.log(`Notification service running on port ${PORT}`);
      });
  } catch (err) {
      console.error('Failed to start notification service:', err);
      process.exit(1);
  }
}

start();

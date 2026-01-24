import http from "http";
import dotenv from "dotenv";
import colors from "colors";
import app from "./app.js";
import connectDB from "./configs/db.js";
import { createLogger, config } from "shared";

dotenv.config();

const logger = createLogger("ACADEMIC");

const server = http.createServer(app);

const PORT = config.ports.academic;

server.listen(PORT, async () => {
  await connectDB();
  logger.info(`Academic Service started on port http://localhost:${PORT}`);
});

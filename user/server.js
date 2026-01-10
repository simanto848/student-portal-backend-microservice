import "dotenv/config";
import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { createLogger } from "shared";

const logger = createLogger("USER");

const server = http.createServer(app);

const PORT = process.env.PORT || 8007;

server.listen(PORT, async () => {
  await connectDB();
  logger.info(`Server started on port http://localhost:${PORT}`);
});

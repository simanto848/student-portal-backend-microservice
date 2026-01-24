import http from "http";
import app from "./app.js";
import { createLogger } from "shared";

const logger = createLogger("ENROLLMENT");

const server = http.createServer(app);

const PORT = process.env.PORT || 8005;

server.listen(PORT, () => {
  logger.info(`Server started on port http://localhost:${PORT}`);
});

import http from "http";
import dotenv from "dotenv"
import colors from "colors";
import app from "./app.js";
import connectDB from "./config/db.js";
dotenv.config();

const server = http.createServer(app);

import { initSocket } from "./socket.js";

const PORT = process.env.PORT || 8007;

server.listen(PORT, async () => {
    await connectDB();
    initSocket(server);
    console.log(`Server started on port http://localhost:${PORT}`.green);
});
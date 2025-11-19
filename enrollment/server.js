import http from "http";
import { config } from "dotenv";
import app from "./app.js";
import connectDB from "./configs/db.js";

config();
const server = http.createServer(app);

const PORT = process.env.PORT || 3003;

server.listen(PORT, async () => {
    await connectDB();
    console.log(`Enrollment Service started on port http://localhost:${PORT}`);
});
import http from "http";
import dotenv from "dotenv"
import colors from "colors";
import app from "./app.js";
import connectDB from "./configs/db.js";

dotenv.config();

const server = http.createServer(app);

const PORT = process.env.PORT || 8001;

server.listen(PORT, async () => {
    await connectDB();
    console.log(`Academic Service started on port http://localhost:${PORT}`.green);
});
import http from "http";
import dotenv from "dotenv"
import app from "./app.js";
import connectDB from "./config/db.js";
dotenv.config();

const server = http.createServer(app);

const PORT = process.env.PORT || 8007;

app.get("/health", (req, res) => {
    try {
        res.status(200).json({
            message: "Welcome to User Service",
            status: true,
            statusCode: 200
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
            status: false,
            statusCode: 500
        })
    }
})

server.listen(PORT, async () => {
    await connectDB();
    console.log(`Server started on port http://localhost:${PORT}`);
});
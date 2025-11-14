import express from "express";
import { config } from "dotenv";

config();
const app = express();

app.get("/health", (req, res) => {
    try {
        res.status(200).json({
            message: "Welcome to Accademic Service",
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

export default app;
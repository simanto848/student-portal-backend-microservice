import express from "express";
import expressProxy from "express-http-proxy";
import colors from "colors";
import { config } from "dotenv";

config();

const app = express();

const PORT = process.env.PORT || 8000;

app.use('/api/academic', expressProxy('http://localhost:8001'));

app.listen(PORT, () => {
    console.log(`Gateway server started on http://localhost:${PORT}`.green.underline.bold);
})
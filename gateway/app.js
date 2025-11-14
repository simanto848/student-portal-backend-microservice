import express from "express";
import expressProxy from "express-http-proxy";
import morgan from "morgan";
import { config } from "dotenv";
import colors from "colors";

config();

const app = express();
app.use(morgan("dev"));

const PORT = process.env.PORT || 8000;

app.use('/api/academic', expressProxy('http://localhost:8001'));

app.listen(PORT, () => {
    console.log(`Gateway server started on http://localhost:${PORT}`.green.underline.bold);
})
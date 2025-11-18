import express from "express";
import expressProxy from "express-http-proxy";
import morgan from "morgan";
import { config } from "dotenv";
import colors from "colors";

config();

const app = express();
app.use(morgan("dev"));

const PORT = process.env.PORT || 8000;

app.use('/api/academic', expressProxy(process.env.ACADEMIC_SERVICE_URL));
app.use('/api/user', expressProxy(process.env.USER_SERVICE_URL));
app.use('/api/library', expressProxy(process.env.LIBRARY_SERVICE_URL));
app.use('/api/enrollment', expressProxy(process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:3003'));

app.listen(PORT, () => {
    console.log(`Gateway server started on http://localhost:${PORT}`.green.underline.bold);
})
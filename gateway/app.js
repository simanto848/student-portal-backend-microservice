import express from "express";
import expressProxy from "express-http-proxy";
import morgan from "morgan";
import { config } from "dotenv";
import colors from "colors";
import cors from "cors";

config();

const app = express();
app.use(morgan("dev"));
app.use(cors({
    origin: true,
    credentials: true
}));

const PORT = process.env.PORT || 8000;

app.use('/api/academic', expressProxy(process.env.ACADEMIC_SERVICE_URL));
app.use('/api/user', expressProxy(process.env.USER_SERVICE_URL));
app.use('/api/library', expressProxy(process.env.LIBRARY_SERVICE_URL));
app.use('/api/enrollment', expressProxy(process.env.ENROLLMENT_SERVICE_URL));
app.use('/api/notification', expressProxy(process.env.NOTIFICATION_SERVICE_URL));
app.use('/api/communication', expressProxy(process.env.COMMUNICATION_SERVICE_URL));
app.use('/api/classroom', expressProxy(process.env.CLASSROOM_SERVICE_URL));

app.listen(PORT, () => {
    console.log(`Gateway server started on http://localhost:${PORT}`.green.underline.bold);
});

export default app;
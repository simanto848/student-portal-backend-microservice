import http from "http";
import colors from "colors";
import app from "./app.js";
import setupEmailSubscriber from "./subscribers/emailSubscriber.js";

const server = http.createServer(app);

const PORT = process.env.PORT || 8008;

server.listen(PORT, async () => {
    await setupEmailSubscriber();
    console.log(`Library service started on http://localhost:${PORT}`.green.underline.bold);
});
import http from "http";
import colors from "colors";
import app from "./app.js";

const server = http.createServer(app);

const PORT = process.env.PORT || 8008;

server.listen(PORT, () => {
    console.log(`Library service started on http://localhost:${PORT}`.green.underline.bold);
});
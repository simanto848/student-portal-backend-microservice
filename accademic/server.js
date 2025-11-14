import http from "http";
import app from "./app.js";

const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server started on port http://localhost:${PORT}`);
});
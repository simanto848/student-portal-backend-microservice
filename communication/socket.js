import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
        }
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on("join_chat", (chatGroupId) => {
            socket.join(chatGroupId);
            console.log(`User ${socket.id} joined chat: ${chatGroupId}`);
        });

        socket.on("leave_chat", (chatGroupId) => {
            socket.leave(chatGroupId);
            console.log(`User ${socket.id} left chat: ${chatGroupId}`);
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

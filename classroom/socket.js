import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
  io = new Server(server, { cors: { origin: '*', methods: ['GET','POST','PATCH','DELETE'] } });
  
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) socket.data.user = jwt.decode(token);
      next();
    } catch (e) { next(); }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (user?.id) socket.join(`user:${user.id}`);
  });
  
  return io;
};

export const getIO = () => { if (!io) throw new Error('Socket not initialized'); return io; };


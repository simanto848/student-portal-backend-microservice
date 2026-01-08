import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import redis from './utils/redisClient.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [process.env.NEXT_PUBLIC_CLIENT_URL],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next();
      const decoded = jwt.decode(token);
      if (decoded) socket.data.user = decoded;
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user;
    if (user) {
      const roomsToJoin = [];
      roomsToJoin.push(`user:${user.id}`);
      if (user.role) roomsToJoin.push(`role:${user.role}`);
      if (user.departmentId) roomsToJoin.push(`department:${user.departmentId}`);
      if (user.batchId) roomsToJoin.push(`batch:${user.batchId}`);

      roomsToJoin.push('all');
      for (const r of roomsToJoin) socket.join(r);
      try {
        await redis.sadd(`socket:rooms:${socket.id}`, roomsToJoin);
      } catch (e) {
        // ignore
      }
    }
    socket.on('disconnect', async () => {
      try {
        await redis.del(`socket:rooms:${socket.id}`);
      } catch (e) {
        // ignore
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitNotificationPublished = (notification, recipientRooms) => {
  const socket = getIO();
  recipientRooms.forEach((room) => {
    socket.to(room).emit('notification.published', notification);
  });
};

export const emitNotificationEvent = (event, payload, rooms = []) => {
  const socket = getIO();
  if (!rooms.length) {
    socket.emit(event, payload);
  } else {
    rooms.forEach((room) => socket.to(room).emit(event, payload));
  }
};

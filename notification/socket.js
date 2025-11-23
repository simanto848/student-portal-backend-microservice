import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    }
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

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (user) {
      socket.join(`user:${user.id}`);
      if (user.role) socket.join(`role:${user.role}`);
      if (user.departmentId) socket.join(`department:${user.departmentId}`);
      if (user.batchId) socket.join(`batch:${user.batchId}`);
      socket.join('all');
    }

    socket.on('join_custom_room', (room) => socket.join(room));
    socket.on('leave_custom_room', (room) => socket.leave(room));

    socket.on('disconnect', () => {
      // cleanup
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

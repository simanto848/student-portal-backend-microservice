import { getIO } from '../socket.js';

export const emitWorkspace = (workspaceId, event, payload) => {
  try { getIO().to(`workspace:${workspaceId}`).emit(event, payload); } catch {}
};
export const emitUser = (userId, event, payload) => {
  try { getIO().to(`user:${userId}`).emit(event, payload); } catch {}
};


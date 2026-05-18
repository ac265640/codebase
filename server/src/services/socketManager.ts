import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/tokens';

let io: Server;

export function initSocket(httpServer: HttpServer): void {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) return next(new Error('No token'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Each user joins their own room — emit to io.to(userId)
    socket.join(socket.data.userId);
    socket.on('disconnect', () => {});
  });
}

export function getIO(): Server {
  if (!io) throw new Error('Socket not initialized');
  return io;
}

// Helper used by embed service
export function emitToUser(userId: string, event: string, data: unknown): void {
  getIO().to(userId).emit(event, data);
}

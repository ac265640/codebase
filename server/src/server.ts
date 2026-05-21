import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import mongoose from 'mongoose';
import { app } from './app';
import { connectDB } from './config/db';
import { initSocket } from './services/socketManager';
import './workers/embedWorker'; // Initialize BullMQ worker
import { embedWorker } from './workers/embedWorker';

const PORT = process.env.PORT || 5001;

async function start() {
  await connectDB();
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down');
  try {
    await embedWorker.close();
    console.log('Worker closed successfully');
  } catch (err) {
    console.error('Error closing worker:', err);
  }
  await mongoose.connection.close();
  process.exit(0);
});

start().catch(console.error);

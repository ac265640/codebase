import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import mongoose from 'mongoose';
import { app } from './app';
import { connectDB } from './config/db';
import { initSocket } from './services/socketManager';

const PORT = process.env.PORT || 5000;

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
  await mongoose.connection.close();
  process.exit(0);
});

start().catch(console.error);

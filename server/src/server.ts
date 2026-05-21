import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import mongoose from 'mongoose';
import { app } from './app';
import { connectDB } from './config/db';
import { initSocket } from './services/socketManager';
import './workers/embedWorker'; // Initialize BullMQ worker
import { embedWorker } from './workers/embedWorker';
import { verifyEmailConfig } from './services/emailService';
import fs from 'fs';
import path from 'path';
import { deleteCollection } from './services/embedService';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  await connectDB();
  await verifyEmailConfig();
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

process.on('SIGTERM', async () => {
  console.log('[SIGTERM] Shutting down gracefully...');
  try {
    await embedWorker.close();
    console.log('Worker closed successfully');
  } catch (err) {
    console.error('Error closing worker:', err);
  }
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[SIGINT] Shutting down gracefully...');
  try {
    await embedWorker.close();
    console.log('Worker closed successfully');
  } catch (err) {
    console.error('Error closing worker:', err);
  }
  await mongoose.connection.close();
  process.exit(0);
});

// Clean up guest data older than 2 hours every 30 minutes
setInterval(async () => {
  try {
    const reposDir = path.resolve(process.env.REPOS_DIR || './repos');
    if (!fs.existsSync(reposDir)) return;

    // Find all guest_* directories
    const entries = fs.readdirSync(reposDir, { withFileTypes: true });
    const guestEntries = entries.filter(e => e.isDirectory() && e.name.startsWith('guest_'));
    const cutoff = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago

    for (const entry of guestEntries) {
      const dirPath = path.join(reposDir, entry.name);
      const stat = fs.statSync(dirPath);
      if (stat.mtimeMs < cutoff) {
        const guestId = entry.name;
        // List repository directories inside this guest directory
        let repoSlugs: string[] = [];
        try {
          repoSlugs = fs.readdirSync(dirPath).filter(f => {
            return fs.statSync(path.join(dirPath, f)).isDirectory();
          });
        } catch (readErr) {
          console.error(`[GuestCleanup] Failed to read subdirs of ${entry.name}:`, readErr);
        }

        // Clean up vectors in Chroma for each repository
        for (const slug of repoSlugs) {
          try {
            await deleteCollection(guestId, slug);
            console.log(`[GuestCleanup] Removed Chroma collection for ${guestId} - ${slug}`);
          } catch (chromaErr) {
            console.error(`[GuestCleanup] Failed to remove Chroma collection for ${guestId} - ${slug}:`, chromaErr);
          }
        }

        // Clean up disk files
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`[GuestCleanup] Removed stale guest dir: ${entry.name}`);
      }
    }
  } catch (err) {
    console.error('[GuestCleanup] Error:', err);
  }
}, 30 * 60 * 1000); // every 30 minutes

start().catch(console.error);

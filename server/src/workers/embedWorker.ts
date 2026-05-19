import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { Repository } from '../models/Repository';
import { cloneRepo } from '../services/gitService';
import { getEmbeddableFiles } from '../services/fileService';
import { embedFiles } from '../services/embedService';
import { emitToUser } from '../services/socketManager';
import { EmbedJobData } from '../utils/jobQueue';

export const embedWorker = new Worker<EmbedJobData>(
  'embedQueue',
  async (job: Job<EmbedJobData>) => {
    const { userId, repoId, repoUrl, repoSlug } = job.data;

    try {
      // Stage 1: Clone
      await Repository.findByIdAndUpdate(repoId, { embeddingStatus: 'processing', embeddingProgress: 10 });
      emitToUser(userId, 'embed-progress', { repoId, progress: 10, stage: 'cloning' });

      await cloneRepo(userId, repoUrl, repoSlug);
      emitToUser(userId, 'embed-progress', { repoId, progress: 35, stage: 'cloned' });

      // Stage 2: Parse files
      await Repository.findByIdAndUpdate(repoId, { embeddingProgress: 40 });
      emitToUser(userId, 'embed-progress', { repoId, progress: 40, stage: 'parsing' });
      const files = await getEmbeddableFiles(userId, repoSlug);

      if (files.length === 0) {
        throw new Error('No embeddable files found in this repository');
      }

      // Stage 3: Embed with progress updates
      emitToUser(userId, 'embed-progress', { repoId, progress: 45, stage: 'embedding' });
      const { fileCount, chunkCount } = await embedFiles(userId, repoSlug, files, (pct) => {
        // Map embed progress (0-100) to overall progress (45-95)
        const overall = 45 + Math.round(pct * 0.5);
        emitToUser(userId, 'embed-progress', { repoId, progress: overall, stage: 'embedding' });
      });

      await Repository.findByIdAndUpdate(repoId, {
        embeddingStatus: 'done',
        embeddingProgress: 100,
        fileCount,
        chunkCount,
        lastEmbeddedAt: new Date(),
      });

      emitToUser(userId, 'embed-progress', { repoId, progress: 100, stage: 'done' });
    } catch (err) {
      await Repository.findByIdAndUpdate(repoId, {
        embeddingStatus: 'failed',
        errorMessage: String(err),
      });
      emitToUser(userId, 'embed-progress', { repoId, progress: 0, stage: 'failed', error: String(err) });
      throw err; // So BullMQ registers it as a failed job
    }
  },
  { connection: redisConnection }
);

embedWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

embedWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});

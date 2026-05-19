import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

// Define the shape of our job data
export interface EmbedJobData {
  userId: string;
  repoId: string;
  repoUrl: string;
  repoSlug: string;
}

// Create the BullMQ queue
export const embedQueue = new Queue<EmbedJobData>('embedQueue', {
  connection: redisConnection,
});

export function enqueue(id: string, data: EmbedJobData) {
  // Use the ID as the jobId to prevent duplicates if desired
  embedQueue.add('embedRepo', data, { jobId: id });
}

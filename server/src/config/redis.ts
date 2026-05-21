import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const isTls = REDIS_URL.startsWith('rediss://');

export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

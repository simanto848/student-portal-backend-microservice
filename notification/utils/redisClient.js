import { config } from 'shared';
import Redis from 'ioredis';

const redisUrl = config.redis.url;
const redis = new Redis(redisUrl, { lazyConnect: true });

export async function initRedis() {
  try {
    await redis.connect();
    console.log('Redis connected (notification service)');
  } catch (e) {
    console.error('Redis connection failed', e.message);
  }
}

export default redis;


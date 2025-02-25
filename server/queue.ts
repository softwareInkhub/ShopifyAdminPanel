import Queue from 'bull';
import { shopifyClient, ORDERS_QUERY, PRODUCTS_QUERY } from './shopify';
import { storage } from './storage';
import { db } from './firebase';
import type { Job } from '@shared/schema';

// Queue configuration with better error handling
let jobQueue: Queue.Queue | null = null;

export async function initializeQueue() {
  try {
    jobQueue = new Queue('shopify-sync', {
      redis: {
        port: 6379,
        host: '127.0.0.1',
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('Redis connection failed after 3 retries');
            return null; // Stop retrying
          }
          return Math.min(times * 1000, 3000);
        },
        enableReadyCheck: false
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: false
      }
    });

    // Set up event handlers
    jobQueue.on('error', (error) => {
      console.error('Queue error:', error);
    });

    jobQueue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed with error:`, err);
    });

    jobQueue.on('stalled', (job) => {
      console.warn(`Job ${job.id} is stalled`);
    });

    // Process jobs
    jobQueue.process('sync-shopify', async (job) => {
      const { type, jobId } = job.data as { type: 'orders' | 'products', jobId: number };
      let hasMore = true;
      let cursor: string | undefined;
      let processed = 0;

      try {
        while (hasMore) {
          const result = await processBatch(type, cursor);
          hasMore = result.hasMore;
          cursor = result.cursor;
          processed += 50;

          // Update progress
          const progress = Math.min(processed, 100);
          await job.progress(progress);

          await storage.updateJob(jobId, {
            progress,
            status: 'processing'
          }).catch(err => console.error(`Failed to update job ${jobId} progress:`, err));

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await storage.updateJob(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date()
        });
      } catch (error: any) {
        console.error(`Error in ${type} sync job ${jobId}:`, error);

        await storage.updateJob(jobId, {
          status: 'failed',
          error: error.message
        });
        throw error;
      }
    });

    console.log('Job queue initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize job queue:', error);
    return false;
  }
}

async function processBatch(type: 'orders' | 'products', cursor?: string) {
  try {
    console.log(`Processing ${type} batch${cursor ? ` after ${cursor}` : ''}`);

    const query = type === 'orders' ? ORDERS_QUERY : PRODUCTS_QUERY;
    const data = await shopifyClient.request(query, { first: 50, after: cursor });

    const items = type === 'orders'
      ? data.orders.edges.map(edge => edge.node)
      : data.products.edges.map(edge => edge.node);

    console.log(`Retrieved ${items.length} ${type}`);

    // Batch operations
    const batch = db.batch();
    const storagePromises = [];

    for (const item of items) {
      const ref = db.collection(type).doc(item.id);
      batch.set(ref, item);

      if (type === 'orders') {
        storagePromises.push(storage.createOrder({
          shopifyId: item.id,
          status: item.displayFulfillmentStatus,
          customerEmail: item.email,
          totalPrice: item.totalPriceSet.shopMoney.amount,
          createdAt: new Date(item.createdAt),
          rawData: item
        }).catch(err => console.error(`Failed to store order ${item.id}:`, err)));
      } else {
        storagePromises.push(storage.createProduct({
          shopifyId: item.id,
          title: item.title,
          description: item.description,
          price: item.priceRangeV2.minVariantPrice.amount,
          status: item.status,
          createdAt: new Date(item.createdAt),
          rawData: item
        }).catch(err => console.error(`Failed to store product ${item.id}:`, err)));
      }
    }

    await Promise.allSettled([
      batch.commit().catch(err => console.error('Firebase batch write failed:', err)),
      ...storagePromises
    ]);

    return {
      hasMore: type === 'orders' ? data.orders.pageInfo.hasNextPage : data.products.pageInfo.hasNextPage,
      cursor: type === 'orders' ? data.orders.pageInfo.endCursor : data.products.pageInfo.endCursor
    };
  } catch (error) {
    console.error(`Error processing ${type} batch:`, error);
    throw error;
  }
}

export async function addJob(type: 'orders' | 'products', jobId: number) {
  if (!jobQueue) {
    const initialized = await initializeQueue();
    if (!initialized) {
      throw new Error('Failed to initialize job queue');
    }
  }

  return jobQueue!.add('sync-shopify', { type, jobId });
}
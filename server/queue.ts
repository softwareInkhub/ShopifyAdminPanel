import Queue from 'bull';
import { shopifyClient, ORDERS_QUERY, PRODUCTS_QUERY } from './shopify';
import { storage } from './storage';
import { db } from './firebase';
import type { Job } from '@shared/schema';

interface OrdersResponse {
  orders: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    edges: Array<{
      node: {
        id: string;
        email: string;
        totalPriceSet: {
          shopMoney: {
            amount: string;
          };
        };
        displayFulfillmentStatus: string;
        createdAt: string;
      };
    }>;
  };
}

interface ProductsResponse {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    edges: Array<{
      node: {
        id: string;
        title: string;
        description: string;
        status: string;
        priceRangeV2: {
          minVariantPrice: {
            amount: string;
          };
        };
        createdAt: string;
      };
    }>;
  };
}

// Initialize Bull Queue with more resilient configuration
const jobQueue = new Queue('shopify-sync', {
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
    removeOnComplete: 100, // Keep only last 100 completed jobs
    removeOnFail: false
  }
});

// Improved error handling and logging
jobQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

jobQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err);
});

jobQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

jobQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} is stalled`);
});

// Process batches with better error handling
async function processBatch(type: 'orders' | 'products', cursor?: string) {
  try {
    console.log(`Processing ${type} batch${cursor ? ` after ${cursor}` : ''}`);

    const query = type === 'orders' ? ORDERS_QUERY : PRODUCTS_QUERY;
    const data = await shopifyClient.request(query, { first: 50, after: cursor }) as OrdersResponse | ProductsResponse;

    const items = type === 'orders' 
      ? (data as OrdersResponse).orders.edges.map(edge => edge.node)
      : (data as ProductsResponse).products.edges.map(edge => edge.node);

    console.log(`Retrieved ${items.length} ${type}`);

    // Batch operations
    const batch = db.batch();
    const storagePromises = [];

    for (const item of items) {
      const ref = db.collection(type).doc(item.id);
      batch.set(ref, item);

      if (type === 'orders') {
        const orderNode = item as OrdersResponse['orders']['edges'][0]['node'];
        storagePromises.push(storage.createOrder({
          shopifyId: orderNode.id,
          status: orderNode.displayFulfillmentStatus,
          customerEmail: orderNode.email,
          totalPrice: orderNode.totalPriceSet.shopMoney.amount,
          createdAt: new Date(orderNode.createdAt),
          rawData: orderNode
        }).catch(err => console.error(`Failed to store order ${orderNode.id}:`, err)));
      } else {
        const productNode = item as ProductsResponse['products']['edges'][0]['node'];
        storagePromises.push(storage.createProduct({
          shopifyId: productNode.id,
          title: productNode.title,
          description: productNode.description,
          price: productNode.priceRangeV2.minVariantPrice.amount,
          status: productNode.status,
          createdAt: new Date(productNode.createdAt),
          rawData: productNode
        }).catch(err => console.error(`Failed to store product ${productNode.id}:`, err)));
      }
    }

    // Execute all operations
    await Promise.allSettled([
      batch.commit().catch(err => console.error('Firebase batch write failed:', err)),
      ...storagePromises
    ]);

    return {
      hasMore: type === 'orders' 
        ? (data as OrdersResponse).orders.pageInfo.hasNextPage
        : (data as ProductsResponse).products.pageInfo.hasNextPage,
      cursor: type === 'orders'
        ? (data as OrdersResponse).orders.pageInfo.endCursor
        : (data as ProductsResponse).products.pageInfo.endCursor
    };
  } catch (error) {
    console.error(`Error processing ${type} batch:`, error);
    throw error;
  }
}

// Main job processor
jobQueue.process('sync-shopify', async (job) => {
  const { type, jobId } = job.data as { type: 'orders' | 'products', jobId: number };
  let hasMore = true;
  let cursor: string | undefined;
  let processed = 0;

  console.log(`Starting ${type} sync job ${jobId}`);

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

    console.log(`Completed ${type} sync job ${jobId}`);
  } catch (error: any) {
    console.error(`Error in ${type} sync job ${jobId}:`, error);

    await storage.updateJob(jobId, {
      status: 'failed',
      error: error.message
    }).catch(err => console.error(`Failed to update job ${jobId} status:`, err));

    throw error;
  }
});

export { jobQueue };
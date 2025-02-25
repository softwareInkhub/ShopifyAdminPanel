import Queue from 'bull';
import { shopifyClient, ORDERS_QUERY, PRODUCTS_QUERY, buildOrderDateQuery, type OrdersResponse, type ProductsResponse } from './shopify';
import { storage } from './storage';
import { db } from './firebase';
import type { Job, JobConfig } from '@shared/schema';

// In-memory queue for development
class MemoryQueue {
  private jobs: Map<string, any>;
  private handlers: Map<string, Function>;

  constructor() {
    this.jobs = new Map();
    this.handlers = new Map();
  }

  async add(name: string, data: any) {
    const jobId = Date.now().toString();
    this.jobs.set(jobId, data);

    if (this.handlers.has(name)) {
      try {
        await this.handlers.get(name)!({
          data,
          progress: async (n: number) => console.log(`Job ${jobId} progress: ${n}%`)
        });
      } catch (error) {
        console.error(`Job ${jobId} failed:`, error);
      }
    }
    return { id: jobId };
  }

  process(name: string, handler: Function) {
    this.handlers.set(name, handler);
  }

  on(event: string, handler: Function) {
    // Stub event handlers
  }
}

let jobQueue: Queue.Queue | MemoryQueue;

async function processBatch(type: 'orders' | 'products', cursor?: string, config?: JobConfig) {
  try {
    console.log(`Processing ${type} batch${cursor ? ` after ${cursor}` : ''}`);

    const query = type === 'orders' ? ORDERS_QUERY : PRODUCTS_QUERY;
    const variables: Record<string, any> = { first: config?.batchSize || 50, after: cursor };

    // Add date range filtering for orders
    if (type === 'orders' && (config?.startDate || config?.endDate)) {
      const dateQuery = buildOrderDateQuery(
        config.startDate ? new Date(config.startDate) : undefined,
        config.endDate ? new Date(config.endDate) : undefined
      );
      if (dateQuery) {
        variables.query = dateQuery;
      }
    }

    const data = await shopifyClient.request<OrdersResponse | ProductsResponse>(query, variables);

    const edges = type === 'orders' 
      ? (data as OrdersResponse).orders.edges
      : (data as ProductsResponse).products.edges;

    console.log(`Retrieved ${edges.length} ${type}`);

    const batch = db.batch();
    const storagePromises = [];

    for (const edge of edges) {
      const { node: item } = edge;
      const cleanId = item.id.replace(`gid://shopify/${type === 'orders' ? 'Order' : 'Product'}/`, '');
      const ref = db.collection(type).doc(cleanId);
      batch.set(ref, item);

      if (type === 'orders') {
        const orderItem = (data as OrdersResponse).orders.edges[0].node;
        storagePromises.push(
          storage.createOrder({
            shopifyId: cleanId,
            status: orderItem.displayFulfillmentStatus,
            customerEmail: orderItem.email,
            totalPrice: orderItem.totalPriceSet.shopMoney.amount,
            createdAt: new Date(orderItem.createdAt),
            rawData: orderItem
          }).catch(err => console.error(`Failed to store order ${cleanId}:`, err))
        );
      } else {
        const productItem = (data as ProductsResponse).products.edges[0].node;
        storagePromises.push(
          storage.createProduct({
            shopifyId: cleanId,
            title: productItem.title,
            description: productItem.description,
            price: productItem.priceRangeV2.minVariantPrice.amount,
            status: productItem.status,
            createdAt: new Date(productItem.createdAt),
            rawData: productItem
          }).catch(err => console.error(`Failed to store product ${cleanId}:`, err))
        );
      }
    }

    await Promise.allSettled([
      batch.commit().catch(err => console.error('Firebase batch write failed:', err)),
      ...storagePromises
    ]);

    const pageInfo = type === 'orders' 
      ? (data as OrdersResponse).orders.pageInfo
      : (data as ProductsResponse).products.pageInfo;

    return {
      hasMore: pageInfo.hasNextPage,
      cursor: pageInfo.endCursor,
      processedCount: edges.length
    };
  } catch (error) {
    console.error(`Error processing ${type} batch:`, error);
    throw error;
  }
}

export async function initializeQueue() {
  try {
    if (process.env.NODE_ENV === 'production') {
      jobQueue = new Queue('shopify-sync', {
        redis: {
          port: 6379,
          host: '127.0.0.1',
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              console.error('Redis connection failed after 3 retries');
              return null;
            }
            return Math.min(times * 1000, 3000);
          }
        }
      });

      jobQueue.on('error', (error) => {
        console.error('Queue error:', error);
      });

      jobQueue.on('failed', (job, err) => {
        console.error(`Job ${job.id} failed:`, err);
      });
    } else {
      console.log('Using in-memory queue for development');
      jobQueue = new MemoryQueue();
    }

    jobQueue.process('sync-shopify', async (job) => {
      const { type, jobId, config } = job.data;
      let batchNumber = 1;
      let cursor: string | undefined;
      let hasMore = true;
      let totalProcessed = 0;

      try {
        while (hasMore) {
          // Create batch record
          const batch = await storage.createJobBatch({
            jobId,
            batchNumber,
            status: 'processing',
            startedAt: new Date(),
            request: { cursor, config }
          });

          try {
            const result = await processBatch(type, cursor, config);
            hasMore = result.hasMore;
            cursor = result.cursor;
            totalProcessed += result.processedCount;

            // Update batch record
            await storage.updateJobBatch(batch.id, {
              status: 'completed',
              completedAt: new Date(),
              itemsProcessed: result.processedCount,
              response: result
            });

            // Update job progress
            const progress = Math.min(Math.round((totalProcessed / (totalProcessed + (hasMore ? 50 : 0))) * 100), 100);
            await job.progress(progress);

            await storage.updateJob(jobId, {
              progress,
              status: 'processing',
              processedItems: totalProcessed
            });

            batchNumber++;

            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error: any) {
            await storage.updateJobBatch(batch.id, {
              status: 'failed',
              completedAt: new Date(),
              error: error.message
            });
            throw error;
          }
        }

        // Complete job
        await storage.updateJob(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          totalItems: totalProcessed,
          processedItems: totalProcessed
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

export async function addJob(type: 'orders' | 'products', jobId: number, config?: JobConfig) {
  if (!jobQueue) {
    const initialized = await initializeQueue();
    if (!initialized) {
      throw new Error('Failed to initialize job queue');
    }
  }

  return jobQueue.add('sync-shopify', { type, jobId, config });
}

type ShopifyOrder = {
  id: string;
  displayFulfillmentStatus: string;
  email: string;
  totalPriceSet: { shopMoney: { amount: number } };
  createdAt: string;
  // ... other order properties
};

type ShopifyProduct = {
  id: string;
  title: string;
  description: string;
  priceRangeV2: { minVariantPrice: { amount: number } };
  status: string;
  createdAt: string;
  // ... other product properties
};
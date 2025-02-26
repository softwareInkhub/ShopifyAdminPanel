import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { addJob, initializeQueue } from "./queue";
import { z } from "zod";
import { shopifyClient, TEST_SHOP_QUERY } from "./shopify";
import { insertOrderSchema, insertProductSchema } from "@shared/schema";
import { db } from "./firebase";
import Redis from 'redis';
import { WebSocketServer } from 'ws';
import { logger } from './logger';

// Initialize Redis client with optimized connection handling
class CacheManager {
  private memoryCache = new Map<string, string>();
  private redisClient: Redis.RedisClientType | null = null;
  private isRedisConnected = false;
  private readonly MAX_RETRIES = 1;
  private readonly CONNECT_TIMEOUT = 500;

  initialize() {
    try {
      logger.cache.info('Initializing cache manager');

      this.redisClient = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: this.CONNECT_TIMEOUT,
          reconnectStrategy: (retries) => {
            if (retries > this.MAX_RETRIES) {
              logger.cache.info('Redis connection failed, using memory cache');
              this.isRedisConnected = false;
              return false;
            }
            return 200;
          }
        }
      });

      this.redisClient.on('error', () => {
        logger.cache.error('Redis error');
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        logger.cache.info('Redis connected successfully');
        this.isRedisConnected = true;

        // Configure Redis asynchronously
        if (this.redisClient) {
          this.redisClient.configSet('maxmemory-policy', 'allkeys-lru')
            .catch(() => logger.cache.error('Failed to set Redis maxmemory-policy'));
          this.redisClient.configSet('maxmemory', '100mb')
            .catch(() => logger.cache.error('Failed to set Redis maxmemory'));
        }
      });

      // Non-blocking connection
      this.redisClient.connect()
        .catch(() => {
          logger.cache.info('Redis connection failed, using memory cache');
          this.isRedisConnected = false;
        });

    } catch (error) {
      logger.cache.error('Cache manager initialization error');
      this.isRedisConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue) {
        logger.cache.debug('Memory cache hit');
        return memoryValue;
      }

      if (this.isRedisConnected && this.redisClient) {
        const value = await this.redisClient.get(key);
        if (value) {
          this.memoryCache.set(key, value);
          logger.cache.debug('Redis cache hit');
          return value;
        }
      }
    } catch (error) {
      logger.cache.error('Cache get error');
    }
    return null;
  }

  async set(key: string, value: string, ttl: number = 300): Promise<void> {
    try {
      this.memoryCache.set(key, value);
      setTimeout(() => this.memoryCache.delete(key), ttl * 1000);

      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.setEx(key, ttl, value);
      }
    } catch (error) {
      logger.cache.error('Cache set error');
    }
  }

  async getMetrics() {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const [info, keyspace] = await Promise.all([
          this.redisClient.info('stats'),
          this.redisClient.info('keyspace')
        ]);

        const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
        const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
        const totalOps = hits + misses;

        return {
          hitRate: totalOps > 0 ? (hits / totalOps) * 100 : 0,
          missRate: totalOps > 0 ? (misses / totalOps) * 100 : 0,
          itemCount: parseInt(keyspace.match(/keys=(\d+)/)?.[1] || '0'),
          averageResponseTime: parseFloat(info.match(/instantaneous_ops_per_sec:(\d+)/)?.[1] || '0'),
          provider: 'redis',
          memoryUsage: parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0') / 1024 / 1024
        };
      }
    } catch (error) {
      logger.cache.error('Redis metrics error');
    }

    return {
      hitRate: 100,
      missRate: 0,
      itemCount: this.memoryCache.size,
      averageResponseTime: 0,
      provider: 'memory',
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
    };
  }
}

const cacheManager = new CacheManager();
logger.cache.info('Starting cache manager initialization');
cacheManager.initialize();

export async function registerRoutes(app: Express) {
  // Initialize job queue
  try {
    await initializeQueue();
    logger.queue.info('Job queue initialized');
  } catch (error) {
    logger.queue.error('Failed to initialize job queue', error);
  }

  // Test Shopify connection
  app.get("/api/test-connection", async (_req, res) => {
    try {
      const data = await shopifyClient.request(TEST_SHOP_QUERY);
      res.json({ status: 'success', data });
    } catch (error: any) {
      logger.shopify.error('Shopify connection error', error);
      res.status(500).json({
        status: 'error',
        message: error.message,
        details: error.response?.errors || error.stack
      });
    }
  });

  // Orders endpoint with pagination and enhanced error handling
  app.get("/api/orders", async (req, res) => {
    try {
      const { status, search, from, to, page = 1, limit = 10 } = req.query;
      const cacheKey = `orders:${JSON.stringify({ status, search, from, to, page, limit })}`;

      // Try cache first
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        logger.orders.debug('Cache hit for orders query');
        return res.json(JSON.parse(cachedData));
      }

      // Query Firebase
      const ordersRef = db.collection('orders');
      let ordersQuery = ordersRef;

      if (status && status !== 'all') {
        ordersQuery = ordersQuery.where('status', '==', status);
      }

      if (from) {
        ordersQuery = ordersQuery.where('createdAt', '>=', new Date(from.toString()));
      }

      if (to) {
        ordersQuery = ordersQuery.where('createdAt', '<=', new Date(to.toString()));
      }

      // Get total count for pagination
      const totalDocs = (await ordersQuery.count().get()).data().count;

      // Apply pagination
      const pageSize = parseInt(limit.toString());
      const startAt = (parseInt(page.toString()) - 1) * pageSize;

      ordersQuery = ordersQuery
        .orderBy('createdAt', 'desc')
        .limit(pageSize)
        .offset(startAt);

      const snapshot = await ordersQuery.get();
      let orders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          customerEmail: data.customerEmail,
          totalPrice: data.totalPrice,
          status: data.status,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          currency: data.currency,
          items: data.items || [],
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress
        };
      });

      // Apply text search filter if provided
      if (search) {
        const searchStr = search.toString().toLowerCase();
        orders = orders.filter(order =>
          order.customerEmail?.toLowerCase().includes(searchStr) ||
          order.id.toLowerCase().includes(searchStr)
        );
      }

      const result = {
        orders,
        pagination: {
          total: totalDocs,
          page: parseInt(page.toString()),
          pageSize,
          totalPages: Math.ceil(totalDocs / pageSize)
        }
      };

      // Cache the results
      await cacheManager.set(cacheKey, JSON.stringify(result));

      logger.orders.info(`Retrieved ${orders.length} orders from Firebase`);
      res.json(result);
    } catch (error: any) {
      logger.orders.error('Orders fetch error', error);
      res.status(500).json({
        status: 'error',
        message: error.message,
        details: error.stack
      });
    }
  });

  // Products endpoint with enhanced caching
  app.get("/api/products", async (req, res) => {
    try {
      const { search, category, status, minPrice, maxPrice } = req.query;
      const cacheKey = `products:${JSON.stringify({ search, category, status, minPrice, maxPrice })}`;

      // Try cache first
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        logger.products.debug('Cache hit for products query');
        return res.json(JSON.parse(cachedData));
      }

      const productsRef = db.collection('products');
      let productsQuery = productsRef;

      if (status && status !== 'all') {
        productsQuery = productsQuery.where('status', '==', status);
      }

      if (category && category !== 'All') {
        productsQuery = productsQuery.where('category', '==', category);
      }

      const snapshot = await productsQuery.get();
      let products = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          price: data.price,
          status: data.status,
          category: data.category,
          sku: data.sku,
          inventory: data.inventory,
          variants: data.variants || [],
          images: data.images || [],
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          rawData: data
        };
      });

      // Apply additional filters
      if (minPrice) {
        products = products.filter(p => parseFloat(p.price || '0') >= parseFloat(minPrice.toString()));
      }

      if (maxPrice) {
        products = products.filter(p => parseFloat(p.price || '0') <= parseFloat(maxPrice.toString()));
      }

      if (search) {
        const searchStr = search.toString().toLowerCase();
        products = products.filter(product =>
          product.title?.toLowerCase().includes(searchStr) ||
          product.description?.toLowerCase().includes(searchStr)
        );
      }

      // Cache the results
      await cacheManager.set(cacheKey, JSON.stringify(products));

      logger.products.info(`Retrieved ${products.length} products from Firebase`);
      res.json(products);
    } catch (error: any) {
      logger.products.error('Products fetch error', error);
      res.status(500).json({
        status: 'error',
        message: error.message,
        details: error.stack
      });
    }
  });

  // Cache Performance Metrics
  app.get("/api/cache/metrics", async (_req, res) => {
    try {
      const metrics = await cacheManager.getMetrics();
      res.json(metrics);
    } catch (error: any) {
      logger.cache.error('Cache metrics error', error);
      res.status(500).json({
        status: 'error',
        message: error.message,
        details: error.stack
      });
    }
  });

  // Update order status
  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.updateOrder(parseInt(req.params.id), req.body);
      res.json(order);
    } catch (error: any) {
      logger.orders.error('Order update error', error);
      res.status(500).json({ message: error.message });
    }
  });


  // Products with enhanced filtering and validation
  app.post("/api/products", async (req, res) => {
    try {
      // Validate product data
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      logger.products.info('Created new product', product);
      res.json(product);
    } catch (error: any) {
      logger.products.error('Product creation error', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      // Validate the incoming data
      const productData = insertProductSchema.partial().parse(req.body);

      // Update the product
      const product = await storage.updateProduct(parseInt(req.params.id), productData);
      logger.products.info('Updated product', product);

      // Return the updated product
      res.json(product);
    } catch (error: any) {
      logger.products.error('Product update error', error);
      res.status(500).json({
        message: error.message,
        details: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(parseInt(req.params.id));
      logger.products.info('Deleted product', req.params.id);
      res.status(204).end();
    } catch (error: any) {
      logger.products.error('Product deletion error', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Add this new route after the existing products routes
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      logger.products.info('Fetched product', product.id);
      res.json(product);
    } catch (error: any) {
      logger.products.error('Product fetch error', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.listJobs();
      res.json(jobs);
    } catch (error: any) {
      logger.jobs.error('Jobs fetch error', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const schema = z.object({
        type: z.enum(['orders', 'products']),
        config: z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          batchSize: z.number().optional(),
          includeImages: z.boolean().optional(),
          includeMetafields: z.boolean().optional()
        }).optional()
      });

      const { type, config } = schema.parse(req.body);

      const job = await storage.createJob({
        type,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        config: config || undefined
      });

      await addJob(type, job.id, config);

      res.json(job);
    } catch (error: any) {
      logger.jobs.error('Job creation error', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Job batches
  app.get("/api/jobs/:jobId/batches", async (req, res) => {
    try {
      const batches = await storage.listJobBatches(parseInt(req.params.jobId));
      res.json(batches);
    } catch (error: any) {
      logger.jobs.error('Job batches fetch error', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Job summary and report
  app.get("/api/jobs/:jobId/summary", async (req, res) => {
    try {
      const summary = await storage.getJobSummary(parseInt(req.params.jobId));
      res.json(summary);
    } catch (error: any) {
      logger.jobs.error('Job summary fetch error', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/jobs/:jobId/report", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const [job, batches] = await Promise.all([
        storage.getJob(jobId),
        storage.listJobBatches(jobId)
      ]);

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      const report = {
        job: {
          ...job,
          summary: await storage.getJobSummary(jobId)
        },
        batches: batches.sort((a, b) => a.batchNumber - b.batchNumber)
      };

      res.json(report);
    } catch (error: any) {
      logger.jobs.error('Job report generation error', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Add these endpoints for job management after existing routes
  app.post("/api/jobs/sync-orders", async (req, res) => {
    try {
      const schema = z.object({
        batchSize: z.number().min(1).max(1000).default(100),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        includeMetafields: z.boolean().default(false)
      });

      const config = schema.parse(req.body);

      // Create a new sync job
      const job = await storage.createJob({
        type: 'orders',
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        config: {
          ...config,
          resumeFromOrderId: null, // Will be updated during sync
          lastSyncTime: new Date().toISOString()
        }
      });

      // Add job to queue
      await addJob('orders', job.id, job.config);

      res.json({
        status: 'success',
        message: 'Order sync job created',
        jobId: job.id,
        config
      });
    } catch (error: any) {
      logger.jobs.error('Job creation error', error);
      res.status(500).json({
        status: 'error',
        message: error.message,
        details: error.stack
      });
    }
  });

  // Job status endpoint
  app.get("/api/jobs/sync-orders/:jobId", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getJob(jobId);

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Get progress details
      const [batches, checkpoint] = await Promise.all([
        storage.listJobBatches(jobId),
        db.collection('sync_checkpoints').doc('orders').get()
      ]);

      const checkpointData = checkpoint.data();

      res.json({
        ...job,
        batches: batches.sort((a, b) => a.batchNumber - b.batchNumber),
        checkpoint: checkpointData,
        lastSync: checkpointData?.lastSyncTime
      });
    } catch (error: any) {
      logger.jobs.error('Job status fetch error', error);
      res.status(500).json({
        status: 'error',
        message: error.message,
        details: error.stack
      });
    }
  });

  // List all sync jobs
  app.get("/api/jobs/sync-orders", async (_req, res) => {
    try {
      const jobs = await storage.listJobs({ type: 'orders' });

      // Get latest checkpoint
      const checkpoint = await db.collection('sync_checkpoints').doc('orders').get();
      const checkpointData = checkpoint.data();

      res.json({
        jobs: jobs.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        lastSync: checkpointData?.lastSyncTime,
        lastOrderId: checkpointData?.lastOrderId
      });
    } catch (error: any) {
      logger.jobs.error('Jobs list error', error);
      res.status(500).json({
        status: 'error',
        message: error.message,
        details: error.stack
      });
    }
  });

  // Cancel a running job
  app.post("/api/jobs/sync-orders/:jobId/cancel", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getJob(jobId);

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (job.status !== 'processing') {
        return res.status(400).json({ message: 'Job is not running' });
      }

      // Update job status
      await storage.updateJob(jobId, { status: 'cancelled' });

      res.json({
        status: 'success',
        message: 'Job cancelled successfully'
      });
    } catch (error: any) {
      logger.jobs.error('Job cancellation error', error);
      res.status(500).json({
        status: 'error',
        message: error.message,
        details: error.stack
      });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics", async (req, res) => {
    try {
      const range = req.query.range as string || '7d';
      const days = parseInt(range.replace('d', ''));

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all jobs within the time range
      const jobs = await storage.listJobs();
      const recentJobs = jobs.filter(job => new Date(job.createdAt) >= startDate);

      // Calculate analytics
      const analytics = {
        totalJobs: recentJobs.length,
        completedJobs: recentJobs.filter(j => j.status === 'completed').length,
        failedJobs: recentJobs.filter(j => j.status === 'failed').length,
        jobsByType: recentJobs.reduce((acc, job) => {
          acc[job.type] = (acc[job.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        dailyActivity: {} as Record<string, number>,
        successRate: 0,
        averageProcessingTime: 0
      };

      // Calculate success rate
      analytics.successRate = (analytics.completedJobs / analytics.totalJobs) * 100 || 0;

      // Calculate average processing time
      const completedWithTime = recentJobs.filter(j => j.completedAt && j.status === 'completed');
      if (completedWithTime.length > 0) {
        const totalTime = completedWithTime.reduce((sum, job) => {
          return sum + (new Date(job.completedAt!).getTime() - new Date(job.createdAt).getTime());
        }, 0);
        analytics.averageProcessingTime = (totalTime / completedWithTime.length) / 1000; // Convert to seconds
      }

      // Build activity heatmap data
      recentJobs.forEach(job => {
        const timestamp = new Date(job.createdAt).getTime();
        analytics.dailyActivity[timestamp] = (analytics.dailyActivity[timestamp] || 0) + 1;
      });

      res.json(analytics);
    } catch (error: any) {
      logger.analytics.error('Analytics generation error', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Add these new endpoints for sync management
  app.get("/api/sync/checkpoint", async (_req, res) => {
    try {
      const snapshot = await db.collection('sync_checkpoints').doc('orders').get();
      const checkpoint = snapshot.data() || {
        lastOrderId: null,
        lastSyncTime: null,
        status: 'idle'
      };
      res.json(checkpoint);
    } catch (error: any) {
      logger.sync.error('Checkpoint fetch error', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  app.post("/api/sync/resume", async (req, res) => {
    try {
      const checkpoint = await db.collection('sync_checkpoints').doc('orders').get();
      const checkpointData = checkpoint.data();

      // Create a new sync job with the checkpoint data
      const job = await storage.createJob({
        type: 'orders',
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        config: {
          resumeFromOrderId: checkpointData?.lastOrderId,
          lastSyncTime: checkpointData?.lastSyncTime,
          batchSize: 100
        }
      });

      await addJob('orders', job.id, job.config);

      res.json({
        status: 'success',
        message: 'Sync resumed',
        jobId: job.id,
        checkpoint: checkpointData
      });
    } catch (error: any) {
      logger.sync.error('Resume sync error', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // Health check endpoints
  app.get("/api/monitoring/health/summary", async (_req, res) => {
    try {
      const snapshot = await db.collection('system_health').doc('current').get();
      const healthData = snapshot.data() || {
        status: 'unknown',
        activeAlerts: 0,
        lastUpdate: new Date()
      };

      res.json(healthData);
    } catch (error: any) {
      logger.health.error('Health summary fetch error', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/performance/summary", async (_req, res) => {
    try {
      const snapshot = await db.collection('analytics').doc('performance').get();
      const metrics = snapshot.data() || {
        avgResponse: 0,
        errorRate: 0,
        lastUpdate: new Date()
      };

      res.json(metrics);
    } catch (error: any) {
      logger.analytics.error('Performance metrics fetch error', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // Sync metrics endpoint
  app.get("/api/sync/metrics", async (_req, res) => {
    try {
      const snapshot = await db.collection('sync_metrics').doc('current').get();
      const metrics = snapshot.data() || {
        currentSpeed: 0,
        errorRate: 0,
        totalProcessed: 0,
        lastUpdate: new Date()
      };

      res.json(metrics);
    } catch (error: any) {
      logger.sync.error('Sync metrics fetch error', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });


  // Advanced GraphQL Search Endpoint
  app.post("/api/graphql/search", async (req, res) => {
    try {
      const { query, filters, pagination } = req.body;

      // Build the cache key based on query parameters
      const cacheKey = `search:${JSON.stringify({ query, filters, pagination })}`;

      // Check cache first
      const cachedResult = await cacheManager.get(cacheKey);
      if (cachedResult) {
        logger.search.debug('Cache hit for search query');
        return res.json(JSON.parse(cachedResult));
      }

      // If not in cache, perform the search
      const searchResults = await storage.advancedSearch(query, filters, pagination);

      // Cache the results
      await cacheManager.set(cacheKey, JSON.stringify(searchResults));

      res.json(searchResults);
    } catch (error: any) {
      logger.search.error('Search error', error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup with enhanced error handling
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    perMessageDeflate: {
      zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
      zlibInflateOptions: { chunkSize: 10 * 1024 },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 1024
    }
  });

  // WebSocket connection handling
  wss.on('connection', (ws, req) => {
    const clientId = Math.random().toString(36).substring(7);
    logger.server.info(`WebSocket client ${clientId} connected`);

    ws.on('error', (error) => {
      logger.server.error(`WebSocket error for client ${clientId}`);
    });

    ws.on('close', (code, reason) => {
      logger.server.info(`Client ${clientId} disconnected. Code: ${code}`);
    });

    // Send initial connection success message
    ws.send(JSON.stringify({
      type: 'connection_status',
      status: 'connected',
      clientId
    }));

    // Heartbeat to keep connection alive
    const interval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('pong', () => {
      logger.server.debug(`Client ${clientId} heartbeat`);
    });

    ws.on('close', () => {
      clearInterval(interval);
    });
  });

  // Handle WebSocket server errors
  wss.on('error', (error) => {
    logger.server.error('WebSocket server error');
  });

  return httpServer;
}
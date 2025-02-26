import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { addJob, initializeQueue } from "./queue";
import { z } from "zod";
import { shopifyClient, TEST_SHOP_QUERY } from "./shopify";
import { insertOrderSchema, insertProductSchema, type JobConfig } from "@shared/schema";
import { db } from "./firebase";

export async function registerRoutes(app: Express) {
  // Initialize job queue
  try {
    await initializeQueue();
    console.log('Job queue initialized');
  } catch (error) {
    console.error('Failed to initialize job queue:', error);
  }

  // Test Shopify connection
  app.get("/api/test-connection", async (_req, res) => {
    try {
      const data = await shopifyClient.request(TEST_SHOP_QUERY);
      res.json({ status: 'success', data });
    } catch (error: any) {
      console.error('Shopify connection error:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error.message,
        details: error.response?.errors || error.stack 
      });
    }
  });

  // Orders endpoint with enhanced error handling and Firebase integration
  app.get("/api/orders", async (req, res) => {
    try {
      const { status, search, from, to } = req.query;
      console.log('Fetching orders with params:', { status, search, from, to });

      // Query Firebase for orders
      let ordersQuery = db.collection('orders');

      if (status && status !== 'all') {
        ordersQuery = ordersQuery.where('status', '==', status);
      }

      if (from) {
        ordersQuery = ordersQuery.where('createdAt', '>=', new Date(from.toString()));
      }

      if (to) {
        ordersQuery = ordersQuery.where('createdAt', '<=', new Date(to.toString()));
      }

      const snapshot = await ordersQuery.get();
      let orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply text search filter if provided
      if (search) {
        const searchStr = search.toString().toLowerCase();
        orders = orders.filter(order => 
          order.customerEmail?.toLowerCase().includes(searchStr) ||
          order.id.toLowerCase().includes(searchStr)
        );
      }

      console.log(`Retrieved ${orders.length} orders from Firebase`);
      res.json(orders);
    } catch (error: any) {
      console.error('Orders fetch error:', error);
      res.status(500).json({ 
        status: 'error',
        message: error.message,
        details: error.stack
      });
    }
  });

  // Products endpoint with Firebase integration
  app.get("/api/products", async (req, res) => {
    try {
      const { search, category, status, minPrice, maxPrice } = req.query;
      console.log('Fetching products with params:', { search, category, status, minPrice, maxPrice });

      let productsQuery = db.collection('products');

      if (status && status !== 'all') {
        productsQuery = productsQuery.where('status', '==', status);
      }

      if (category && category !== 'All') {
        productsQuery = productsQuery.where('category', '==', category);
      }

      const snapshot = await productsQuery.get();
      let products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

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

      console.log(`Retrieved ${products.length} products from Firebase`);
      res.json(products);
    } catch (error: any) {
      console.error('Products fetch error:', error);
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
      console.error('Order update error:', error);
      res.status(500).json({ message: error.message });
    }
  });


  // Products with enhanced filtering and validation
  app.post("/api/products", async (req, res) => {
    try {
      // Validate product data
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      console.log('Created new product:', product);
      res.json(product);
    } catch (error: any) {
      console.error('Product creation error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      // Validate the incoming data
      const productData = insertProductSchema.partial().parse(req.body);

      // Update the product
      const product = await storage.updateProduct(parseInt(req.params.id), productData);
      console.log('Updated product:', product);

      // Return the updated product
      res.json(product);
    } catch (error: any) {
      console.error('Product update error:', error);
      res.status(500).json({ 
        message: error.message,
        details: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(parseInt(req.params.id));
      console.log('Deleted product:', req.params.id);
      res.status(204).end();
    } catch (error: any) {
      console.error('Product deletion error:', error);
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
      console.log('Fetched product:', product.id);
      res.json(product);
    } catch (error: any) {
      console.error('Product fetch error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.listJobs();
      res.json(jobs);
    } catch (error: any) {
      console.error('Jobs fetch error:', error);
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
      console.error('Job creation error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Job batches
  app.get("/api/jobs/:jobId/batches", async (req, res) => {
    try {
      const batches = await storage.listJobBatches(parseInt(req.params.jobId));
      res.json(batches);
    } catch (error: any) {
      console.error('Job batches fetch error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Job summary and report
  app.get("/api/jobs/:jobId/summary", async (req, res) => {
    try {
      const summary = await storage.getJobSummary(parseInt(req.params.jobId));
      res.json(summary);
    } catch (error: any) {
      console.error('Job summary fetch error:', error);
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
      console.error('Job report generation error:', error);
      res.status(500).json({ message: error.message });
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
      console.error('Analytics generation error:', error);
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
      console.error('Checkpoint fetch error:', error);
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
      console.error('Resume sync error:', error);
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
      console.error('Health summary fetch error:', error);
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
      console.error('Performance metrics fetch error:', error);
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
      console.error('Sync metrics fetch error:', error);
      res.status(500).json({ 
        status: 'error',
        message: error.message 
      });
    }
  });

  // Cache Performance Metrics
  app.get("/api/cache/metrics", async (_req, res) => {
    try {
      const snapshot = await db.collection('cache_metrics').doc('current').get();
      const metrics = snapshot.data() || {
        hitRate: 0,
        missRate: 0,
        itemCount: 0,
        averageResponseTime: 0,
        lastUpdate: new Date()
      };

      res.json(metrics);
    } catch (error: any) {
      console.error('Cache metrics error:', error);
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
      const cachedResult = await storage.getFromCache(cacheKey);
      if (cachedResult) {
        console.log('Cache hit for search query');
        return res.json(cachedResult);
      }

      // If not in cache, perform the search
      const searchResults = await storage.advancedSearch(query, filters, pagination);

      // Cache the results
      await storage.setInCache(cacheKey, searchResults, 300); // Cache for 5 minutes

      res.json(searchResults);
    } catch (error: any) {
      console.error('Search error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
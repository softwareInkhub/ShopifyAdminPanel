import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { addJob, initializeQueue } from "./queue";
import { z } from "zod";
import { shopifyClient, TEST_SHOP_QUERY } from "./shopify";
import { insertOrderSchema, insertProductSchema, type JobConfig } from "@shared/schema";

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

  // Orders endpoint with enhanced filtering and error handling
  app.get("/api/orders", async (req, res) => {
    console.log('Fetching orders with params:', req.query);
    try {
      const { status, search, from, to } = req.query;

      // Get all orders first
      const orders = await storage.listOrders();
      console.log(`Retrieved ${orders.length} orders from storage`);

      // Apply filters
      const filteredOrders = orders.filter(order => {
        let matches = true;

        // Status filter
        if (status && status !== 'all') {
          matches = matches && order.status === status;
        }

        // Search filter
        if (search) {
          const searchStr = search.toString().toLowerCase();
          matches = matches && (
            order.customerEmail.toLowerCase().includes(searchStr) ||
            order.shopifyId.toLowerCase().includes(searchStr)
          );
        }

        // Date range filter
        if (from) {
          matches = matches && new Date(order.createdAt) >= new Date(from.toString());
        }
        if (to) {
          matches = matches && new Date(order.createdAt) <= new Date(to.toString());
        }

        return matches;
      });

      console.log(`Returning ${filteredOrders.length} filtered orders`);
      res.json(filteredOrders);
    } catch (error: any) {
      console.error('Orders fetch error:', error);
      res.status(500).json({ message: error.message });
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

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.listProducts();
      res.json(products);
    } catch (error: any) {
      console.error('Products fetch error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const product = await storage.createProduct(req.body);
      res.json(product);
    } catch (error: any) {
      console.error('Product creation error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.updateProduct(parseInt(req.params.id), req.body);
      res.json(product);
    } catch (error: any) {
      console.error('Product update error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(parseInt(req.params.id));
      res.status(204).end();
    } catch (error: any) {
      console.error('Product deletion error:', error);
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

  const httpServer = createServer(app);
  return httpServer;
}
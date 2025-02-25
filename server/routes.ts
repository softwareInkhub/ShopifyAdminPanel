import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { addJob, initializeQueue } from "./queue";
import { z } from "zod";
import { shopifyClient, TEST_SHOP_QUERY } from "./shopify";
import { insertOrderSchema, insertProductSchema } from "@shared/schema";

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

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const orders = await storage.listOrders(status);
      res.json(orders);
    } catch (error: any) {
      console.error('Orders fetch error:', error);
      res.status(500).json({ message: error.message });
    }
  });

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
        type: z.enum(['orders', 'products'])
      });

      const { type } = schema.parse(req.body);

      const job = await storage.createJob({
        type,
        status: 'pending',
        progress: 0,
        createdAt: new Date()
      });

      await addJob(type, job.id);

      res.json(job);
    } catch (error: any) {
      console.error('Job creation error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
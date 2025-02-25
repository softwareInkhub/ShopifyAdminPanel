import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { jobQueue } from "./queue";
import { z } from "zod";
import { insertOrderSchema, insertProductSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  // Orders
  app.get("/api/orders", async (req, res) => {
    const status = req.query.status as string | undefined;
    const orders = await storage.listOrders(status);
    res.json(orders);
  });

  app.patch("/api/orders/:id", async (req, res) => {
    const order = await storage.updateOrder(parseInt(req.params.id), req.body);
    res.json(order);
  });

  // Products
  app.get("/api/products", async (req, res) => {
    const products = await storage.listProducts();
    res.json(products);
  });

  app.post("/api/products", async (req, res) => {
    const product = await storage.createProduct(req.body);
    res.json(product);
  });

  app.patch("/api/products/:id", async (req, res) => {
    const product = await storage.updateProduct(parseInt(req.params.id), req.body);
    res.json(product);
  });

  app.delete("/api/products/:id", async (req, res) => {
    await storage.deleteProduct(parseInt(req.params.id));
    res.status(204).end();
  });

  // Jobs
  app.get("/api/jobs", async (req, res) => {
    const jobs = await storage.listJobs();
    res.json(jobs);
  });

  app.post("/api/jobs", async (req, res) => {
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

    await jobQueue.add({ type, jobId: job.id });
    
    res.json(job);
  });

  const httpServer = createServer(app);
  return httpServer;
}

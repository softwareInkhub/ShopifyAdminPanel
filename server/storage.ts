import {
  type Order,
  type Product,
  type Job,
  type JobBatch,
  type InsertOrder,
  type InsertProduct,
  type InsertJob,
  type InsertJobBatch,
  type JobSummary
} from "@shared/schema";

// Cache implementation
class MemCache {
  private cache: Map<string, { data: any; expiry: number }>;
  private metrics: {
    hits: number;
    misses: number;
    totalRequests: number;
    totalResponseTime: number;
  };

  constructor() {
    this.cache = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      totalResponseTime: 0
    };
  }

  async get(key: string): Promise<any> {
    const start = Date.now();
    this.metrics.totalRequests++;

    const item = this.cache.get(key);
    if (!item || item.expiry < Date.now()) {
      this.metrics.misses++;
      this.cache.delete(key);
      return null;
    }

    this.metrics.hits++;
    this.metrics.totalResponseTime += Date.now() - start;
    return item.data;
  }

  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  getMetrics() {
    const totalRequests = this.metrics.totalRequests;
    return {
      hitRate: totalRequests ? (this.metrics.hits / totalRequests) * 100 : 0,
      missRate: totalRequests ? (this.metrics.misses / totalRequests) * 100 : 0,
      currentSize: this.cache.size,
      itemCount: this.cache.size,
      avgResponseTime: totalRequests ? this.metrics.totalResponseTime / totalRequests : 0
    };
  }
}

export interface IStorage {
  // Existing interfaces
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByShopifyId(shopifyId: string): Promise<Order | undefined>;
  listOrders(status?: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order>;

  getProduct(id: number): Promise<Product | undefined>;
  getProductByShopifyId(shopifyId: string): Promise<Product | undefined>;
  listProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<Job>): Promise<Job>;
  listJobs(filter?: { status?: string }): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  getJobSummary(id: number): Promise<JobSummary>;

  createJobBatch(batch: InsertJobBatch): Promise<JobBatch>;
  updateJobBatch(id: number, batch: Partial<JobBatch>): Promise<JobBatch>;
  listJobBatches(jobId: number): Promise<JobBatch[]>;
  getJobBatch(id: number): Promise<JobBatch | undefined>;

  // New interfaces for advanced features
  getFromCache(key: string): Promise<any>;
  setInCache(key: string, data: any, ttlSeconds: number): Promise<void>;
  getCacheMetrics(): Promise<{
    hitRate: number;
    missRate: number;
    currentSize: number;
    itemCount: number;
    avgResponseTime: number;
  }>;

  getSyncMetrics(): Promise<{
    currentSpeed: number;
    totalProcessed: number;
    cacheHitRate: number;
    errorRate: number;
    lastSyncTime?: Date;
  }>;

  getRecentErrors(): Promise<Array<{
    id: string;
    message: string;
    timestamp: Date;
    type: string;
  }>>;

  getLastSuccessfulBatch(jobId: number): Promise<{
    batchNumber: number;
    endCursor?: string;
    response?: any;
  } | null>;

  advancedSearch(
    query: string,
    filters: Record<string, any>,
    pagination: { limit: number; offset: number }
  ): Promise<{
    items: Array<Order | Product>;
    total: number;
    hasMore: boolean;
  }>;
}

export class MemStorage implements IStorage {
  private orders: Map<number, Order>;
  private products: Map<number, Product>;
  private jobs: Map<number, Job>;
  private jobBatches: Map<number, JobBatch>;
  private currentId: number;
  private cache: MemCache;
  private syncMetrics: {
    startTime: number;
    processedItems: number;
    errors: Array<{ id: string; message: string; timestamp: Date; type: string }>;
  };

  constructor() {
    this.orders = new Map();
    this.products = new Map();
    this.jobs = new Map();
    this.jobBatches = new Map();
    this.currentId = 1;
    this.cache = new MemCache();
    this.syncMetrics = {
      startTime: Date.now(),
      processedItems: 0,
      errors: []
    };
    console.log('MemStorage initialized with advanced features');
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const cachedOrder = await this.getFromCache(`order:${id}`);
    if (cachedOrder) return cachedOrder;
    const order = this.orders.get(id);
    if(order) await this.setInCache(`order:${id}`, order, 60); // Cache for 60 seconds
    return order;
  }

  async getOrderByShopifyId(shopifyId: string): Promise<Order | undefined> {
    const cachedOrder = await this.getFromCache(`order:${shopifyId}`);
    if (cachedOrder) return cachedOrder;
    const order = Array.from(this.orders.values()).find(o => o.shopifyId === shopifyId);
    if(order) await this.setInCache(`order:${shopifyId}`, order, 60); // Cache for 60 seconds
    return order;
  }

  async listOrders(status?: string): Promise<Order[]> {
    console.log(`Listing orders with status filter: ${status}`);
    const orders = Array.from(this.orders.values());
    console.log(`Total orders in storage: ${orders.length}`);
    return status ? orders.filter(o => o.status === status) : orders;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentId++;
    const newOrder = { ...order, id } as Order;
    this.orders.set(id, newOrder);
    console.log(`Created new order with ID: ${id}`);
    await this.setInCache(`order:${id}`, newOrder, 60); //Cache for 60 seconds
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<Order>): Promise<Order> {
    const existing = await this.getOrder(id);
    if (!existing) throw new Error("Order not found");
    const updated = { ...existing, ...order };
    this.orders.set(id, updated);
    await this.setInCache(`order:${id}`, updated, 60); //Cache for 60 seconds
    return updated;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const cachedProduct = await this.getFromCache(`product:${id}`);
    if (cachedProduct) return cachedProduct;
    const product = this.products.get(id);
    if(product) await this.setInCache(`product:${id}`, product, 60); // Cache for 60 seconds
    return product;
  }

  async getProductByShopifyId(shopifyId: string): Promise<Product | undefined> {
    const cachedProduct = await this.getFromCache(`product:${shopifyId}`);
    if (cachedProduct) return cachedProduct;
    const product = Array.from(this.products.values()).find(p => p.shopifyId === shopifyId);
    if(product) await this.setInCache(`product:${shopifyId}`, product, 60); // Cache for 60 seconds
    return product;
  }

  async listProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentId++;
    const newProduct = { ...product, id } as Product;
    this.products.set(id, newProduct);
    await this.setInCache(`product:${id}`, newProduct, 60); //Cache for 60 seconds
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const existing = await this.getProduct(id);
    if (!existing) throw new Error("Product not found");
    const updated = { ...existing, ...product };
    this.products.set(id, updated);
    await this.setInCache(`product:${id}`, updated, 60); //Cache for 60 seconds
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    this.products.delete(id);
    await this.setInCache(`product:${id}`, null, 0); //Invalidate cache
  }

  async createJob(job: InsertJob): Promise<Job> {
    const id = this.currentId++;
    const newJob = { ...job, id } as Job;
    this.jobs.set(id, newJob);
    return newJob;
  }

  async updateJob(id: number, job: Partial<Job>): Promise<Job> {
    const existing = await this.getJob(id);
    if (!existing) throw new Error("Job not found");
    const updated = { ...existing, ...job };
    this.jobs.set(id, updated);
    return updated;
  }

  async listJobs(filter?: { status?: string }): Promise<Job[]> {
    const jobs = Array.from(this.jobs.values());
    return filter?.status ? jobs.filter(j => j.status === filter.status) : jobs;
  }

  async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobSummary(id: number): Promise<JobSummary> {
    const batches = await this.listJobBatches(id);
    return {
      totalBatches: batches.length,
      successfulBatches: batches.filter(b => b.status === 'completed').length,
      failedBatches: batches.filter(b => b.status === 'failed').length,
      totalItems: batches.reduce((sum, b) => sum + (b.itemsProcessed || 0), 0),
      processedItems: batches.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.itemsProcessed || 0), 0),
      errors: batches.filter(b => b.error)
        .map(b => b.error!)
        .filter((err): err is string => !!err),
      warnings: []
    };
  }

  async createJobBatch(batch: InsertJobBatch): Promise<JobBatch> {
    const id = this.currentId++;
    const newBatch = { ...batch, id } as JobBatch;
    this.jobBatches.set(id, newBatch);
    return newBatch;
  }

  async updateJobBatch(id: number, batch: Partial<JobBatch>): Promise<JobBatch> {
    const existing = await this.getJobBatch(id);
    if (!existing) throw new Error("Job batch not found");
    const updated = { ...existing, ...batch };
    this.jobBatches.set(id, updated);
    return updated;
  }

  async listJobBatches(jobId: number): Promise<JobBatch[]> {
    return Array.from(this.jobBatches.values())
      .filter(batch => batch.jobId === jobId)
      .sort((a, b) => a.batchNumber - b.batchNumber);
  }

  async getJobBatch(id: number): Promise<JobBatch | undefined> {
    return this.jobBatches.get(id);
  }

  // New methods for advanced features
  async getFromCache(key: string): Promise<any> {
    return this.cache.get(key);
  }

  async setInCache(key: string, data: any, ttlSeconds: number): Promise<void> {
    return this.cache.set(key, data, ttlSeconds);
  }

  async getCacheMetrics() {
    return this.cache.getMetrics();
  }

  async getSyncMetrics() {
    const totalTime = (Date.now() - this.syncMetrics.startTime) / 1000; // in seconds
    return {
      currentSpeed: totalTime > 0 ? this.syncMetrics.processedItems / totalTime : 0,
      totalProcessed: this.syncMetrics.processedItems,
      cacheHitRate: this.cache.getMetrics().hitRate,
      errorRate: (this.syncMetrics.errors.length / Math.max(this.syncMetrics.processedItems, 1)) * 100,
      lastSyncTime: new Date()
    };
  }

  async getRecentErrors() {
    // Return last 10 errors
    return this.syncMetrics.errors.slice(-10);
  }

  async getLastSuccessfulBatch(jobId: number): Promise<{ batchNumber: number; endCursor?: string; response?: any } | null> {
    const batches = await this.listJobBatches(jobId);
    const lastSuccessful = batches
      .filter(b => b.status === 'completed')
      .sort((a, b) => b.batchNumber - a.batchNumber)[0];

    return lastSuccessful ? {
      batchNumber: lastSuccessful.batchNumber,
      endCursor: lastSuccessful.response?.endCursor,
      response: lastSuccessful.response
    } : null;
  }

  async advancedSearch(
    query: string,
    filters: Record<string, any>,
    pagination: { limit: number; offset: number }
  ) {
    let items: Array<Order | Product> = [];
    const allItems = [...this.orders.values(), ...this.products.values()];

    // Full-text search
    if (query) {
      const searchTerms = query.toLowerCase().split(' ');
      items = allItems.filter(item => {
        const itemString = JSON.stringify(item).toLowerCase();
        return searchTerms.every(term => itemString.includes(term));
      });
    } else {
      items = allItems;
    }

    // Apply filters
    if (filters) {
      items = items.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            if ('min' in value || 'max' in value) {
              const itemValue = Number(item[key]);
              if ('min' in value && itemValue < value.min) return false;
              if ('max' in value && itemValue > value.max) return false;
              return true;
            }
            if (Array.isArray(value)) {
              return value.includes(item[key]);
            }
          }
          return item[key] === value;
        });
      });
    }

    const total = items.length;
    items = items.slice(pagination.offset, pagination.offset + pagination.limit);

    return {
      items,
      total,
      hasMore: pagination.offset + pagination.limit < total
    };
  }
}

export const storage = new MemStorage();
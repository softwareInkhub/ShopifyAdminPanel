import {
  type Order,
  type Product,
  type Job,
  type InsertOrder,
  type InsertProduct,
  type InsertJob
} from "@shared/schema";

export interface IStorage {
  // Orders
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByShopifyId(shopifyId: string): Promise<Order | undefined>;
  listOrders(status?: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order>;

  // Products
  getProduct(id: number): Promise<Product | undefined>;
  getProductByShopifyId(shopifyId: string): Promise<Product | undefined>;
  listProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Jobs
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<Job>): Promise<Job>;
  listJobs(): Promise<Job[]>;
}

export class MemStorage implements IStorage {
  private orders: Map<number, Order>;
  private products: Map<number, Product>;
  private jobs: Map<number, Job>;
  private currentId: number;

  constructor() {
    this.orders = new Map();
    this.products = new Map();
    this.jobs = new Map();
    this.currentId = 1;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderByShopifyId(shopifyId: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(o => o.shopifyId === shopifyId);
  }

  async listOrders(status?: string): Promise<Order[]> {
    const orders = Array.from(this.orders.values());
    return status ? orders.filter(o => o.status === status) : orders;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentId++;
    const newOrder = { ...order, id } as Order;
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<Order>): Promise<Order> {
    const existing = await this.getOrder(id);
    if (!existing) throw new Error("Order not found");
    const updated = { ...existing, ...order };
    this.orders.set(id, updated);
    return updated;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductByShopifyId(shopifyId: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(p => p.shopifyId === shopifyId);
  }

  async listProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentId++;
    const newProduct = { ...product, id } as Product;
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const existing = await this.getProduct(id);
    if (!existing) throw new Error("Product not found");
    const updated = { ...existing, ...product };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    this.products.delete(id);
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

  async listJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  private async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }
}

export const storage = new MemStorage();

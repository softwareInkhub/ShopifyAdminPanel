import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  shopifyId: text("shopify_id").notNull().unique(),
  status: text("status").notNull(),
  customerEmail: text("customer_email"),
  totalPrice: text("total_price"),
  createdAt: timestamp("created_at").notNull(),
  rawData: jsonb("raw_data")
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  shopifyId: text("shopify_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  price: text("price"),
  status: text("status"),
  createdAt: timestamp("created_at").notNull(),
  rawData: jsonb("raw_data")
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  progress: integer("progress"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull(),
  completedAt: timestamp("completed_at"),
  // New fields for enhanced job tracking
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  totalItems: integer("total_items"),
  processedItems: integer("processed_items"),
  config: jsonb("config"),
  summary: jsonb("summary")
});

export const jobBatches = pgTable("job_batches", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  batchNumber: integer("batch_number").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  itemsProcessed: integer("items_processed"),
  request: jsonb("request"),
  response: jsonb("response"),
  error: text("error")
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true });
export const insertJobBatchSchema = createInsertSchema(jobBatches).omit({ id: true });

export type Order = typeof orders.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type JobBatch = typeof jobBatches.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertJobBatch = z.infer<typeof insertJobBatchSchema>;

// Job configuration types
export interface DateRangeConfig {
  startDate?: string;
  endDate?: string;
}

export interface JobConfig extends DateRangeConfig {
  batchSize?: number;
  includeImages?: boolean;
  includeMetafields?: boolean;
}

// Job summary types
export interface JobSummary {
  totalBatches: number;
  successfulBatches: number;
  failedBatches: number;
  totalItems: number;
  processedItems: number;
  errors: string[];
  warnings: string[];
}
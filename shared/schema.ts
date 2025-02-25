import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
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
  completedAt: timestamp("completed_at")
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true });

export type Order = typeof orders.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;

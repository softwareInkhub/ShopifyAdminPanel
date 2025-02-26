import type { Express } from "express";
import { db } from "./firebase";
import { logger } from './logger';

// Simplified in-memory cache
class CacheManager {
  private memoryCache = new Map<string, string>();

  initialize() {
    logger.cache.info('Initialized in-memory cache manager');
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = this.memoryCache.get(key);
      if (value) {
        logger.cache.debug('Cache hit');
        return value;
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
    } catch (error) {
      logger.cache.error('Cache set error');
    }
  }
}

const cacheManager = new CacheManager();
cacheManager.initialize();

export async function registerRoutes(app: Express) {
  // Orders endpoint with pagination
  app.get("/api/orders", async (req, res) => {
    try {
      const { status, search, from, to, page = 1, limit = 10 } = req.query;
      const cacheKey = `orders:${JSON.stringify({ status, search, from, to, page, limit })}`;

      // Try cache first
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Query Firebase
      const ordersRef = db.collection('orders');
      const snapshot = await ordersRef.get();

      let orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply filters if provided
      if (status && status !== 'all') {
        orders = orders.filter(order => order.status === status);
      }

      if (search) {
        const searchStr = search.toString().toLowerCase();
        orders = orders.filter(order =>
          order.customerEmail?.toLowerCase().includes(searchStr) ||
          order.id.toLowerCase().includes(searchStr)
        );
      }

      // Apply pagination
      const startIndex = (Number(page) - 1) * Number(limit);
      const endIndex = startIndex + Number(limit);
      const paginatedOrders = orders.slice(startIndex, endIndex);

      const result = {
        orders: paginatedOrders,
        pagination: {
          total: orders.length,
          page: Number(page),
          pageSize: Number(limit),
          totalPages: Math.ceil(orders.length / Number(limit))
        }
      };

      // Cache the results
      await cacheManager.set(cacheKey, JSON.stringify(result));

      res.json(result);
    } catch (error) {
      logger.server.error('Orders fetch error');
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  return app;
}
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
  // Orders endpoint with enhanced error handling
  app.get("/api/orders", async (req, res) => {
    try {
      logger.server.info('Fetching orders...');
      const { status, search } = req.query;

      // Try cache first
      const cacheKey = `orders:${JSON.stringify({ status, search })}`;
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        logger.server.info('Returning cached orders data');
        return res.json(JSON.parse(cachedData));
      }

      // Query Firebase
      const ordersCollection = await db.collection('orders');
      const ordersSnapshot = await ordersCollection.get();
      logger.server.info(`Successfully fetched ${ordersSnapshot.size} orders from Firebase`);

      // Transform data
      let orders = [];
      for (const doc of ordersSnapshot.docs) {
        try {
          const data = doc.data();
          orders.push({
            id: doc.id,
            customerEmail: data.customerEmail || 'N/A',
            totalPrice: parseFloat(data.totalPrice || 0).toFixed(2),
            status: data.status || 'UNFULFILLED',
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
            currency: data.currency || 'USD'
          });
        } catch (error) {
          logger.server.error(`Error transforming order ${doc.id}:`, error);
        }
      }

      // Apply filters
      if (status && status !== 'all') {
        orders = orders.filter(order => order.status === status);
      }

      if (search) {
        const searchStr = search.toString().toLowerCase();
        orders = orders.filter(order =>
          order.customerEmail.toLowerCase().includes(searchStr) ||
          order.id.toLowerCase().includes(searchStr)
        );
      }

      const result = {
        orders,
        total: orders.length
      };

      // Cache the results
      await cacheManager.set(cacheKey, JSON.stringify(result));
      logger.server.info(`Processed and returning ${orders.length} orders`);

      res.json(result);
    } catch (error) {
      logger.server.error('Orders fetch error:', error);
      res.status(500).json({
        message: 'Failed to fetch orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Products endpoint
  app.get("/api/products", async (req, res) => {
    try {
      logger.server.info('Fetching products...');
      const { search, category, status } = req.query;

      // Try cache first
      const cacheKey = `products:${JSON.stringify({ search, category, status })}`;
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        logger.server.info('Returning cached products data');
        return res.json(JSON.parse(cachedData));
      }

      // Query Firebase
      const productsCollection = await db.collection('products');
      const productsSnapshot = await productsCollection.get();
      logger.server.info(`Successfully fetched ${productsSnapshot.size} products from Firebase`);

      // Transform data
      let products = [];
      for (const doc of productsSnapshot.docs) {
        try {
          const data = doc.data();
          products.push({
            id: doc.id,
            shopifyId: data.shopifyId || null,
            title: data.title || 'Untitled Product',
            description: data.description || '',
            price: parseFloat(data.price || 0).toFixed(2),
            status: data.status || 'DRAFT',
            category: data.category || 'Uncategorized',
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
            rawData: data.rawData || {}
          });
        } catch (error) {
          logger.server.error(`Error transforming product ${doc.id}:`, error);
        }
      }

      // Apply filters
      if (status && status !== 'all') {
        products = products.filter(product => product.status === status);
      }

      if (category && category !== 'all') {
        products = products.filter(product => product.category === category);
      }

      if (search) {
        const searchStr = search.toString().toLowerCase();
        products = products.filter(product =>
          product.title.toLowerCase().includes(searchStr) ||
          product.description.toLowerCase().includes(searchStr)
        );
      }

      const result = {
        products,
        total: products.length
      };

      // Cache the results
      await cacheManager.set(cacheKey, JSON.stringify(result));
      logger.server.info(`Processed and returning ${products.length} products`);

      res.json(result);
    } catch (error) {
      logger.server.error('Products fetch error:', error);
      res.status(500).json({
        message: 'Failed to fetch products',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return app;
}
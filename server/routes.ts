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
      const { status, search, from, to, page = 1, limit = 10 } = req.query;
      const cacheKey = `orders:${JSON.stringify({ status, search, from, to, page, limit })}`;

      // Try cache first
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        logger.server.info('Returning cached orders data');
        return res.json(JSON.parse(cachedData));
      }

      // Query Firebase with proper filtering and error handling
      let ordersSnapshot;
      try {
        const ordersRef = db.collection('orders');
        logger.server.info('Attempting to query Firebase orders collection');
        ordersSnapshot = await ordersRef.get();
        logger.server.info(`Successfully fetched ${ordersSnapshot.size} orders from Firebase`);
      } catch (error) {
        logger.server.error('Failed to query orders from Firebase:', error);
        throw error;
      }

      // Transform data with proper error handling
      let orders = [];
      for (const doc of ordersSnapshot.docs) {
        try {
          const data = doc.data();
          orders.push({
            id: doc.id,
            customerEmail: data.customerEmail || 'N/A',
            totalPrice: parseFloat(data.totalPrice || 0),
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

      logger.server.info(`Successfully processed and returning ${paginatedOrders.length} orders`);
      res.json(result);
    } catch (error) {
      logger.server.error('Orders fetch error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Products endpoint with enhanced error handling
  app.get("/api/products", async (req, res) => {
    try {
      logger.server.info('Fetching products...');
      const { search, category, status, page = 1, limit = 10 } = req.query;
      const cacheKey = `products:${JSON.stringify({ search, category, status, page, limit })}`;

      // Try cache first
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        logger.server.info('Returning cached products data');
        return res.json(JSON.parse(cachedData));
      }

      // Query Firebase
      let productsSnapshot;
      try {
        const productsRef = db.collection('products');
        logger.server.info('Attempting to query Firebase products collection');
        productsSnapshot = await productsRef.get();
        logger.server.info(`Successfully fetched ${productsSnapshot.size} products from Firebase`);
      } catch (error) {
        logger.server.error('Failed to query products from Firebase:', error);
        throw error;
      }

      // Transform data
      let products = [];
      for (const doc of productsSnapshot.docs) {
        try {
          const data = doc.data();
          products.push({
            id: doc.id,
            title: data.title || 'Untitled Product',
            description: data.description || '',
            price: parseFloat(data.price || 0),
            status: data.status || 'DRAFT',
            category: data.category || 'Uncategorized',
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date()
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

      // Apply pagination
      const startIndex = (Number(page) - 1) * Number(limit);
      const endIndex = startIndex + Number(limit);
      const paginatedProducts = products.slice(startIndex, endIndex);

      const result = {
        products: paginatedProducts,
        pagination: {
          total: products.length,
          page: Number(page),
          pageSize: Number(limit),
          totalPages: Math.ceil(products.length / Number(limit))
        }
      };

      // Cache the results
      await cacheManager.set(cacheKey, JSON.stringify(result));

      logger.server.info(`Successfully processed and returning ${paginatedProducts.length} products`);
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
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

      // Query Firebase with proper filtering
      let ordersSnapshot;
      try {
        let query = db.collection('orders');

        // Apply filters
        if (status && status !== 'all') {
          query = query.where('status', '==', status);
        }

        ordersSnapshot = await query.get();
        logger.server.info(`Firebase query executed successfully, got ${ordersSnapshot.size} orders`);
      } catch (error) {
        logger.server.error('Failed to query orders from Firebase');
        throw error;
      }

      // Transform data with proper date handling
      let orders = ordersSnapshot.docs.map(doc => {
        const data = doc.data();
        try {
          return {
            id: doc.id,
            customerEmail: data.customerEmail || 'N/A',
            totalPrice: parseFloat(data.totalPrice || 0),
            status: data.status || 'UNFULFILLED',
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
            currency: data.currency || 'USD'
          };
        } catch (error) {
          logger.server.error(`Error transforming order ${doc.id}`);
          return null;
        }
      }).filter(Boolean);

      // Apply date filters in memory
      if (from) {
        const fromDate = new Date(from.toString());
        orders = orders.filter(order => order.createdAt >= fromDate);
      }

      if (to) {
        const toDate = new Date(to.toString());
        orders = orders.filter(order => order.createdAt <= toDate);
      }

      // Apply text search if provided
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

      logger.server.info(`Retrieved and processed ${orders.length} orders`);
      res.json(result);
    } catch (error) {
      logger.server.error('Orders fetch error');
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Products endpoint
  app.get("/api/products", async (req, res) => {
    try {
      const { search, category, status, page = 1, limit = 10 } = req.query;
      const cacheKey = `products:${JSON.stringify({ search, category, status, page, limit })}`;

      // Try cache first
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Query Firebase
      let productsSnapshot;
      try {
        let query = db.collection('products');

        // Apply filters
        if (status && status !== 'all') {
          query = query.where('status', '==', status);
        }
        if (category && category !== 'all') {
          query = query.where('category', '==', category);
        }

        productsSnapshot = await query.get();
        logger.server.info(`Firebase query executed successfully, got ${productsSnapshot.size} products`);
      } catch (error) {
        logger.server.error('Failed to query products from Firebase');
        throw error;
      }

      // Transform data
      let products = productsSnapshot.docs.map(doc => {
        const data = doc.data();
        try {
          return {
            id: doc.id,
            title: data.title || 'Untitled Product',
            description: data.description || '',
            price: parseFloat(data.price || 0),
            status: data.status || 'DRAFT',
            category: data.category || 'Uncategorized',
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date()
          };
        } catch (error) {
          logger.server.error(`Error transforming product ${doc.id}`);
          return null;
        }
      }).filter(Boolean);

      // Apply text search if provided
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

      logger.server.info(`Retrieved and processed ${products.length} products`);
      res.json(result);
    } catch (error) {
      logger.server.error('Products fetch error');
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  return app;
}
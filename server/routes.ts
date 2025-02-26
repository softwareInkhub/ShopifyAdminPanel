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

const DEFAULT_PAGE_SIZE = 100;

export async function registerRoutes(app: Express) {
  // Orders endpoint with enhanced error handling and pagination
  app.get("/api/orders", async (req, res) => {
    try {
      logger.server.info('Fetching orders...');
      const { 
        status, 
        search, 
        page = '1',
        pageSize = DEFAULT_PAGE_SIZE.toString()
      } = req.query;

      const currentPage = parseInt(page as string);
      const limit = parseInt(pageSize as string);

      // Try cache first
      const cacheKey = `orders:${JSON.stringify({ status, search, page, pageSize })}`;
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        logger.server.info('Returning cached orders data');
        return res.json(JSON.parse(cachedData));
      }

      // Query Firebase with pagination
      const ordersRef = db.collection('orders');
      let query = ordersRef;

      // Get total count first (we'll fetch all to get accurate count)
      const totalSnapshot = await ordersRef.get();
      const total = totalSnapshot.docs.length;

      // Apply status filter if specified
      if (status && status !== 'all') {
        query = query.where('status', '==', status);
      }

      // Apply pagination with ordering
      query = query.orderBy('createdAt', 'desc')
                  .limit(limit)
                  .offset((currentPage - 1) * limit);

      const ordersSnapshot = await query.get();
      logger.server.info(`Successfully fetched ${ordersSnapshot.size} orders from Firebase`);

      // Transform data
      let orders = [];
      ordersSnapshot.forEach(doc => {
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
      });

      // Apply search filter after fetching
      if (search) {
        const searchStr = search.toString().toLowerCase();
        orders = orders.filter(order =>
          order.customerEmail.toLowerCase().includes(searchStr) ||
          order.id.toLowerCase().includes(searchStr)
        );
      }

      const result = {
        orders,
        pagination: {
          total,
          currentPage,
          pageSize: limit,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache the results
      await cacheManager.set(cacheKey, JSON.stringify(result));
      logger.server.info(`Processed and returning ${orders.length} orders for page ${currentPage}`);

      res.json(result);
    } catch (error) {
      logger.server.error('Orders fetch error:', error);
      res.status(500).json({
        message: 'Failed to fetch orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Products endpoint with pagination (similar structure)
  app.get("/api/products", async (req, res) => {
    try {
      logger.server.info('Fetching products...');
      const { 
        search, 
        category, 
        status,
        page = '1',
        pageSize = DEFAULT_PAGE_SIZE.toString()
      } = req.query;

      const currentPage = parseInt(page as string);
      const limit = parseInt(pageSize as string);

      // Try cache first
      const cacheKey = `products:${JSON.stringify({ search, category, status, page, pageSize })}`;
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        logger.server.info('Returning cached products data');
        return res.json(JSON.parse(cachedData));
      }

      // Query Firebase with pagination
      const productsRef = db.collection('products');
      let query = productsRef;

      // Apply filters before pagination
      if (status && status !== 'all') {
        query = query.where('status', '==', status);
      }
      if (category && category !== 'all') {
        query = query.where('category', '==', category);
      }

      // Get total count
      const totalSnapshot = await query.get();
      const total = totalSnapshot.docs.length;

      // Apply pagination
      query = query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset((currentPage - 1) * limit);

      const productsSnapshot = await query.get();
      logger.server.info(`Successfully fetched ${productsSnapshot.size} products from Firebase`);

      // Transform data
      let products = [];
      productsSnapshot.forEach(doc => {
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
          logger.server.error('Error transforming product data');
        }
      });

      // Apply search filter after fetching
      if (search) {
        const searchStr = search.toString().toLowerCase();
        products = products.filter(product =>
          product.title.toLowerCase().includes(searchStr) ||
          product.description.toLowerCase().includes(searchStr)
        );
      }

      const result = {
        products,
        pagination: {
          total,
          currentPage,
          pageSize: limit,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache the results
      await cacheManager.set(cacheKey, JSON.stringify(result));
      logger.server.info(`Processed and returning ${products.length} products for page ${currentPage}`);

      res.json(result);
    } catch (error) {
      logger.server.error('Products fetch error');
      res.status(500).json({
        message: 'Failed to fetch products',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return app;
}
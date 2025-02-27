import type { Express } from "express";
import { getDb } from "./firebase";
import { logger } from './logger';
import { s3Service } from './aws/services/s3';
import { dynamoDBService } from './aws/services/dynamodb';
import { lambdaService } from './aws/services/lambda'; // Added import
import { stepFunctionsService } from './aws/services/stepfunctions'; // Added import
const shopifyOrdersLambda = `// Lambda function code here`; // Placeholder for Lambda code
const stepFunctionDefinition = {
  // Step Function definition here
  "StartAt": "ImportShopifyOrders",
  "States": {
    "ImportShopifyOrders": {
      "Type": "Task",
      "Resource": "#{LambdaFunctionArn}",
      "End": true
    }
  }
};


// Cache related code at the top
class CacheManager {
  private memoryCache = new Map<string, { data: any; expiry: number }>();
  private metrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    totalResponseTime: 0
  };

  initialize() {
    logger.server.info('Initialized enhanced cache manager');
    // Clean up expired entries periodically
    setInterval(() => this.cleanupExpiredEntries(), 60000);
  }

  private cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiry < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  async get(key: string): Promise<any> {
    const start = Date.now();
    this.metrics.totalRequests++;

    try {
      const item = this.memoryCache.get(key);
      if (item && item.expiry > Date.now()) {
        this.metrics.hits++;
        this.metrics.totalResponseTime += Date.now() - start;
        logger.cache.debug('Cache hit');
        return item.data;
      }
      logger.cache.debug('Cache miss');
      this.metrics.misses++;
      // Clean up expired item
      if (item) {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      logger.cache.error('Cache get error');
    }
    return null;
  }

  async set(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      this.memoryCache.set(key, {
        data,
        expiry: Date.now() + (ttl * 1000)
      });
    } catch (error) {
      logger.cache.error('Cache set error');
    }
  }

  async invalidate(pattern: string): Promise<void> {
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
  }

  getMetrics() {
    return {
      hitRate: (this.metrics.hits / this.metrics.totalRequests) * 100,
      missRate: (this.metrics.misses / this.metrics.totalRequests) * 100,
      avgResponseTime: this.metrics.totalResponseTime / this.metrics.totalRequests,
      cacheSize: this.memoryCache.size
    };
  }
}

const cacheManager = new CacheManager();
cacheManager.initialize();

const DEFAULT_PAGE_SIZE = 100;
const CACHE_TTL = 300; // 5 minutes

// Helper function to fetch a single page of orders
async function fetchOrdersPage(page: number, limit: number, status?: string) {
  try {
    logger.server.info('Starting to fetch orders page...');
    const db = await getDb();
    let query = db.collection('orders');

    // Log the initial query parameters
    logger.server.info(`Query params: page=${page}, limit=${limit}, status=${status}`);

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    // Get total count first
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;
    logger.server.info(`Total orders in collection: ${total}`);

    // Apply ordering and pagination
    query = query.orderBy('createdAt', 'desc')
                .limit(limit)
                .offset((page - 1) * limit);

    const ordersSnapshot = await query.get();
    logger.server.info(`Fetched ${ordersSnapshot.size} orders from Firebase`);

    let orders = [];
    ordersSnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        logger.server.info(`Order data for ${doc.id}:`, JSON.stringify(data, null, 2));

        const billingAddress = data.billingAddress || {};

        orders.push({
          id: doc.id,
          customerEmail: data.customerEmail || 'N/A',
          customerName: data.customerName || `${billingAddress.firstName || ''} ${billingAddress.lastName || ''}`.trim() || 'Unknown Customer',
          totalPrice: data.totalPrice ? parseFloat(data.totalPrice).toFixed(2) : '0.00',
          tax: data.tax ? parseFloat(data.tax).toFixed(2) : undefined,
          status: data.status || 'UNFULFILLED',
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
          currency: data.currency || 'USD',
          items: Array.isArray(data.items) ? data.items.map(item => ({
            title: item.title || item.name || 'Unknown Product',
            quantity: parseInt(item.quantity) || 1,
            price: parseFloat(item.price || 0).toFixed(2)
          })) : [],
          notes: data.notes || data.orderNotes,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          paymentMethod: data.paymentMethod,
          fulfillmentStatus: data.fulfillmentStatus || data.status,
          tags: data.tags || []
        });
      } catch (error) {
        logger.server.error(`Error transforming order ${doc.id}:`, error);
      }
    });

    logger.server.info(`Successfully processed ${orders.length} orders`);
    if (orders.length > 0) {
      logger.server.info('Sample order data:', JSON.stringify(orders[0], null, 2));
    }

    return {
      orders,
      pagination: {
        total,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.server.error('Error fetching orders:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express) {
  // Add cache control middleware for API responses
  app.use('/api', (req, res, next) => {
    // Set cache control headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    next();
  });

  // Enhanced orders endpoint with cache invalidation
  app.get("/api/orders", async (req, res) => {
    try {
      logger.server.info('Fetching orders...');
      const { 
        status, 
        search, 
        page = '1',
        pageSize = DEFAULT_PAGE_SIZE.toString(),
        _t = Date.now().toString() // Cache buster
      } = req.query;

      const currentPage = parseInt(page as string);
      const limit = parseInt(pageSize as string);

      // Generate cache key including timestamp for versioning
      const cacheKey = `orders:${JSON.stringify({ status, search, page, pageSize, _t })}`;

      // Try cache first
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        logger.server.info('Returning cached orders data');
        return res.json(cachedData);
      }

      const result = await fetchOrdersPage(currentPage, limit, status as string);

      // Apply search filter if needed
      if (search) {
        const searchStr = search.toString().toLowerCase();
        result.orders = result.orders.filter(order =>
          order.customerEmail.toLowerCase().includes(searchStr) ||
          order.id.toLowerCase().includes(searchStr)
        );
      }

      // Cache the results with versioned key
      await cacheManager.set(cacheKey, result, CACHE_TTL);

      res.json(result);
    } catch (error) {
      logger.server.error('Orders fetch error:', error);
      res.status(500).json({
        message: 'Failed to fetch orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Endpoint to manually invalidate cache
  app.post("/api/cache/invalidate", async (req, res) => {
    try {
      await cacheManager.invalidate('orders:');
      res.json({ message: 'Cache invalidated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to invalidate cache' });
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

      // Get Firestore instance
      const db = await getDb();

      // Build the query
      let query = db.collection('products');

      // Apply filters before pagination
      if (status && status !== 'all') {
        query = query.where('status', '==', status);
      }
      if (category && category !== 'all') {
        query = query.where('category', '==', category);
      }

      // Get total count
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Apply pagination with ordering
      query = query.orderBy('createdAt', 'desc')
                  .limit(limit)
                  .offset((currentPage - 1) * limit);

      const productsSnapshot = await query.get();
      logger.server.info(`Successfully fetched ${productsSnapshot.size} products from Firebase`);

      // Transform data
      let products = [];
      productsSnapshot.forEach((doc) => {
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
      });

      // Apply search filter if needed
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
      logger.server.error('Products fetch error:', error);
      res.status(500).json({
        message: 'Failed to fetch products',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AWS S3 Routes
  app.get("/api/aws/s3/buckets", async (req, res) => {
    try {
      const response = await s3Service.listBuckets();
      res.json(response.Buckets || []);
    } catch (error) {
      logger.server.error('Error listing S3 buckets:', error);
      res.status(500).json({
        message: 'Failed to list buckets',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/aws/s3/buckets/:bucketName/objects", async (req, res) => {
    try {
      const { bucketName } = req.params;
      const response = await s3Service.listObjects(bucketName);
      res.json(response.Contents || []);
    } catch (error) {
      logger.server.error('Error listing S3 objects:', error);
      res.status(500).json({
        message: 'Failed to list objects',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/aws/s3/buckets", async (req, res) => {
    try {
      const { name } = req.body;
      await s3Service.createBucket(name);
      res.json({ message: 'Bucket created successfully' });
    } catch (error) {
      logger.server.error('Error creating S3 bucket:', error);
      res.status(500).json({
        message: 'Failed to create bucket',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.delete("/api/aws/s3/buckets/:bucketName", async (req, res) => {
    try {
      const { bucketName } = req.params;
      await s3Service.deleteBucket(bucketName);
      res.json({ message: 'Bucket deleted successfully' });
    } catch (error) {
      logger.server.error('Error deleting S3 bucket:', error);
      res.status(500).json({
        message: 'Failed to delete bucket',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // DynamoDB Routes
  app.get("/api/aws/dynamodb/tables", async (req, res) => {
    try {
      const response = await dynamoDBService.listTables();
      const tables = await Promise.all((response.TableNames || []).map(async (tableName) => {
        const describeTable = await dynamoDBService.describeTable(tableName);
        return {
          TableName: tableName,
          ItemCount: describeTable.Table?.ItemCount || 0,
          TableStatus: describeTable.Table?.TableStatus || 'UNKNOWN'
        };
      }));
      res.json(tables);
    } catch (error) {
      logger.server.error('Error listing DynamoDB tables');
      res.status(500).json({
        message: 'Failed to list tables',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/aws/dynamodb/tables/:tableName/items", async (req, res) => {
    try {
      const { tableName } = req.params;
      const response = await dynamoDBService.scan({
        TableName: tableName,
        Limit: 50  // Limit results for performance
      });
      res.json(response.Items || []);
    } catch (error) {
      logger.server.error('Error querying DynamoDB table');
      res.status(500).json({
        message: 'Failed to query table',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/aws/dynamodb/tables", async (req, res) => {
    try {
      await dynamoDBService.createTable(req.body);
      res.json({ message: 'Table created successfully' });
    } catch (error) {
      logger.server.error('Error creating DynamoDB table');
      res.status(500).json({
        message: 'Failed to create table',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.delete("/api/aws/dynamodb/tables/:tableName", async (req, res) => {
    try {
      const { tableName } = req.params;
      await dynamoDBService.deleteTable(tableName);
      res.json({ message: 'Table deleted successfully' });
    } catch (error) {
      logger.server.error('Error deleting DynamoDB table');
      res.status(500).json({
        message: 'Failed to delete table',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/aws/dynamodb/tables/:tableName/items", async (req, res) => {
    try {
      const { tableName } = req.params;
      await dynamoDBService.putItem(tableName, req.body);
      res.json({ message: 'Item added successfully' });
    } catch (error) {
      logger.server.error('Error adding item to DynamoDB');
      res.status(500).json({
        message: 'Failed to add item',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add after existing DynamoDB routes
  // Step Functions and Lambda Routes for Shopify Orders Import
  app.post("/api/aws/shopify/import-setup", async (req, res) => {
    try {
      // Create DynamoDB table for orders if it doesn't exist
      await dynamoDBService.createTable({
        TableName: 'shopify_orders',
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' }
        ],
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      });

      // Create Lambda function
      const lambdaResponse = await lambdaService.createFunction({
        FunctionName: 'shopify-orders-import',
        Runtime: 'nodejs18.x',
        Role: process.env.AWS_LAMBDA_ROLE_ARN,
        Handler: 'index.handler',
        Code: {
          ZipFile: Buffer.from(shopifyOrdersLambda)
        },
        Environment: {
          Variables: {
            SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN,
            SHOPIFY_SHOP_URL: process.env.SHOPIFY_SHOP_URL
          }
        },
        Timeout: 300,
        MemorySize: 256
      });

      // Create Step Function state machine
      const stepFunctionResponse = await stepFunctionsService.createStateMachine({
        name: 'shopify-orders-import',
        definition: JSON.stringify(stepFunctionDefinition).replace(
          '#{LambdaFunctionArn}',
          lambdaResponse.FunctionArn
        ),
        roleArn: process.env.AWS_STEP_FUNCTIONS_ROLE_ARN,
        type: 'STANDARD'
      });

      res.json({
        message: 'Import workflow setup completed',
        lambdaArn: lambdaResponse.FunctionArn,
        stateMachineArn: stepFunctionResponse.stateMachineArn
      });
    } catch (error) {
      logger.server.error('Error setting up import workflow');
      res.status(500).json({
        message: 'Failed to setup import workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/aws/shopify/start-import", async (req, res) => {
    try {
      const response = await stepFunctionsService.startExecution({
        stateMachineArn: req.body.stateMachineArn,
        input: JSON.stringify({})
      });

      res.json({
        message: 'Import started successfully',
        executionArn: response.executionArn
      });
    } catch (error) {
      logger.server.error('Error starting import');
      res.status(500).json({
        message: 'Failed to start import',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/aws/shopify/import-status/:executionArn", async (req, res) => {
    try {
      const response = await stepFunctionsService.getExecutionStatus(
        req.params.executionArn
      );

      res.json(response);
    } catch (error) {
      logger.server.error('Error getting import status');
      res.status(500).json({
        message: 'Failed to get import status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return app;
}
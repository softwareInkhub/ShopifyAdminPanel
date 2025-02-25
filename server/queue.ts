import Queue from 'bull';
import { shopifyClient, ORDERS_QUERY, PRODUCTS_QUERY } from './shopify';
import { storage } from './storage';
import { db } from './firebase';
import type { Job } from '@shared/schema';

interface OrdersResponse {
  orders: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    edges: Array<{
      node: {
        id: string;
        email: string;
        totalPriceSet: {
          shopMoney: {
            amount: string;
          };
        };
        displayFulfillmentStatus: string;
        createdAt: string;
      };
    }>;
  };
}

interface ProductsResponse {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    edges: Array<{
      node: {
        id: string;
        title: string;
        description: string;
        status: string;
        priceRangeV2: {
          minVariantPrice: {
            amount: string;
          };
        };
        createdAt: string;
      };
    }>;
  };
}

const jobQueue = new Queue('shopify-sync', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

async function processBatch(type: 'orders' | 'products', cursor?: string) {
  const query = type === 'orders' ? ORDERS_QUERY : PRODUCTS_QUERY;
  const data = await shopifyClient.request(query, { first: 50, after: cursor }) as OrdersResponse | ProductsResponse;

  const items = type === 'orders' 
    ? (data as OrdersResponse).orders.edges.map(edge => edge.node)
    : (data as ProductsResponse).products.edges.map(edge => edge.node);

  const batch = db.batch();

  for (const item of items) {
    const ref = db.collection(type).doc(item.id);
    batch.set(ref, item);

    if (type === 'orders') {
      const orderNode = item as OrdersResponse['orders']['edges'][0]['node'];
      await storage.createOrder({
        shopifyId: orderNode.id,
        status: orderNode.displayFulfillmentStatus,
        customerEmail: orderNode.email,
        totalPrice: orderNode.totalPriceSet.shopMoney.amount,
        createdAt: new Date(orderNode.createdAt),
        rawData: orderNode
      });
    } else {
      const productNode = item as ProductsResponse['products']['edges'][0]['node'];
      await storage.createProduct({
        shopifyId: productNode.id,
        title: productNode.title,
        description: productNode.description,
        price: productNode.priceRangeV2.minVariantPrice.amount,
        status: productNode.status,
        createdAt: new Date(productNode.createdAt),
        rawData: productNode
      });
    }
  }

  await batch.commit();

  return {
    hasMore: type === 'orders' 
      ? (data as OrdersResponse).orders.pageInfo.hasNextPage
      : (data as ProductsResponse).products.pageInfo.hasNextPage,
    cursor: type === 'orders'
      ? (data as OrdersResponse).orders.pageInfo.endCursor
      : (data as ProductsResponse).products.pageInfo.endCursor
  };
}

jobQueue.process(async (job) => {
  const { type } = job.data as { type: 'orders' | 'products' };
  let hasMore = true;
  let cursor: string | undefined;

  try {
    while (hasMore) {
      const result = await processBatch(type, cursor);
      hasMore = result.hasMore;
      cursor = result.cursor;

      // Update job progress (use a simple percentage based on cursor position)
      await job.progress(cursor ? parseInt(cursor.split(':')[1] || '0') : 0);
    }

    await storage.updateJob(Number(job.id), {
      status: 'completed',
      completedAt: new Date()
    });
  } catch (error: any) {
    await storage.updateJob(Number(job.id), {
      status: 'failed',
      error: error.message
    });
    throw error;
  }
});

export { jobQueue };
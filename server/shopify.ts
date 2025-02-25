import { GraphQLClient } from 'graphql-request';

// Validate and clean Shopify credentials
function validateShopifyCredentials() {
  if (!process.env.SHOPIFY_SHOP_URL) {
    throw new Error('Missing SHOPIFY_SHOP_URL environment variable');
  }
  if (!process.env.SHOPIFY_ACCESS_TOKEN) {
    throw new Error('Missing SHOPIFY_ACCESS_TOKEN environment variable');
  }
}

validateShopifyCredentials();

// Clean and format the shop URL
const shopUrl = process.env.SHOPIFY_SHOP_URL.trim().replace(/^https?:\/\//, '');
const endpoint = `https://${shopUrl}/admin/api/2024-01/graphql.json`;

console.log('Initializing Shopify client with endpoint:', endpoint);

export const shopifyClient = new GraphQLClient(endpoint, {
  headers: {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
    'Content-Type': 'application/json',
  },
});

// Test query to verify shop access
export const TEST_SHOP_QUERY = `
  query {
    shop {
      name
      primaryDomain {
        url
      }
    }
  }
`;

// Query for orders with comprehensive fields
export const ORDERS_QUERY = `
  query($first: Int!, $after: String) {
    orders(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          email
          name
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFulfillmentStatus
          createdAt
        }
      }
    }
  }
`;

// Query for products with comprehensive fields
export const PRODUCTS_QUERY = `
  query($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          description
          status
          priceRangeV2 {
            minVariantPrice {
              amount
            }
          }
          createdAt
        }
      }
    }
  }
`;

// Type definitions for Shopify responses
export interface ShopifyPageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface ShopifyOrder {
  id: string;
  email: string;
  name: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  displayFulfillmentStatus: string;
  createdAt: string;
}

export interface ShopifyProduct {
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
}

export interface OrdersResponse {
  orders: {
    pageInfo: ShopifyPageInfo;
    edges: Array<{ node: ShopifyOrder }>;
  };
}

export interface ProductsResponse {
  products: {
    pageInfo: ShopifyPageInfo;
    edges: Array<{ node: ShopifyProduct }>;
  };
}
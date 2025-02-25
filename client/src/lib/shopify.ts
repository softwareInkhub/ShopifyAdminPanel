// Types for Shopify GraphQL responses
export interface ShopifyPageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface ShopifyOrder {
  id: string;
  email: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
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
    edges: Array<{
      node: ShopifyOrder;
    }>;
  };
}

export interface ProductsResponse {
  products: {
    pageInfo: ShopifyPageInfo;
    edges: Array<{
      node: ShopifyProduct;
    }>;
  };
}

// GraphQL Queries
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
          totalPriceSet {
            shopMoney {
              amount
            }
          }
          displayFulfillmentStatus
          createdAt
        }
      }
    }
  }
`;

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

export const PRODUCT_DETAIL_QUERY = `
  query($id: ID!) {
    product(id: $id) {
      id
      title
      description
      descriptionHtml
      handle
      productType
      vendor
      status
      priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            sku
            price
            compareAtPrice
            inventoryQuantity
            selectedOptions {
              name
              value
            }
            image {
              url
              altText
            }
          }
        }
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
            width
            height
          }
        }
      }
      metafields(first: 10) {
        edges {
          node {
            namespace
            key
            value
          }
        }
      }
      onlineStoreUrl
      tags
      updatedAt
      createdAt
    }
  }
`;

// Helper functions for interacting with Shopify API
export async function makeShopifyRequest<T>(query: string, variables: Record<string, any>): Promise<T> {
  if (!import.meta.env.VITE_SHOPIFY_SHOP_URL || !import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN) {
    throw new Error('Missing Shopify credentials');
  }

  const endpoint = `https://${import.meta.env.VITE_SHOPIFY_SHOP_URL}/admin/api/2024-01/graphql.json`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`);
  }

  const json = await response.json();
  
  if (json.errors) {
    throw new Error(`GraphQL Error: ${json.errors[0].message}`);
  }

  return json.data;
}

// Utility functions for fetching orders and products
export async function fetchOrders(first: number = 50, after?: string): Promise<OrdersResponse> {
  return makeShopifyRequest<OrdersResponse>(ORDERS_QUERY, { first, after });
}

export async function fetchProducts(first: number = 50, after?: string): Promise<ProductsResponse> {
  return makeShopifyRequest<ProductsResponse>(PRODUCTS_QUERY, { first, after });
}
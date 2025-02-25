import { GraphQLClient } from 'graphql-request';

// Validate Shopify credentials
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
const shopUrl = process.env.SHOPIFY_SHOP_URL!.trim().replace(/^https?:\/\//, '').replace(/\s+/g, '');
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

// Enhanced query for orders with complete data
export const ORDERS_QUERY = `
  query($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          email
          phone
          note
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalShippingPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFulfillmentStatus
          displayFinancialStatus
          processedAt
          createdAt
          updatedAt
          customer {
            id
            firstName
            lastName
            email
            phone
            validEmailAddress
          }
          shippingAddress {
            address1
            address2
            city
            province
            country
            zip
            phone
          }
          billingAddress {
            address1
            address2
            city
            province
            country
            zip
            phone
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                originalUnitPrice
                originalTotal
                discountedUnitPrice
                discountedTotal
                sku
                vendor
                requiresShipping
                taxable
                product {
                  id
                  title
                  handle
                  vendor
                }
                variant {
                  id
                  title
                  sku
                  price
                  weight
                  weightUnit
                }
              }
            }
          }
          tags
          fulfillments {
            id
            status
            createdAt
            updatedAt
            trackingInfo {
              number
              url
              company
            }
          }
          transactions {
            id
            status
            kind
            gateway
            amount
            createdAt
          }
        }
      }
    }
  }
`;

// Enhanced query for products with complete data
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
          handle
          description
          descriptionHtml
          vendor
          productType
          status
          publishedAt
          createdAt
          updatedAt
          options {
            id
            name
            values
          }
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
                position
                inventoryPolicy
                inventoryQuantity
                inventoryManagement
                weight
                weightUnit
                requiresShipping
                taxable
                barcode
                option1
                option2
                option3
              }
            }
          }
          images(first: 20) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          tags
          metafields(first: 10) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
          seo {
            title
            description
          }
        }
      }
    }
  }
`;

// Helper function to construct date range query
export function buildOrderDateQuery(startDate?: Date, endDate?: Date): string {
  if (!startDate && !endDate) return '';

  const parts = [];
  if (startDate) {
    parts.push(`created_at:>='${startDate.toISOString()}'`);
  }
  if (endDate) {
    parts.push(`created_at:<='${endDate.toISOString()}'`);
  }

  return parts.join(' AND ');
}

export type { OrdersResponse, ProductsResponse } from './types';
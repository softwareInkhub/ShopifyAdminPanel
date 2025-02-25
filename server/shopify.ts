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

// Create Shopify GraphQL client
const endpoint = `https://${process.env.SHOPIFY_SHOP_URL.trim()}/admin/api/2024-01/graphql.json`;

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
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFulfillmentStatus
          displayFinancialStatus
          createdAt
          updatedAt
          customer {
            firstName
            lastName
            email
          }
          shippingAddress {
            address1
            address2
            city
            province
            country
            zip
          }
          lineItems(first: 10) {
            edges {
              node {
                title
                quantity
                originalUnitPrice
                discountedUnitPrice
              }
            }
          }
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
          handle
          description
          descriptionHtml
          status
          totalInventory
          tracksInventory
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
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                inventoryQuantity
                sku
              }
            }
          }
          createdAt
          updatedAt
          publishedAt
        }
      }
    }
  }
`;
import { GraphQLClient } from 'graphql-request';

if (!process.env.SHOPIFY_SHOP_URL || !process.env.SHOPIFY_ACCESS_TOKEN) {
  throw new Error('Missing Shopify credentials');
}

const endpoint = `https://${process.env.SHOPIFY_SHOP_URL}/admin/api/2024-01/graphql.json`;

export const shopifyClient = new GraphQLClient(endpoint, {
  headers: {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
  },
});

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

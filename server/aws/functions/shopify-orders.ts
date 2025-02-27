export const shopifyOrdersLambda = `
const https = require('https');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });

const getShopifyOrders = async (url) => {
  const options = {
    hostname: process.env.SHOPIFY_SHOP_URL,
    path: url || '/admin/api/2024-01/orders.json?status=any&limit=250',
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          data: JSON.parse(data),
          nextPageUrl: res.headers.link?.match(/<([^>]+)>; rel="next"/)?.[1]
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

const writeOrdersToDynamoDB = async (orders) => {
  for (const order of orders) {
    const params = {
      TableName: 'shopify_orders',
      Item: marshall({
        id: order.id.toString(),
        order_number: order.order_number,
        email: order.email,
        created_at: order.created_at,
        total_price: order.total_price,
        currency: order.currency,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status || 'unfulfilled',
        customer: order.customer,
        line_items: order.line_items,
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        raw_data: order
      })
    };

    await dynamodb.send(new PutItemCommand(params));
  }
};

exports.handler = async (event) => {
  try {
    const url = event.nextPageUrl || null;
    const { data, nextPageUrl } = await getShopifyOrders(url);
    
    await writeOrdersToDynamoDB(data.orders);

    return {
      statusCode: 200,
      hasMorePages: !!nextPageUrl,
      nextPageUrl: nextPageUrl,
      processedOrders: data.orders.length
    };
  } catch (error) {
    console.error('Error processing orders:', error);
    throw error;
  }
};
`;

export const stepFunctionDefinition = {
  Comment: 'Shopify Orders Import State Machine',
  StartAt: 'ProcessOrders',
  States: {
    ProcessOrders: {
      Type: 'Task',
      Resource: '#{LambdaFunctionArn}',
      Next: 'CheckMorePages',
      Retry: [
        {
          ErrorEquals: ['States.TaskFailed'],
          IntervalSeconds: 30,
          MaxAttempts: 3,
          BackoffRate: 2.0
        }
      ],
      Catch: [
        {
          ErrorEquals: ['States.ALL'],
          Next: 'FailState',
          ResultPath: '$.error'
        }
      ]
    },
    CheckMorePages: {
      Type: 'Choice',
      Choices: [
        {
          Variable: '$.hasMorePages',
          BooleanEquals: true,
          Next: 'ProcessOrders'
        }
      ],
      Default: 'SuccessState'
    },
    SuccessState: {
      Type: 'Succeed'
    },
    FailState: {
      Type: 'Fail',
      Cause: 'Order Processing Failed',
      Error: '$.error'
    }
  }
};

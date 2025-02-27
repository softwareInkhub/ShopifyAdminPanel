import { 
  IAMClient, 
  CreateRoleCommand,
  PutRolePolicyCommand,
  AttachRolePolicyCommand,
  GetRoleCommand,
  IAMClientConfig
} from "@aws-sdk/client-iam";
import { logger } from '../../logger';

export class IAMService {
  private client: IAMClient;

  constructor(config?: IAMClientConfig) {
    this.client = new IAMClient(config || {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  async createLambdaRole(roleName: string = 'shopify-orders-lambda-role') {
    try {
      // Create the Lambda execution role
      const createRoleResponse = await this.client.send(new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com'
            },
            Action: 'sts:AssumeRole'
          }]
        })
      }));

      // Attach AWS managed policy for Lambda basic execution
      await this.client.send(new AttachRolePolicyCommand({
        RoleName: roleName,
        PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
      }));

      // Add inline policy for DynamoDB access
      await this.client.send(new PutRolePolicyCommand({
        RoleName: roleName,
        PolicyName: 'DynamoDBAccess',
        PolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Action: [
              'dynamodb:PutItem',
              'dynamodb:GetItem',
              'dynamodb:Query',
              'dynamodb:Scan'
            ],
            Resource: `arn:aws:dynamodb:${process.env.AWS_REGION}:*:table/shopify_orders`
          }]
        })
      }));

      return createRoleResponse.Role;
    } catch (error) {
      logger.server.error('Error creating Lambda role');
      throw error;
    }
  }

  async createStepFunctionsRole(roleName: string = 'shopify-orders-stepfunctions-role') {
    try {
      // Create the Step Functions execution role
      const createRoleResponse = await this.client.send(new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: {
              Service: 'states.amazonaws.com'
            },
            Action: 'sts:AssumeRole'
          }]
        })
      }));

      // Add inline policy for Lambda invocation
      await this.client.send(new PutRolePolicyCommand({
        RoleName: roleName,
        PolicyName: 'LambdaInvocation',
        PolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Action: [
              'lambda:InvokeFunction'
            ],
            Resource: '*'
          }]
        })
      }));

      return createRoleResponse.Role;
    } catch (error) {
      logger.server.error('Error creating Step Functions role');
      throw error;
    }
  }

  async getRoleArn(roleName: string) {
    try {
      const response = await this.client.send(new GetRoleCommand({
        RoleName: roleName
      }));
      return response.Role?.Arn;
    } catch (error) {
      logger.server.error('Error getting role ARN');
      throw error;
    }
  }
}

export const iamService = new IAMService();

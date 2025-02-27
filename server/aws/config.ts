import {
  IAMClient,
  GetUserCommand
} from "@aws-sdk/client-iam";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { SNSClient } from "@aws-sdk/client-sns";
import { SQSClient } from "@aws-sdk/client-sqs";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { EC2Client } from "@aws-sdk/client-ec2";
import { ECSClient } from "@aws-sdk/client-ecs";
import { AmplifyClient } from "@aws-sdk/client-amplify";
import { SFNClient } from "@aws-sdk/client-sfn";
import { ApiGatewayV2Client } from "@aws-sdk/client-apigatewayv2";
import { fromEnv } from "@aws-sdk/credential-provider-env";
import { logger } from '../logger';

// AWS SDK Configuration
const awsConfig = {
  region: process.env.AWS_REGION,
  credentials: fromEnv()
};

// Create service clients
export const iamClient = new IAMClient(awsConfig);
export const s3Client = new S3Client(awsConfig);
export const dynamoClient = new DynamoDBClient(awsConfig);
export const lambdaClient = new LambdaClient(awsConfig);
export const snsClient = new SNSClient(awsConfig);
export const sqsClient = new SQSClient(awsConfig);
export const cloudFormationClient = new CloudFormationClient(awsConfig);
export const ec2Client = new EC2Client(awsConfig);
export const ecsClient = new ECSClient(awsConfig);
export const amplifyClient = new AmplifyClient(awsConfig);
export const sfnClient = new SFNClient(awsConfig);
export const apiGatewayClient = new ApiGatewayV2Client(awsConfig);

// Initialize AWS services
export async function initializeAWSServices() {
  try {
    logger.server.info('Initializing AWS services...');

    // Test IAM connection
    const command = new GetUserCommand({});
    await iamClient.send(command);
    logger.server.info('AWS services initialized successfully');

    return true;
  } catch (error) {
    logger.server.error('Failed to initialize AWS services:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
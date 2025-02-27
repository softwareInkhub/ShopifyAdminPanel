import { 
  DynamoDBClient, 
  PutItemCommand, 
  GetItemCommand, 
  QueryCommand,
  ScanCommand,
  DeleteItemCommand,
  UpdateItemCommand,
  CreateTableCommand,
  DeleteTableCommand,
  ListTablesCommand,
  DescribeTableCommand,
  DynamoDBClientConfig,
  AttributeValue
} from "@aws-sdk/client-dynamodb";
import { logger } from '../../logger';

export class DynamoDBService {
  public client: DynamoDBClient;

  constructor(config?: DynamoDBClientConfig) {
    this.client = new DynamoDBClient(config || {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  async listTables() {
    try {
      const command = new ListTablesCommand({});
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error listing DynamoDB tables');
      throw error;
    }
  }

  async describeTable(tableName: string) {
    try {
      const command = new DescribeTableCommand({
        TableName: tableName
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error describing DynamoDB table');
      throw error;
    }
  }

  async createTable(params: CreateTableCommand['input']) {
    try {
      const command = new CreateTableCommand(params);
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error creating DynamoDB table');
      throw error;
    }
  }

  async deleteTable(tableName: string) {
    try {
      const command = new DeleteTableCommand({
        TableName: tableName
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error deleting DynamoDB table');
      throw error;
    }
  }

  async putItem(tableName: string, item: Record<string, AttributeValue>) {
    try {
      const command = new PutItemCommand({
        TableName: tableName,
        Item: item,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error putting item in DynamoDB');
      throw error;
    }
  }

  async getItem(tableName: string, key: Record<string, AttributeValue>) {
    try {
      const command = new GetItemCommand({
        TableName: tableName,
        Key: key,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error getting item from DynamoDB');
      throw error;
    }
  }

  async query(params: QueryCommand['input']) {
    try {
      const command = new QueryCommand(params);
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error querying DynamoDB');
      throw error;
    }
  }

  async scan(params: ScanCommand['input']) {
    try {
      const command = new ScanCommand(params);
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error scanning DynamoDB');
      throw error;
    }
  }

  async updateItem(params: UpdateItemCommand['input']) {
    try {
      const command = new UpdateItemCommand(params);
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error updating item in DynamoDB');
      throw error;
    }
  }

  async deleteItem(tableName: string, key: Record<string, AttributeValue>) {
    try {
      const command = new DeleteItemCommand({
        TableName: tableName,
        Key: key,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error deleting item from DynamoDB');
      throw error;
    }
  }
}

export const dynamoDBService = new DynamoDBService();
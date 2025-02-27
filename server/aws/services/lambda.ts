import { 
  LambdaClient,
  ListFunctionsCommand,
  CreateFunctionCommand,
  DeleteFunctionCommand,
  UpdateFunctionCodeCommand,
  InvokeCommand,
  GetFunctionCommand,
  LambdaClientConfig,
  FunctionConfiguration
} from "@aws-sdk/client-lambda";
import { logger } from '../../logger';

export class LambdaService {
  public client: LambdaClient;

  constructor(config?: LambdaClientConfig) {
    this.client = new LambdaClient(config || {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  async listFunctions() {
    try {
      const command = new ListFunctionsCommand({});
      const response = await this.client.send(command);
      return response.Functions || [];
    } catch (error) {
      logger.server.error('Error listing Lambda functions');
      throw error;
    }
  }

  async getFunction(functionName: string) {
    try {
      const command = new GetFunctionCommand({
        FunctionName: functionName
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error getting Lambda function');
      throw error;
    }
  }

  async createFunction(params: CreateFunctionCommand['input']) {
    try {
      const command = new CreateFunctionCommand(params);
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error creating Lambda function');
      throw error;
    }
  }

  async deleteFunction(functionName: string) {
    try {
      const command = new DeleteFunctionCommand({
        FunctionName: functionName
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error deleting Lambda function');
      throw error;
    }
  }

  async updateFunctionCode(params: UpdateFunctionCodeCommand['input']) {
    try {
      const command = new UpdateFunctionCodeCommand(params);
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error updating Lambda function code');
      throw error;
    }
  }

  async invokeFunction(functionName: string, payload?: Record<string, any>) {
    try {
      const command = new InvokeCommand({
        FunctionName: functionName,
        Payload: payload ? Buffer.from(JSON.stringify(payload)) : undefined
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error invoking Lambda function');
      throw error;
    }
  }
}

export const lambdaService = new LambdaService();

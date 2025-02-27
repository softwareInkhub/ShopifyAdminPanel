import {
  SFNClient,
  CreateStateMachineCommand,
  StartExecutionCommand,
  DeleteStateMachineCommand,
  DescribeExecutionCommand,
  SFNClientConfig
} from "@aws-sdk/client-sfn";
import { logger } from '../../logger';

export class StepFunctionsService {
  private client: SFNClient;

  constructor(config?: SFNClientConfig) {
    this.client = new SFNClient(config || {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  async createStateMachine(params: CreateStateMachineCommand['input']) {
    try {
      const command = new CreateStateMachineCommand(params);
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error creating Step Function state machine');
      throw error;
    }
  }

  async startExecution(params: StartExecutionCommand['input']) {
    try {
      const command = new StartExecutionCommand(params);
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error starting Step Function execution');
      throw error;
    }
  }

  async deleteStateMachine(stateMachineArn: string) {
    try {
      const command = new DeleteStateMachineCommand({
        stateMachineArn
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error deleting Step Function state machine');
      throw error;
    }
  }

  async getExecutionStatus(executionArn: string) {
    try {
      const command = new DescribeExecutionCommand({
        executionArn
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error getting Step Function execution status');
      throw error;
    }
  }
}

export const stepFunctionsService = new StepFunctionsService();

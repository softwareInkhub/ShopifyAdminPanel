import { 
  IAMClient,
  GetUserCommand,
  CreateUserCommand,
  ListUsersCommand,
  GetUserResponse,
  CreateAccessKeyCommand,
  DeleteAccessKeyCommand,
  UpdateUserCommand,
  ChangePasswordCommand,
  type User,
  type AccessKey
} from "@aws-sdk/client-iam";
import { iamClient } from '../config';
import { logger } from '../../logger';

export class IAMService {
  private client: IAMClient;

  constructor() {
    this.client = iamClient;
  }

  async getCurrentUser(): Promise<GetUserResponse> {
    try {
      const command = new GetUserCommand({});
      return await this.client.send(command);
    } catch (error) {
      logger.server.error('Error getting current IAM user:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async listUsers() {
    try {
      const command = new ListUsersCommand({});
      return await this.client.send(command);
    } catch (error) {
      logger.server.error('Error listing IAM users:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async createUser(username: string) {
    try {
      const command = new CreateUserCommand({
        UserName: username
      });
      return await this.client.send(command);
    } catch (error) {
      logger.server.error('Error creating IAM user:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async createAccessKey(username: string) {
    try {
      const command = new CreateAccessKeyCommand({
        UserName: username
      });
      return await this.client.send(command);
    } catch (error) {
      logger.server.error('Error creating access key:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async deleteAccessKey(username: string, accessKeyId: string) {
    try {
      const command = new DeleteAccessKeyCommand({
        UserName: username,
        AccessKeyId: accessKeyId
      });
      return await this.client.send(command);
    } catch (error) {
      logger.server.error('Error deleting access key:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async updateUser(username: string, newUsername?: string) {
    try {
      const command = new UpdateUserCommand({
        UserName: username,
        NewUserName: newUsername
      });
      return await this.client.send(command);
    } catch (error) {
      logger.server.error('Error updating user:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async changePassword(oldPassword: string, newPassword: string) {
    try {
      const command = new ChangePasswordCommand({
        OldPassword: oldPassword,
        NewPassword: newPassword
      });
      return await this.client.send(command);
    } catch (error) {
      logger.server.error('Error changing password:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

export const iamService = new IAMService();
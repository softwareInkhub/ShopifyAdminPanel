import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  S3ClientConfig,
  _Object
} from "@aws-sdk/client-s3";
import { logger } from '../../logger';

export class S3Service {
  private client: S3Client;

  constructor(config?: S3ClientConfig) {
    this.client = new S3Client(config || {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  async listBuckets() {
    try {
      const command = new ListBucketsCommand({});
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error listing S3 buckets');
      throw error;
    }
  }

  async createBucket(bucketName: string) {
    try {
      const command = new CreateBucketCommand({
        Bucket: bucketName,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error creating S3 bucket');
      throw error;
    }
  }

  async deleteBucket(bucketName: string) {
    try {
      const command = new DeleteBucketCommand({
        Bucket: bucketName,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error deleting S3 bucket');
      throw error;
    }
  }

  async listObjects(bucketName: string) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error listing S3 objects');
      throw error;
    }
  }

  async uploadFile(bucketName: string, key: string, body: Buffer) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error uploading to S3');
      throw error;
    }
  }

  async getFile(bucketName: string, key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error getting file from S3');
      throw error;
    }
  }

  async deleteObject(bucketName: string, key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      logger.server.error('Error deleting S3 object');
      throw error;
    }
  }
}

export const s3Service = new S3Service();
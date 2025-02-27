import { Router } from 'express';
import { iamService } from './services/iam';
import { logger } from '../logger';
import { z } from 'zod';

const router = Router();

// Validation schema for AWS credentials
const awsCredentialsSchema = z.object({
  accessKeyId: z.string().min(16).max(128),
  secretAccessKey: z.string().min(16).max(128),
});

// Get current AWS user
router.get('/current-user', async (req, res) => {
  try {
    const user = await iamService.getCurrentUser();
    res.json(user.User);
  } catch (error) {
    logger.server.error('Error fetching current AWS user:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(401).json({
      message: 'Failed to fetch AWS user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AWS login
router.post('/login', async (req, res) => {
  try {
    // Validate credentials
    const { accessKeyId, secretAccessKey } = awsCredentialsSchema.parse(req.body);

    // Store AWS credentials in session
    if (!req.session) {
      throw new Error('Session not initialized');
    }

    req.session.awsCredentials = {
      accessKeyId,
      secretAccessKey,
      region: process.env.AWS_REGION
    };

    // Verify credentials by getting user info
    const user = await iamService.getCurrentUser();
    res.json(user.User);
  } catch (error) {
    logger.server.error('AWS login error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(401).json({
      message: 'AWS authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AWS logout
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.awsCredentials = null;
  }
  res.json({ message: 'Logged out successfully' });
});

export const awsRoutes = router;
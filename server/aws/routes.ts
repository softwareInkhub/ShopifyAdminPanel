import { Router } from 'express';
import { iamService } from './services/iam';
import { logger } from '../logger';
import { z } from 'zod';
import session from 'express-session';
import { fromEnv } from "@aws-sdk/credential-provider-env";

const router = Router();

// AWS credentials validation schema
const awsCredentialsSchema = z.object({
  accessKeyId: z.string().min(16).max(128),
  secretAccessKey: z.string().min(16).max(128),
});

// Express session configuration
router.use(session({
  secret: process.env.SESSION_SECRET || 'aws-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Get current AWS user
router.get('/current-user', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session?.awsCredentials) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

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
    const credentials = awsCredentialsSchema.parse(req.body);

    // Set environment variables temporarily for this request
    process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;

    // Verify credentials by getting user info
    const user = await iamService.getCurrentUser();

    // Store credentials in session if verification successful
    if (req.session) {
      req.session.awsCredentials = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: process.env.AWS_REGION
      };
    }

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
    delete req.session.awsCredentials;
  }
  res.json({ message: 'Logged out successfully' });
});

export const awsRoutes = router;
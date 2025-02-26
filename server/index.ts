import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { getDb } from "./firebase";
import { logger } from './logger';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const app = express();
app.use(express.json());

// Ensure client/dist exists
const distDir = join(process.cwd(), 'client', 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Enhanced CSP headers with WebSocket support
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "img-src 'self' data: https:;"
  );
  next();
});

// Basic logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.server.info(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Basic error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.server.error('Unhandled error');
  res.status(500).json({ 
    status: 'error',
    message: 'Internal Server Error'
  });
});

// Health check endpoint
app.get("/health", async (_req, res) => {
  try {
    const db = await getDb();
    res.json({
      status: 'healthy',
      timestamp: new Date()
    });
  } catch (error) {
    logger.server.error('Health check failed');
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server only after Firebase is initialized
(async () => {
  try {
    const startTime = Date.now();
    logger.server.info('Starting server initialization...');

    // Initialize Firebase first
    logger.server.info('Waiting for Firebase initialization...');
    await getDb();
    logger.server.info(`Firebase initialized in ${Date.now() - startTime}ms`);

    // Register API routes
    await registerRoutes(app);
    logger.server.info('API routes registered');

    // Setup Vite for development
    await setupVite(app);
    logger.server.info('Vite middleware configured');

    // Start server
    const port = 5000;
    app.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      logger.server.info(`Server started on port ${port} (${Date.now() - startTime}ms total startup time)`);
    });

  } catch (error) {
    logger.server.error('Failed to start server');
    logger.server.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
})();

// Handle process errors
process.on('uncaughtException', (error) => {
  logger.server.error('Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.server.error('Unhandled rejection');
});
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { db } from "./firebase";
import { logger } from './logger';

const app = express();
app.use(express.json());

// Basic logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      logger.server.info(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
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
app.get("/health", (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date()
  });
});

(async () => {
  try {
    logger.server.info('Starting server initialization');

    // Set up Vite for development
    await setupVite(app);
    logger.server.info('Vite middleware configured');

    // Register API routes
    await registerRoutes(app);
    logger.server.info('Routes registered successfully');

    const port = 5000;
    app.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      logger.server.info(`Server started on port ${port}`);
    });

  } catch (error) {
    logger.server.error('Failed to start server');
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
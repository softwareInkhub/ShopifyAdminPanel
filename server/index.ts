import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { db } from "./firebase";
import { logger } from './logger';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      logger.server.info(logLine);
    }
  });

  next();
});

// Enhanced error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.server.error('Unhandled error');
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const details = err.stack || '';

  res.status(status).json({ 
    status: 'error',
    message,
    details,
    timestamp: new Date()
  });
});

// Health check endpoint with detailed diagnostics
app.get("/health", async (_req, res) => {
  try {
    // Test Firebase connection
    await db.collection('health_check').doc('status').set({
      timestamp: new Date(),
      status: 'healthy'
    });

    res.json({
      status: 'healthy',
      timestamp: new Date(),
      services: {
        firebase: 'connected',
        server: 'running'
      }
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

(async () => {
  try {
    logger.server.info('Starting server initialization');

    const server = await registerRoutes(app);
    logger.server.info('Routes registered successfully');

    if (app.get("env") === "development") {
      await setupVite(app, server);
      logger.server.info('Vite middleware configured for development');
    } else {
      serveStatic(app);
      logger.server.info('Static file serving configured for production');
    }

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.server.info(`Server started on port ${port}`);
    });

    // Error handling
    server.on('error', (error: Error) => {
      logger.server.error('Server error');
      process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.server.error('Uncaught exception');
      server.close(() => process.exit(1));
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.server.error('Unhandled rejection');
    });

  } catch (error) {
    logger.server.error('Failed to start server');
    process.exit(1);
  }
})();

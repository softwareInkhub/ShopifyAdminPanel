import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./firebase";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// Enhanced error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
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
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

(async () => {
  try {
    console.log('Starting server initialization...');

    // Register routes and get HTTP server
    const server = await registerRoutes(app);
    console.log('Routes registered successfully');

    // Set up static file serving or Vite middleware
    if (app.get("env") === "development") {
      await setupVite(app, server);
      console.log('Vite middleware configured for development');
    } else {
      serveStatic(app);
      console.log('Static file serving configured for production');
    }

    // Start the server
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server started successfully and serving on port ${port}`);
    });

    // Error handling for the server
    server.on('error', (error: Error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir);
}

// Create separate log files for different concerns
const cacheLogger = createWriteStream(join(logsDir, 'cache.log'), { flags: 'a' });
const serverLogger = createWriteStream(join(logsDir, 'server.log'), { flags: 'a' });
const syncLogger = createWriteStream(join(logsDir, 'sync.log'), { flags: 'a' });

function formatLog(level: string, message: string): string {
  return `[${new Date().toISOString()}] ${level}: ${message}\n`;
}

export const logger = {
  cache: {
    info: (message: string) => cacheLogger.write(formatLog('INFO', message)),
    error: (message: string) => cacheLogger.write(formatLog('ERROR', message)),
    debug: (message: string) => {
      if (process.env.NODE_ENV === 'development') {
        cacheLogger.write(formatLog('DEBUG', message));
      }
    }
  },
  server: {
    info: (message: string) => serverLogger.write(formatLog('INFO', message)),
    error: (message: string) => serverLogger.write(formatLog('ERROR', message)),
    debug: (message: string) => {
      if (process.env.NODE_ENV === 'development') {
        serverLogger.write(formatLog('DEBUG', message));
      }
    }
  },
  sync: {
    info: (message: string) => syncLogger.write(formatLog('INFO', message)),
    error: (message: string) => syncLogger.write(formatLog('ERROR', message)),
    debug: (message: string) => {
      if (process.env.NODE_ENV === 'development') {
        syncLogger.write(formatLog('DEBUG', message));
      }
    }
  }
};

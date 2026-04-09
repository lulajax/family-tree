/**
 * Express server entrypoint.
 */

import dotenv from 'dotenv';
dotenv.config();

import compression from 'compression';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import path from 'path';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import apiRoutes from './routes';
import { checkDatabaseHealth, closeDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/error';
import { requestIdMiddleware } from './middleware/requestId';
import { responseFormatter } from './middleware/response';
import { logStream, logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

const app: Application = express();

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(hpp());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(requestIdMiddleware);
app.use(responseFormatter);
app.use(morgan('combined', { stream: logStream }));

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/ready' || req.path === '/live',
});

app.use(limiter);

app.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  const healthy = dbHealth.healthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
    checks: {
      database: {
        status: healthy ? 'up' : 'down',
        latency: `${dbHealth.latency}ms`,
      },
    },
  });
});

app.get('/ready', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();

  if (!dbHealth.healthy) {
    res.status(503).json({
      status: 'not_ready',
      reason: 'database_unavailable',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

app.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Static file serving for uploads (photos etc.)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

app.use(API_PREFIX, apiRoutes);

if (NODE_ENV === 'development') {
  app.get('/api/docs', (_req: Request, res: Response) => {
    res.json({
      openapi: '3.0.0',
      info: {
        title: '双系族谱系统 API',
        version: '1.0.0',
        description: '双系族谱系统 RESTful API 文档',
      },
      servers: [
        {
          url: `http://localhost:${PORT}${API_PREFIX}`,
          description: '本地开发服务器',
        },
      ],
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`API server listening on ${PORT}`);
});

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down`);

  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  void gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
});

export { app };
export default app;

/**
 * PostgreSQL connection helpers.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

export const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'genealogy_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
});

dbPool.on('connect', () => {
  logger.debug('New database connection established');
});

dbPool.on('error', (error) => {
  logger.error('Unexpected database pool error', error);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return dbPool.query<T>(sql, params);
}

export async function queryWithRetry<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  maxRetries = 3
): Promise<QueryResult<T>> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await query<T>(sql, params);
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Query attempt ${attempt} failed`, error);

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error('Query failed');
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getClient(): Promise<PoolClient> {
  return dbPool.connect();
}

export async function queryWithTemporal<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  _asOfDate?: Date
): Promise<QueryResult<T>> {
  return query<T>(sql, params);
}

export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
}> {
  const start = Date.now();

  try {
    await query('SELECT 1');
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    logger.error('Database health check failed', error);
    return { healthy: false, latency: Date.now() - start };
  }
}

export async function closeDatabase(): Promise<void> {
  logger.info('Closing database pool');
  await dbPool.end();
}

export default dbPool;

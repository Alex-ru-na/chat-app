import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

/**
 * Single PrismaClient instance for the process. Reused across the app so we
 * never exhaust the connection pool. Kept out of the domain/application layers.
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export type DatabaseClient = typeof prisma;

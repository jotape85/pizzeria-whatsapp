import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // In build time or without DB, return a client that will fail gracefully at runtime
    console.warn('[prisma] DATABASE_URL not set — client created without connection');
    const adapter = new PrismaPg({ connectionString: 'postgresql://localhost/placeholder' });
    return new PrismaClient({
      adapter,
      log: ['error'],
    });
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

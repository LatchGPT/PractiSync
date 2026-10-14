import { PrismaClient } from '@prisma/client';

const prismaGlobal = globalThis as typeof globalThis & { practiSyncPrisma?: PrismaClient };

export const prisma = prismaGlobal.practiSyncPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') prismaGlobal.practiSyncPrisma = prisma;

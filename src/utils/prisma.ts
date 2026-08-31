import "dotenv/config"; // adapter reads DATABASE_URL eagerly — ensure .env is loaded first
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 driver adapter (node-postgres). No Rust query engine.
// Global `omit` replaces the old Mongoose `toJSON` that stripped `password`;
// `activationToken` is a security token that also shouldn't leak in responses.
// (The `_id` compatibility shim for the frontend lives in utils/response.ts.)
const createPrismaClient = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    omit: {
      user: { password: true, activationToken: true },
    },
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

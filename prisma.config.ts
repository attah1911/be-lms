import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 moved connection config out of schema.prisma.
// Migrations / introspection use DIRECT_URL (non-pooled); the app runtime
// connects via the driver adapter in src/utils/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});

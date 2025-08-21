import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/server/db/schema.ts",
  out: "./src/lib/server/db/migrations",
  dbCredentials: {
    // This needs to load env vars correctly for drizzle-kit
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
  envFile: '.env'
});

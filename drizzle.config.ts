import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

if (!process.env.PG_HOST || !process.env.PG_USER || !process.env.PG_DATABASE) {
  // Don't throw an error, just log it. This allows the app to start
  // without a fully configured DB, which is useful for frontend development.
  console.warn('Database connection details are not fully set in the environment variables. Drizzle Kit may not work correctly.');
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/server/db/schema.ts",
  out: "./src/lib/server/db/migrations",
  dbCredentials: {
    host: process.env.PG_HOST!,
    port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE!,
    ssl: 'allow', // allow self-signed certificates
  },
  verbose: true,
  strict: true,
});

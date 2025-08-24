import { defineConfig } from "drizzle-kit";
import { parse } from 'pg-connection-string';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in the environment variables');
}

const connectionString = process.env.DATABASE_URL;
const dbConfig = parse(connectionString);

// For local development, drizzle-kit connects directly via TCP.
// For production environments (like Cloud Run with a socket), migrations are
// typically run in a separate environment or CI/CD step that also connects via TCP.
// The socket connection logic is primarily for the running application, not for drizzle-kit.

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/server/db/schema.ts",
  out: "./src/lib/server/db/migrations",
  dbCredentials: {
    host: dbConfig.host!,
    port: dbConfig.port ? parseInt(dbConfig.port) : 5432,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database!,
  },
  verbose: true,
  strict: true,
});

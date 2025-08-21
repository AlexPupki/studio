import { defineConfig } from "drizzle-kit";
import { parse } from 'pg-connection-string';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in the environment variables');
}

const connectionString = process.env.DATABASE_URL;
const dbConfig = parse(connectionString);
const isCloudSql = !!process.env.DB_SOCKET_PATH;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/server/db/schema.ts",
  out: "./src/lib/server/db/migrations",
  dbCredentials: {
    host: isCloudSql ? `${process.env.DB_SOCKET_PATH}/${dbConfig.host}` : dbConfig.host!,
    port: dbConfig.port ? parseInt(dbConfig.port) : 5432,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database!,
  },
  verbose: true,
  strict: true,
});

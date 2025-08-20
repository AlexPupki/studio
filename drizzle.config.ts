import { defineConfig } from "drizzle-kit";
import { getEnv } from "./src/lib/server/config";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/server/db/schema.ts",
  out: "./src/lib/server/db/migrations",
  dbCredentials: {
    url: getEnv("DATABASE_URL"),
  },
  verbose: true,
  strict: true,
});

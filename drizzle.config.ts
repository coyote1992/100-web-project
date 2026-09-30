import { defineConfig } from "drizzle-kit"

const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL ?? "file:./data/hundred.db"
const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: authToken ? "turso" : "sqlite",
  dbCredentials: {
    url,
    authToken,
  },
})

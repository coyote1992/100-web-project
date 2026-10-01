import { defineConfig } from "drizzle-kit"

// Only used to generate migration files (npm run db:generate); the app never connects with this.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
})

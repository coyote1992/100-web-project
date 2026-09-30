import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: { position: "top-right" },
  // PGlite (the local stand-in for Supabase) loads its own WASM files, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Migrations are read from disk at runtime.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
}

export default nextConfig

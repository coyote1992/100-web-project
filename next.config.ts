import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Tasks used to be their own page; they live on the Overview now.
  async redirects() {
    return [{ source: "/tasks", destination: "/", permanent: true }]
  },
  devIndicators: { position: "top-right" },
  // PGlite (the local stand-in for Supabase) loads its own WASM files, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Migrations are read from disk at runtime.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
}

export default nextConfig

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The app is one dashboard now; old pages lead back to it.
  async redirects() {
    return ["/tasks", "/sites", "/insights", "/verticals", "/verticals/:id"].map((source) => ({ source, destination: "/", permanent: false }))
  },
  devIndicators: { position: "top-right" },
  // PGlite (the local stand-in for Supabase) loads its own WASM files, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Migrations are read from disk at runtime.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
}

export default nextConfig

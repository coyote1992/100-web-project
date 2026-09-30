import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: { position: "top-right" },
  // Migrations are read from disk at runtime.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
}

export default nextConfig

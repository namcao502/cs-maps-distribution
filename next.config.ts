import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 300,
      static: 300,
    },
  },
  turbopack: {
    resolveAlias: {
      // 7z-wasm references Node's 'module' built-in for feature detection.
      // It is only used client-side (dynamic import in extractors/sevenz.ts),
      // so we stub it out for the browser bundle.
      module: { browser: './src/lib/empty-module.ts' },
    },
  },
};

export default nextConfig;

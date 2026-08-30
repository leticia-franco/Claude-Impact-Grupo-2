import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Upload dos fechamentos na tela /ingestao (CSV de até ~60 MB).
      bodySizeLimit: "64mb",
    },
  },
};

export default nextConfig;

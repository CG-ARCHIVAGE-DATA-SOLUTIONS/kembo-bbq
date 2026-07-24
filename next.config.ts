import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Les Server Actions manipulent la caisse : on plafonne la taille des payloads.
    serverActions: { bodySizeLimit: "1mb" },
  },
};

export default nextConfig;

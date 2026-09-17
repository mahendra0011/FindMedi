import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This project lives in a monorepo; tell Turbopack where to find the
  // workspace root so it doesn't infer it from a parent package-lock.json.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

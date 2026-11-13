import type { NextConfig } from "next";

// All state lives in the browser (localStorage), so there is nothing to cache or prerender per user.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

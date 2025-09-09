/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    // Resolve node_modules from root
    config.resolve.modules = ["node_modules", "../../node_modules"];

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    return config;
  },
  images: {
    domains: ["localhost"],
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://localhost:3002/api/:path*",
      },
      // Proxy all API routes EXCEPT NextAuth routes to the backend
      {
        source: "/api/((?!auth).*)",
        destination: "http://localhost:3002/api/$1",
      },
      {
        source: "/socket.io/:path*",
        destination: "http://localhost:3002/socket.io/:path*",
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002",
    NEXT_PUBLIC_WS_URL:
      process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3002",
  },
};

module.exports = nextConfig;

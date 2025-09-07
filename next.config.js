/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    // Completely disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript checking during builds
    ignoreBuildErrors: true,
  },
  // Exclude backend files from Next.js processing
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  experimental: {
    externalDir: true,
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Exclude backend directory from frontend builds
    config.externals = config.externals || [];
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    
    // Exclude backend files from webpack processing
    config.module.rules.push({
      test: /src[\/\\]backend/,
      loader: 'ignore-loader',
    });

    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*", // NestJS backend
      },
      {
        source: "/socket.io/:path*",
        destination: "http://localhost:3001/socket.io/:path*", // WebSocket
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_WS_URL:
      process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001",
  },
  images: {
    domains: ["localhost"],
  },
};

module.exports = nextConfig;

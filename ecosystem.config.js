module.exports = {
  apps: [
    {
      name: "qoder-resume-backend",
      script: "dist/src/backend/main.js",
      cwd: ".",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3002,
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 3002,
      },
      // Monitoring
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 3,

      // Logging
      log_file: "logs/app.log",
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Advanced options
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
    },
    {
      name: "qoder-resume-frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: ".",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 3000,
      },
      // Monitoring
      max_memory_restart: "512M",
      min_uptime: "10s",
      max_restarts: 3,

      // Logging
      log_file: "logs/frontend.log",
      out_file: "logs/frontend-out.log",
      error_file: "logs/frontend-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Advanced options
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: "deploy",
      host: ["your-production-server.com"],
      ref: "origin/main",
      repo: "https://github.com/your-username/qoder-resume.git",
      path: "/var/www/qoder-resume",
      "post-deploy":
        "npm install --legacy-peer-deps && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save",
      env: {
        NODE_ENV: "production",
      },
    },
    staging: {
      user: "deploy",
      host: ["your-staging-server.com"],
      ref: "origin/develop",
      repo: "https://github.com/your-username/qoder-resume.git",
      path: "/var/www/qoder-resume-staging",
      "post-deploy":
        "npm install --legacy-peer-deps && npm run build && pm2 reload ecosystem.config.js --env staging && pm2 save",
      env: {
        NODE_ENV: "staging",
      },
    },
  },
};

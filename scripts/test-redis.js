#!/usr/bin/env node

/**
 * Redis Cloud Connection Test
 *
 * This script tests the connection to your Redis Cloud instance.
 * Make sure to set your REDIS_PASSWORD in the .env file before running.
 *
 * Usage: npm run test:redis
 */

const Redis = require("ioredis");
require("dotenv").config();

async function testRedisConnection() {
  console.log("🔗 Testing Redis Cloud Connection");
  console.log("================================");
  console.log(`Host: ${process.env.REDIS_HOST}`);
  console.log(`Port: ${process.env.REDIS_PORT}`);
  console.log(
    `Password: ${process.env.REDIS_PASSWORD ? "[PROVIDED]" : "[❌ NOT SET - Please add REDIS_PASSWORD to .env]"}`
  );
  console.log(`TLS Enabled: ${process.env.REDIS_TLS_ENABLED || "false"}`);

  if (
    !process.env.REDIS_PASSWORD ||
    process.env.REDIS_PASSWORD === "YOUR_REDIS_CLOUD_PASSWORD_HERE"
  ) {
    console.log("");
    console.log("❌ Please set your Redis Cloud password in the .env file:");
    console.log("   REDIS_PASSWORD=your_actual_redis_password");
    console.log("");
    process.exit(1);
  }

  const config = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
  };

  // Add TLS if enabled
  if (process.env.REDIS_TLS_ENABLED === "true") {
    config.tls = {
      rejectUnauthorized: false,
    };
    console.log("🔒 TLS/SSL enabled for secure connection");
  }

  const redis = new Redis(config);

  try {
    console.log("");
    console.log("🔄 Connecting to Redis Cloud...");

    await redis.connect();
    console.log("✅ Connected successfully!");

    // Test basic operations
    console.log("");
    console.log("🧪 Testing basic operations...");

    // Set a test value
    await redis.set(
      "qoder:test:connection",
      JSON.stringify({
        timestamp: new Date().toISOString(),
        message: "QoderResume Redis connection test successful!",
      }),
      "EX",
      60
    ); // Expire in 60 seconds

    // Get the test value
    const result = await redis.get("qoder:test:connection");
    const data = JSON.parse(result);

    console.log("✅ Write operation successful");
    console.log("✅ Read operation successful");
    console.log(`📝 Test data: ${data.message}`);

    // Test Redis info
    const info = await redis.info("server");
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    if (versionMatch) {
      console.log(`📊 Redis version: ${versionMatch[1]}`);
    }

    // Clean up test data
    await redis.del("qoder:test:connection");
    console.log("🧹 Test data cleaned up");

    console.log("");
    console.log("🎉 Redis Cloud connection test completed successfully!");
    console.log(
      "   Your application can now use Redis for caching and queues."
    );
  } catch (error) {
    console.log("");
    console.error("❌ Redis connection failed:", error.message);

    // Provide helpful debugging tips
    if (
      error.message.includes("WRONGPASS") ||
      error.message.includes("invalid password")
    ) {
      console.log("💡 Fix: Check your Redis password in the .env file");
      console.log(
        "   Make sure REDIS_PASSWORD matches your Redis Cloud password"
      );
    } else if (
      error.message.includes("ENOTFOUND") ||
      error.message.includes("getaddrinfo")
    ) {
      console.log("💡 Fix: Check your Redis host in the .env file");
      console.log("   Make sure REDIS_HOST is correct");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.log("💡 Fix: Check if your Redis Cloud instance is running");
      console.log("   Verify the host and port are correct");
    } else if (error.message.includes("SSL") || error.message.includes("TLS")) {
      console.log("💡 Fix: Try toggling TLS settings");
      console.log("   Set REDIS_TLS_ENABLED=true in .env if TLS is required");
      console.log("   Set REDIS_TLS_ENABLED=false if TLS is not needed");
    } else if (error.message.includes("timeout")) {
      console.log("💡 Fix: Connection timeout - check network connectivity");
    }

    console.log("");
    process.exit(1);
  } finally {
    await redis.disconnect();
    console.log("👋 Disconnected from Redis");
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

testRedisConnection();

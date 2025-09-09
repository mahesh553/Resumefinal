#!/usr/bin/env node

/**
 * Redis Cloud Connection Test - Using native redis package
 *
 * This script tests the connection using the standard redis package
 * with the exact configuration provided by the user.
 */

const { createClient } = require('redis');

async function testRedisNativeConnection() {
  console.log("🔗 Testing Redis Cloud Connection (native redis package)");
  console.log("========================================================");
  
  const client = createClient({
    username: 'default',
    password: 'TWDwQeA7FzI8DS8kFC6N5kE3uZPAFHNE',
    socket: {
      host: 'redis-15116.c273.us-east-1-2.ec2.redns.redis-cloud.com',
      port: 15116
    }
  });

  client.on('error', err => console.log('Redis Client Error', err));
  client.on('connect', () => console.log('✅ Redis client connected'));
  client.on('ready', () => console.log('✅ Redis client ready'));

  try {
    console.log("🔄 Connecting to Redis Cloud...");
    await client.connect();
    
    console.log("🧪 Testing basic operations...");
    
    // Test the exact operations from your example
    await client.set('foo', 'bar');
    const result = await client.get('foo');
    console.log(`📝 Result: ${result}`); // Should print "bar"
    
    // Test QoderResume specific operations
    await client.set('qoder:test:native', JSON.stringify({
      timestamp: new Date().toISOString(),
      message: "QoderResume Redis native connection test successful!",
      package: "redis"
    }), {
      EX: 60 // Expire in 60 seconds
    });
    
    const qoderResult = await client.get('qoder:test:native');
    const qoderData = JSON.parse(qoderResult);
    console.log(`📊 QoderResume test: ${qoderData.message}`);
    
    // Clean up
    await client.del('foo');
    await client.del('qoder:test:native');
    console.log("🧹 Test data cleaned up");
    
    console.log("");
    console.log("🎉 Redis native connection test completed successfully!");
    console.log("   The redis package works perfectly with your Redis Cloud instance.");
    
  } catch (error) {
    console.error("❌ Redis connection failed:", error.message);
    console.error("Full error:", error);
  } finally {
    await client.disconnect();
    console.log("👋 Disconnected from Redis");
  }
}

testRedisNativeConnection().catch(console.error);
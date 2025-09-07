async function globalTeardown() {
  console.log('🧹 Cleaning up test data...');
  
  // Clean up test data if needed
  // This could include API calls to clean up test users, data, etc.
  
  console.log('✅ Test cleanup complete');
}

export default globalTeardown;
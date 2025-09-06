#!/usr/bin/env node

/**
 * Database Optimization and Monitoring Script
 * Run this script periodically to maintain database health
 * 
 * Usage:
 * node scripts/db-optimize.js
 * npm run db:optimize
 */

const { DataSource } = require('typeorm');
const { config } = require('dotenv');

// Load environment variables
config();

// Database configuration
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || process.env.DB_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || process.env.DB_NAME || 'qoder_resume',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

class DatabaseOptimizer {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  async connect() {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  async disconnect() {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  /**
   * Analyze database performance and provide recommendations
   */
  async analyzePerformance() {
    console.log('🔍 Analyzing database performance...\n');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // 1. Check table sizes
      console.log('📊 Table Sizes:');
      const tableSizes = await queryRunner.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      
      tableSizes.forEach(table => {
        console.log(`  ${table.tablename}: ${table.size}`);
      });

      // 2. Check slow queries
      console.log('\n🐌 Slow Query Analysis:');
      const slowQueries = await queryRunner.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > 100
        ORDER BY mean_time DESC
        LIMIT 10
      `);

      if (slowQueries.length > 0) {
        slowQueries.forEach((query, index) => {
          console.log(`  ${index + 1}. Mean time: ${query.mean_time}ms, Calls: ${query.calls}`);
          console.log(`     Query: ${query.query.substring(0, 100)}...`);
        });
      } else {
        console.log('  No slow queries detected (or pg_stat_statements not enabled)');
      }

      // 3. Check index usage
      console.log('\n📈 Index Usage Analysis:');
      const indexUsage = await queryRunner.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          CASE WHEN idx_tup_read = 0 THEN 'Unused'
               WHEN idx_tup_read < 100 THEN 'Low usage'
               ELSE 'Active'
          END as usage_status
        FROM pg_stat_user_indexes 
        ORDER BY idx_tup_read DESC
        LIMIT 20
      `);

      indexUsage.forEach(index => {
        console.log(`  ${index.indexname}: ${index.usage_status} (reads: ${index.idx_tup_read})`);
      });

      // 4. Check for missing foreign keys
      console.log('\n🔗 Foreign Key Analysis:');
      const missingFKs = await queryRunner.query(`
        SELECT 
          conrelid::regclass AS table_name,
          conname AS constraint_name,
          pg_get_constraintdef(oid) AS constraint_definition
        FROM pg_constraint 
        WHERE contype = 'f'
        AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY conrelid::regclass::text
      `);

      if (missingFKs.length > 0) {
        console.log('  Existing foreign keys:');
        missingFKs.forEach(fk => {
          console.log(`    ${fk.table_name}: ${fk.constraint_name}`);
        });
      } else {
        console.log('  No foreign keys found - consider adding them for data integrity');
      }

      // 5. Database statistics
      console.log('\n📊 Database Statistics:');
      const dbStats = await queryRunner.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          current_setting('max_connections') as max_connections
      `);

      const stats = dbStats[0];
      console.log(`  Database size: ${stats.database_size}`);
      console.log(`  Active connections: ${stats.active_connections}/${stats.max_connections}`);

    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Vacuum and analyze tables for optimal performance
   */
  async optimizeTables() {
    console.log('\n🧹 Optimizing tables...\n');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Get all user tables
      const tables = await queryRunner.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      for (const table of tables) {
        console.log(`  Analyzing ${table.tablename}...`);
        
        // Analyze table for query planning optimization
        await queryRunner.query(`ANALYZE "${table.tablename}"`);
        
        // Check if table needs vacuuming
        const vacuumStats = await queryRunner.query(`
          SELECT 
            n_dead_tup,
            n_live_tup,
            CASE WHEN n_live_tup > 0 
                 THEN (n_dead_tup::float / n_live_tup::float) * 100 
                 ELSE 0 
            END as dead_tuple_percent
          FROM pg_stat_user_tables 
          WHERE relname = '${table.tablename}'
        `);

        if (vacuumStats.length > 0 && vacuumStats[0].dead_tuple_percent > 20) {
          console.log(`    Vacuuming ${table.tablename} (${vacuumStats[0].dead_tuple_percent.toFixed(1)}% dead tuples)...`);
          await queryRunner.query(`VACUUM "${table.tablename}"`);
        }
      }

      console.log('  ✅ Table optimization complete');

    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Check database health and provide recommendations
   */
  async healthCheck() {
    console.log('\n❤️  Database Health Check...\n');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Connection test
      const connectionTest = await queryRunner.query('SELECT 1 as connected');
      console.log(`  ✅ Database connection: ${connectionTest[0].connected ? 'OK' : 'Failed'}`);

      // Check for bloat
      const bloatCheck = await queryRunner.query(`
        SELECT 
          schemaname,
          tablename,
          ROUND((CASE WHEN otta=0 THEN 0.0 ELSE sml.relpages::float/otta END)::numeric,1) AS table_bloat,
          CASE WHEN relpages < otta THEN 0 ELSE bs*(sml.relpages-otta)::bigint END AS wastedbytes
        FROM (
          SELECT 
            schemaname, tablename, cc.reltuples, cc.relpages, bs,
            CEIL((cc.reltuples*((datahdr+ma-
              (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::float)) AS otta
          FROM (
            SELECT 
              ma,bs,schemaname,tablename,
              (datawidth+(hdr+ma-(case when hdr%ma=0 THEN ma ELSE hdr%ma END)))::numeric AS datahdr,
              (maxfracsum*(nullhdr+ma-(case when nullhdr%ma=0 THEN ma ELSE nullhdr%ma END))) AS nullhdr2
            FROM (
              SELECT 
                schemaname, tablename, hdr, ma, bs,
                SUM((1-null_frac)*avg_width) AS datawidth,
                MAX(null_frac) AS maxfracsum,
                hdr+(
                  SELECT 1+count(*)/8
                  FROM pg_stats s2
                  WHERE null_frac<>0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
                ) AS nullhdr
              FROM pg_stats s, (
                SELECT 
                  (SELECT current_setting('block_size')::numeric) AS bs,
                  CASE WHEN substring(version(),12,3) IN ('8.0','8.1','8.2') THEN 27 ELSE 23 END AS hdr,
                  CASE WHEN version() ~ 'mingw32' THEN 8 ELSE 4 END AS ma
              ) AS constants
              WHERE schemaname = 'public'
              GROUP BY 1,2,3,4,5
            ) AS foo
          ) AS rs
          JOIN pg_class cc ON cc.relname = rs.tablename
          JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname AND nn.nspname <> 'information_schema'
        ) AS sml
        WHERE sml.relpages > 0
        ORDER BY wastedbytes DESC
        LIMIT 10
      `);

      if (bloatCheck.length > 0) {
        console.log('  📊 Table bloat analysis:');
        bloatCheck.forEach(table => {
          if (table.table_bloat > 2) {
            console.log(`    ⚠️  ${table.tablename}: ${table.table_bloat}x bloated`);
          } else {
            console.log(`    ✅ ${table.tablename}: healthy`);
          }
        });
      }

      // Check cache hit ratio
      const cacheHitRatio = await queryRunner.query(`
        SELECT 
          ROUND(
            100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)),
            2
          ) AS cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      `);

      const hitRatio = parseFloat(cacheHitRatio[0]?.cache_hit_ratio || 0);
      if (hitRatio > 95) {
        console.log(`  ✅ Cache hit ratio: ${hitRatio}% (Excellent)`);
      } else if (hitRatio > 90) {
        console.log(`  ⚠️  Cache hit ratio: ${hitRatio}% (Good)`);
      } else {
        console.log(`  ❌ Cache hit ratio: ${hitRatio}% (Poor - consider increasing shared_buffers)`);
      }

    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generate performance recommendations
   */
  async generateRecommendations() {
    console.log('\n💡 Performance Recommendations:\n');

    const recommendations = [
      '1. Run VACUUM ANALYZE weekly on high-traffic tables',
      '2. Monitor slow queries using pg_stat_statements',
      '3. Ensure cache hit ratio stays above 95%',
      '4. Add indexes for frequently queried columns',
      '5. Use connection pooling in production',
      '6. Monitor table bloat and run VACUUM FULL if needed',
      '7. Set up automated backups',
      '8. Monitor disk space usage',
      '9. Consider partitioning for large tables',
      '10. Optimize frequently used queries'
    ];

    recommendations.forEach(rec => console.log(`  ${rec}`));
  }
}

async function main() {
  const optimizer = new DatabaseOptimizer(dataSource);

  try {
    await optimizer.connect();
    
    console.log('🚀 QoderResume Database Optimization Tool\n');
    console.log('==========================================\n');

    await optimizer.analyzePerformance();
    await optimizer.healthCheck();
    await optimizer.optimizeTables();
    await optimizer.generateRecommendations();

    console.log('\n✅ Database optimization complete!\n');

  } catch (error) {
    console.error('❌ Error during database optimization:', error.message);
    process.exit(1);
  } finally {
    await optimizer.disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseOptimizer };
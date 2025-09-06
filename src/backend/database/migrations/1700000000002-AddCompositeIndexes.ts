import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompositeIndexes1700000000002 implements MigrationInterface {
  name = 'AddCompositeIndexes1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // User composite indexes for common query patterns
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_user_email_active" 
      ON "users" ("email", "isActive") 
      WHERE "isActive" = true
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_user_role_created" 
      ON "users" ("role", "createdAt") 
      WHERE "role" = 'admin'
    `);

    // Resume composite indexes for performance optimization
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_resume_user_processed" 
      ON "resumes" ("userId", "isProcessed", "uploadedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_resume_user_score" 
      ON "resumes" ("userId", "atsScore" DESC) 
      WHERE "atsScore" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_resume_filetype_uploaded" 
      ON "resumes" ("fileType", "uploadedAt" DESC)
    `);

    // Resume Version composite indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_version_resume_number" 
      ON "resume_versions" ("resumeId", "versionNumber" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_version_resume_score" 
      ON "resume_versions" ("resumeId", "atsScore" DESC) 
      WHERE "atsScore" IS NOT NULL
    `);

    // Job Application composite indexes for tracking and analytics
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_job_user_status_date" 
      ON "job_applications" ("userId", "status", "appliedDate" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_job_user_followup" 
      ON "job_applications" ("userId", "followUpDate") 
      WHERE "followUpDate" IS NOT NULL AND "status" NOT IN ('rejected', 'withdrawn')
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_job_user_interview" 
      ON "job_applications" ("userId", "interviewDate") 
      WHERE "interviewDate" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_job_vendor_status" 
      ON "job_applications" ("vendorName", "status", "appliedDate" DESC)
    `);

    // JD Matching composite indexes for performance
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_jd_user_score_date" 
      ON "jd_matching_results" ("userId", "overallScore" DESC, "createdAt" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_jd_score_date" 
      ON "jd_matching_results" ("overallScore" DESC, "createdAt" DESC) 
      WHERE "overallScore" >= 70
    `);

    // Subscription composite indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_subscription_user_status" 
      ON "user_subscriptions" ("userId", "status", "currentPeriodEnd" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_subscription_active_end" 
      ON "user_subscriptions" ("status", "currentPeriodEnd") 
      WHERE "status" = 'active'
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_subscription_trial_end" 
      ON "user_subscriptions" ("trialEnd") 
      WHERE "trialEnd" IS NOT NULL AND "trialEnd" > NOW()
    `);

    // Full-text search indexes for resume content
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_resume_content_fulltext" 
      ON "resumes" USING gin(to_tsvector('english', "content"))
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_version_content_fulltext" 
      ON "resume_versions" USING gin(to_tsvector('english', "content"))
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_job_description_fulltext" 
      ON "jd_matching_results" USING gin(to_tsvector('english', "jobDescription"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop composite indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_email_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_role_created"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_resume_user_processed"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_resume_user_score"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_resume_filetype_uploaded"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_version_resume_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_version_resume_score"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_user_status_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_user_followup"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_user_interview"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_vendor_status"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jd_user_score_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jd_score_date"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscription_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscription_active_end"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscription_trial_end"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_resume_content_fulltext"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_version_content_fulltext"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_description_fulltext"`);
  }
}
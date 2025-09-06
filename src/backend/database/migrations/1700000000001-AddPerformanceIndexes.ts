import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1700000000001 implements MigrationInterface {
  name = 'AddPerformanceIndexes1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table indexes
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_stripe_customer" ON "users" ("stripeCustomerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_active" ON "users" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_created" ON "users" ("createdAt")`);

    // Resumes table indexes
    await queryRunner.query(`CREATE INDEX "IDX_resumes_user" ON "resumes" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_resumes_user_uploaded" ON "resumes" ("userId", "uploadedAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_resumes_ats_score" ON "resumes" ("atsScore")`);
    await queryRunner.query(`CREATE INDEX "IDX_resumes_processed" ON "resumes" ("isProcessed")`);
    await queryRunner.query(`CREATE INDEX "IDX_resumes_file_type" ON "resumes" ("fileType")`);
    await queryRunner.query(`CREATE INDEX "IDX_resumes_uploaded" ON "resumes" ("uploadedAt")`);

    // Resume versions table indexes
    await queryRunner.query(`CREATE INDEX "IDX_resume_versions_resume" ON "resume_versions" ("resumeId")`);
    await queryRunner.query(`CREATE INDEX "IDX_resume_versions_version" ON "resume_versions" ("resumeId", "versionNumber")`);
    await queryRunner.query(`CREATE INDEX "IDX_resume_versions_history" ON "resume_versions" ("resumeId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_resume_versions_ats" ON "resume_versions" ("atsScore")`);

    // Job applications table indexes
    await queryRunner.query(`CREATE INDEX "IDX_job_applications_user" ON "job_applications" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_job_applications_timeline" ON "job_applications" ("userId", "appliedDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_job_applications_status" ON "job_applications" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_job_applications_applied" ON "job_applications" ("appliedDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_job_applications_followup" ON "job_applications" ("followUpDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_job_applications_interview" ON "job_applications" ("interviewDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_job_applications_vendor" ON "job_applications" ("vendorName")`);

    // JD matching results table indexes
    await queryRunner.query(`CREATE INDEX "IDX_jd_matching_user" ON "jd_matching_results" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_jd_matching_score" ON "jd_matching_results" ("overallScore")`);
    await queryRunner.query(`CREATE INDEX "IDX_jd_matching_created" ON "jd_matching_results" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_jd_matching_history" ON "jd_matching_results" ("userId", "createdAt")`);

    // User subscriptions table indexes
    await queryRunner.query(`CREATE INDEX "IDX_user_subs_user" ON "user_subscriptions" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_subs_stripe" ON "user_subscriptions" ("stripeSubscriptionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_subs_status" ON "user_subscriptions" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_subs_period_end" ON "user_subscriptions" ("currentPeriodEnd")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_subs_active" ON "user_subscriptions" ("userId", "status")`);

    // Subscription plans table indexes
    await queryRunner.query(`CREATE INDEX "IDX_sub_plans_name" ON "subscription_plans" ("name")`);
    await queryRunner.query(`CREATE INDEX "IDX_sub_plans_active" ON "subscription_plans" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_sub_plans_stripe" ON "subscription_plans" ("stripeProductId")`);

    // Usage records table indexes
    await queryRunner.query(`CREATE INDEX "IDX_usage_user" ON "usage_records" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_usage_feature" ON "usage_records" ("userId", "feature")`);
    await queryRunner.query(`CREATE INDEX "IDX_usage_date" ON "usage_records" ("date")`);
    await queryRunner.query(`CREATE INDEX "IDX_usage_history" ON "usage_records" ("userId", "date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(`DROP INDEX "IDX_usage_history"`);
    await queryRunner.query(`DROP INDEX "IDX_usage_date"`);
    await queryRunner.query(`DROP INDEX "IDX_usage_feature"`);
    await queryRunner.query(`DROP INDEX "IDX_usage_user"`);
    
    await queryRunner.query(`DROP INDEX "IDX_sub_plans_stripe"`);
    await queryRunner.query(`DROP INDEX "IDX_sub_plans_active"`);
    await queryRunner.query(`DROP INDEX "IDX_sub_plans_name"`);
    
    await queryRunner.query(`DROP INDEX "IDX_user_subs_active"`);
    await queryRunner.query(`DROP INDEX "IDX_user_subs_period_end"`);
    await queryRunner.query(`DROP INDEX "IDX_user_subs_status"`);
    await queryRunner.query(`DROP INDEX "IDX_user_subs_stripe"`);
    await queryRunner.query(`DROP INDEX "IDX_user_subs_user"`);
    
    await queryRunner.query(`DROP INDEX "IDX_jd_matching_history"`);
    await queryRunner.query(`DROP INDEX "IDX_jd_matching_created"`);
    await queryRunner.query(`DROP INDEX "IDX_jd_matching_score"`);
    await queryRunner.query(`DROP INDEX "IDX_jd_matching_user"`);
    
    await queryRunner.query(`DROP INDEX "IDX_job_applications_vendor"`);
    await queryRunner.query(`DROP INDEX "IDX_job_applications_interview"`);
    await queryRunner.query(`DROP INDEX "IDX_job_applications_followup"`);
    await queryRunner.query(`DROP INDEX "IDX_job_applications_applied"`);
    await queryRunner.query(`DROP INDEX "IDX_job_applications_status"`);
    await queryRunner.query(`DROP INDEX "IDX_job_applications_timeline"`);
    await queryRunner.query(`DROP INDEX "IDX_job_applications_user"`);
    
    await queryRunner.query(`DROP INDEX "IDX_resume_versions_ats"`);
    await queryRunner.query(`DROP INDEX "IDX_resume_versions_history"`);
    await queryRunner.query(`DROP INDEX "IDX_resume_versions_version"`);
    await queryRunner.query(`DROP INDEX "IDX_resume_versions_resume"`);
    
    await queryRunner.query(`DROP INDEX "IDX_resumes_uploaded"`);
    await queryRunner.query(`DROP INDEX "IDX_resumes_file_type"`);
    await queryRunner.query(`DROP INDEX "IDX_resumes_processed"`);
    await queryRunner.query(`DROP INDEX "IDX_resumes_ats_score"`);
    await queryRunner.query(`DROP INDEX "IDX_resumes_user_uploaded"`);
    await queryRunner.query(`DROP INDEX "IDX_resumes_user"`);
    
    await queryRunner.query(`DROP INDEX "IDX_users_created"`);
    await queryRunner.query(`DROP INDEX "IDX_users_active"`);
    await queryRunner.query(`DROP INDEX "IDX_users_role"`);
    await queryRunner.query(`DROP INDEX "IDX_users_stripe_customer"`);
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);
  }
}
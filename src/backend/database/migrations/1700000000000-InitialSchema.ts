import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('user', 'admin')
    `);

    await queryRunner.query(`
      CREATE TYPE "job_status_enum" AS ENUM(
        'applied', 
        'under_review', 
        'interview_scheduled', 
        'interview_completed', 
        'offer_received', 
        'rejected', 
        'withdrawn'
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL UNIQUE,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'user',
        "stripeCustomerId" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "emailVerifiedAt" TIMESTAMP,
        "lastLoginAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create subscription plans table
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "displayName" character varying NOT NULL,
        "price" integer NOT NULL,
        "interval" character varying NOT NULL,
        "intervalCount" integer NOT NULL DEFAULT 1,
        "features" jsonb NOT NULL,
        "discountPercentage" integer,
        "stripeProductId" character varying,
        "stripePriceId" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create user subscriptions table
    await queryRunner.query(`
      CREATE TABLE "user_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "planId" uuid NOT NULL,
        "stripeSubscriptionId" character varying,
        "status" character varying NOT NULL,
        "currentPeriodStart" TIMESTAMP NOT NULL,
        "currentPeriodEnd" TIMESTAMP NOT NULL,
        "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_user_subscriptions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_subscriptions_plan" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT
      )
    `);

    // Create resumes table
    await queryRunner.query(`
      CREATE TABLE "resumes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "fileName" character varying NOT NULL,
        "fileSize" integer NOT NULL,
        "fileType" character varying NOT NULL,
        "content" text NOT NULL,
        "parsedContent" jsonb,
        "atsScore" decimal(5,2),
        "suggestions" jsonb NOT NULL DEFAULT '[]',
        "isProcessed" boolean NOT NULL DEFAULT false,
        "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_resumes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create resume versions table
    await queryRunner.query(`
      CREATE TABLE "resume_versions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "resumeId" uuid NOT NULL,
        "fileName" character varying NOT NULL,
        "fileSize" integer NOT NULL,
        "fileType" character varying NOT NULL,
        "content" text NOT NULL,
        "parsedContent" jsonb,
        "atsScore" decimal(5,2),
        "tag" character varying,
        "notes" text,
        "versionNumber" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_resume_versions_resume" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE
      )
    `);

    // Create job applications table
    await queryRunner.query(`
      CREATE TABLE "job_applications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "vendorName" character varying NOT NULL,
        "jobTitle" character varying NOT NULL,
        "jobDescription" text,
        "applicationUrl" character varying,
        "salaryRange" character varying,
        "location" character varying,
        "status" "job_status_enum" NOT NULL DEFAULT 'applied',
        "appliedDate" TIMESTAMP NOT NULL,
        "followUpDate" TIMESTAMP,
        "interviewDate" TIMESTAMP,
        "notes" text,
        "contactEmail" character varying,
        "contactPhone" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_job_applications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create JD matching results table
    await queryRunner.query(`
      CREATE TABLE "jd_matching_results" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "resumeContent" text NOT NULL,
        "jobDescription" text NOT NULL,
        "overallScore" decimal(5,2) NOT NULL,
        "keywordMatching" jsonb,
        "semanticMatching" jsonb,
        "suggestions" jsonb NOT NULL DEFAULT '[]',
        "matchedKeywords" text[] NOT NULL DEFAULT '{}',
        "missingKeywords" text[] NOT NULL DEFAULT '{}',
        "error" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_jd_matching_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create usage records table
    await queryRunner.query(`
      CREATE TABLE "usage_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "feature" character varying NOT NULL,
        "date" TIMESTAMP NOT NULL,
        "count" integer NOT NULL DEFAULT 1,
        "planLimit" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_usage_records_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "usage_records"`);
    await queryRunner.query(`DROP TABLE "jd_matching_results"`);
    await queryRunner.query(`DROP TABLE "job_applications"`);
    await queryRunner.query(`DROP TABLE "resume_versions"`);
    await queryRunner.query(`DROP TABLE "resumes"`);
    await queryRunner.query(`DROP TABLE "user_subscriptions"`);
    await queryRunner.query(`DROP TABLE "subscription_plans"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "job_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
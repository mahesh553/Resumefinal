import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
// Import User as type to avoid circular dependency
import type { User } from "./user.entity";

@Entity("resumes")
@Index(["userId"]) // For user resume queries
@Index(["userId", "uploadedAt"]) // For user resume history
@Index(["atsScore"]) // For filtering by ATS score
@Index(["isProcessed"]) // For processing queue queries
@Index(["fileType"]) // For filtering by file type
@Index(["uploadedAt"]) // For chronological sorting
export class Resume {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userId: string;

  @Column()
  fileName: string;

  @Column()
  fileSize: number;

  @Column()
  fileType: string;

  @Column("text")
  content: string;

  @Column("jsonb", { nullable: true })
  parsedContent: any;

  @Column("decimal", { precision: 5, scale: 2, nullable: true })
  atsScore?: number;

  @Column("jsonb", { default: [] })
  suggestions: any[];

  @Column({ default: false })
  isProcessed: boolean;

  @CreateDateColumn()
  uploadedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne("User", (user: any) => user.resumes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @OneToMany("ResumeVersion", (version: any) => version.resume)
  versions: any[];
}

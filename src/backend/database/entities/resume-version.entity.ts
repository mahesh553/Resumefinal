import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Resume } from './resume.entity';

@Entity('resume_versions')
@Index(['resumeId']) // For resume version queries
@Index(['resumeId', 'versionNumber']) // For specific version lookup
@Index(['resumeId', 'createdAt']) // For version history
@Index(['atsScore']) // For filtering by ATS score
export class ResumeVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resumeId: string;

  @Column()
  fileName: string;

  @Column()
  fileSize: number;

  @Column()
  fileType: string;

  @Column('text')
  content: string;

  @Column('jsonb', { nullable: true })
  parsedContent: any;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  atsScore?: number;

  @Column({ nullable: true })
  tag?: string;

  @Column('text', { nullable: true })
  notes?: string;

  @Column()
  versionNumber: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Resume, (resume) => resume.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resumeId' })
  resume: Resume;
}
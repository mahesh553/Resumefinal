import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum JobStatus {
  APPLIED = 'applied',
  UNDER_REVIEW = 'under_review',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  OFFER_RECEIVED = 'offer_received',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

@Entity('job_applications')
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  vendorName: string;

  @Column()
  jobTitle: string;

  @Column('text', { nullable: true })
  jobDescription?: string;

  @Column({ nullable: true })
  applicationUrl?: string;

  @Column({ nullable: true })
  salaryRange?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.APPLIED,
  })
  status: JobStatus;

  @Column()
  appliedDate: Date;

  @Column({ nullable: true })
  followUpDate?: Date;

  @Column({ nullable: true })
  interviewDate?: Date;

  @Column('text', { nullable: true })
  notes?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.jobApplications)
  @JoinColumn({ name: 'userId' })
  user: User;
}
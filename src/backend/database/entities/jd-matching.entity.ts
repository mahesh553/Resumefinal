import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('jd_matching_results')
@Index(['userId']) // For user matching queries
@Index(['overallScore']) // For filtering by match score
@Index(['createdAt']) // For chronological sorting
@Index(['userId', 'createdAt']) // For user matching history
export class JdMatching {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('text')
  resumeContent: string;

  @Column('text')
  jobDescription: string;

  @Column('decimal', { precision: 5, scale: 2 })
  overallScore: number;

  @Column('jsonb', { nullable: true })
  keywordMatching?: any;

  @Column('jsonb', { nullable: true })
  semanticMatching?: any;

  @Column('jsonb', { default: [] })
  suggestions: any[];

  @Column('text', { array: true, default: [] })
  matchedKeywords: string[];

  @Column('text', { array: true, default: [] })
  missingKeywords: string[];

  @Column('text', { nullable: true })
  error?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
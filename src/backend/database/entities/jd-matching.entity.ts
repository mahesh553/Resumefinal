import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('jd_matching_results')
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
}
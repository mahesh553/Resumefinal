import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { ResumeVersion } from './resume-version.entity';

@Entity('resumes')
export class Resume {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

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

  @Column('jsonb', { default: [] })
  suggestions: any[];

  @Column({ default: false })
  isProcessed: boolean;

  @CreateDateColumn()
  uploadedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.resumes)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => ResumeVersion, (version) => version.resume)
  versions: ResumeVersion[];
}
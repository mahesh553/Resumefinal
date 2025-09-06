import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity('user_subscriptions')
@Index(['userId']) // For user subscription queries
@Index(['stripeSubscriptionId']) // For Stripe webhook processing
@Index(['status']) // For filtering by subscription status
@Index(['currentPeriodEnd']) // For subscription expiry checks
@Index(['userId', 'status']) // For active user subscription queries
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  planId: string;

  @Column({ nullable: true })
  stripeSubscriptionId?: string;

  @Column()
  status: string; // active, canceled, past_due, unpaid

  @Column()
  currentPeriodStart: Date;

  @Column()
  currentPeriodEnd: Date;

  @Column({ default: false })
  cancelAtPeriodEnd: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('User', (user: any) => user.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: any;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planId' })
  plan: SubscriptionPlan;
}

@Entity('usage_records')
@Index(['userId']) // For user usage queries
@Index(['userId', 'feature']) // For feature-specific usage
@Index(['date']) // For usage analytics by date
@Index(['userId', 'date']) // For user usage history
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  feature: string; // resume_analysis, jd_matching

  @Column()
  date: Date;

  @Column({ default: 1 })
  count: number;

  @Column()
  planLimit: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: any;
}
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
import { User } from './user.entity';

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

  @ManyToOne(() => User, (user) => user.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planId' })
  plan: SubscriptionPlan;
}

@Entity('subscription_plans')
@Index(['name']) // For plan lookup by name
@Index(['isActive']) // For filtering active plans
@Index(['stripeProductId']) // For Stripe integration
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // free, pro_monthly, pro_3month, pro_6month

  @Column()
  displayName: string;

  @Column()
  price: number; // in cents

  @Column()
  interval: string; // month, year

  @Column({ default: 1 })
  intervalCount: number;

  @Column('jsonb')
  features: any;

  @Column({ nullable: true })
  discountPercentage?: number;

  @Column({ nullable: true })
  stripeProductId?: string;

  @Column({ nullable: true })
  stripePriceId?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
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

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
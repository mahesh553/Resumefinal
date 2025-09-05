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

@Entity('user_subscriptions')
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

  @ManyToOne(() => User, (user) => user.subscriptions)
  @JoinColumn({ name: 'userId' })
  user: User;
}

@Entity('subscription_plans')
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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
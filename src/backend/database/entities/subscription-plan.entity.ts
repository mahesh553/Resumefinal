import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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
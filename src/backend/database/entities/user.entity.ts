import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { JobApplication } from './job-application.entity';
import { UserSubscription } from './subscription.entity';
import { Role } from './role.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

// Keep legacy enum for backward compatibility
// New permission system uses Role entity

@Entity('users')
@Index(['email']) // For login queries
@Index(['stripeCustomerId']) // For Stripe webhook processing
@Index(['role']) // For admin queries
@Index(['isActive']) // For filtering active users
@Index(['createdAt']) // For user registration analytics
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  // New role-based permission system
  @ManyToOne(() => Role, (role) => role.users, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'role_id' })
  roleEntity?: Role;

  @Column({ name: 'role_id', nullable: true })
  roleId?: string;

  @Column({ nullable: true })
  stripeCustomerId?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  emailVerifiedAt?: Date;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('Resume', (resume: any) => resume.user)
  resumes: any[];

  @OneToMany(() => JobApplication, (job) => job.user)
  jobApplications: JobApplication[];

  @OneToMany(() => UserSubscription, (subscription) => subscription.user)
  subscriptions: UserSubscription[];

  // Helper method to check permissions using new role system
  hasPermission(action: string, resource: string): boolean {
    if (!this.roleEntity) {
      // Fallback to legacy role system
      return this.role === UserRole.ADMIN;
    }
    return this.roleEntity.hasPermission(action, resource);
  }

  // Helper method to get all permissions
  getPermissions(): string[] {
    if (!this.roleEntity) return [];
    return this.roleEntity.getPermissionStrings();
  }

  // Helper method to check if user is admin (legacy support)
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN || 
           (this.roleEntity?.type === 'admin' || this.roleEntity?.type === 'super_admin');
  }
}
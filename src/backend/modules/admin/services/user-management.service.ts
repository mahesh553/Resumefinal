import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { User, UserRole } from "../../../database/entities/user.entity";

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserSearchFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  verified?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "lastLoginAt" | "email" | "firstName";
  sortOrder?: "ASC" | "DESC";
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserStats {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  resumeCount: number;
  jobApplicationCount: number;
  averageAtsScore: number;
}

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async getUsers(filters: UserSearchFilters = {}): Promise<UserListResponse> {
    try {
      const {
        search = "",
        role,
        isActive,
        verified,
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = filters;

      const queryBuilder = this.userRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.resumes", "resume")
        .leftJoinAndSelect("user.jobApplications", "job");

      // Apply search filter
      if (search) {
        queryBuilder.andWhere(
          "(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)",
          { search: `%${search}%` }
        );
      }

      // Apply role filter
      if (role) {
        queryBuilder.andWhere("user.role = :role", { role });
      }

      // Apply active filter
      if (isActive !== undefined) {
        queryBuilder.andWhere("user.isActive = :isActive", { isActive });
      }

      // Apply verified filter
      if (verified !== undefined) {
        if (verified) {
          queryBuilder.andWhere("user.emailVerifiedAt IS NOT NULL");
        } else {
          queryBuilder.andWhere("user.emailVerifiedAt IS NULL");
        }
      }

      // Apply sorting
      queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

      // Apply pagination
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [users, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      return {
        users,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error("Failed to get users:", error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ["resumes", "jobApplications"],
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user;
    } catch (error) {
      this.logger.error(`Failed to get user ${id}:`, error);
      throw error;
    }
  }

  async getUserStats(id: string): Promise<UserStats> {
    try {
      const user = await this.getUserById(id);

      // Calculate statistics
      const resumeCount = user.resumes?.length || 0;
      const jobApplicationCount = user.jobApplications?.length || 0;

      // Mock average ATS score - would need actual resume analysis data
      const averageAtsScore = resumeCount > 0 ? 75.5 : 0;

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt ?? null,
        resumeCount,
        jobApplicationCount,
        averageAtsScore,
      };
    } catch (error) {
      this.logger.error(`Failed to get user stats for ${id}:`, error);
      throw error;
    }
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      const {
        email,
        firstName,
        lastName,
        password,
        role = UserRole.USER,
      } = createUserDto;

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });
      if (existingUser) {
        throw new BadRequestException("User with this email already exists");
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = this.userRepository.create({
        email,
        firstName,
        lastName,
        passwordHash,
        role,
        isActive: true,
      });

      const savedUser = await this.userRepository.save(user);

      this.logger.log(`Admin created user: ${email}`);
      return savedUser;
    } catch (error) {
      this.logger.error("Failed to create user:", error);
      throw error;
    }
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.getUserById(id);

      // Check for email conflicts if email is being updated
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: updateUserDto.email },
        });
        if (existingUser) {
          throw new BadRequestException("User with this email already exists");
        }
      }

      // Update user
      Object.assign(user, updateUserDto);
      const savedUser = await this.userRepository.save(user);

      this.logger.log(`Admin updated user: ${user.email}`);
      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to update user ${id}:`, error);
      throw error;
    }
  }

  async deactivateUser(id: string): Promise<User> {
    try {
      const user = await this.getUserById(id);

      if (user.role === UserRole.ADMIN) {
        throw new BadRequestException("Cannot deactivate admin users");
      }

      user.isActive = false;
      const savedUser = await this.userRepository.save(user);

      this.logger.log(`Admin deactivated user: ${user.email}`);
      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to deactivate user ${id}:`, error);
      throw error;
    }
  }

  async activateUser(id: string): Promise<User> {
    try {
      const user = await this.getUserById(id);
      user.isActive = true;
      const savedUser = await this.userRepository.save(user);

      this.logger.log(`Admin activated user: ${user.email}`);
      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to activate user ${id}:`, error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const user = await this.getUserById(id);

      if (user.role === UserRole.ADMIN) {
        throw new BadRequestException("Cannot delete admin users");
      }

      await this.userRepository.remove(user);
      this.logger.log(`Admin deleted user: ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to delete user ${id}:`, error);
      throw error;
    }
  }

  async promoteToAdmin(id: string): Promise<User> {
    try {
      const user = await this.getUserById(id);
      user.role = UserRole.ADMIN;
      const savedUser = await this.userRepository.save(user);

      this.logger.log(`User promoted to admin: ${user.email}`);
      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to promote user ${id} to admin:`, error);
      throw error;
    }
  }

  async demoteFromAdmin(id: string): Promise<User> {
    try {
      const user = await this.getUserById(id);

      // Check if this is the last admin
      const adminCount = await this.userRepository.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      if (adminCount <= 1) {
        throw new BadRequestException("Cannot demote the last admin user");
      }

      user.role = UserRole.USER;
      const savedUser = await this.userRepository.save(user);

      this.logger.log(`Admin demoted from admin: ${user.email}`);
      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to demote user ${id} from admin:`, error);
      throw error;
    }
  }

  async verifyUserEmail(id: string): Promise<User> {
    try {
      const user = await this.getUserById(id);
      user.emailVerifiedAt = new Date();
      const savedUser = await this.userRepository.save(user);

      this.logger.log(`Admin verified email for user: ${user.email}`);
      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to verify email for user ${id}:`, error);
      throw error;
    }
  }

  async resetUserPassword(id: string, newPassword: string): Promise<User> {
    try {
      const user = await this.getUserById(id);

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      user.passwordHash = passwordHash;
      const savedUser = await this.userRepository.save(user);

      this.logger.log(`Admin reset password for user: ${user.email}`);
      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to reset password for user ${id}:`, error);
      throw error;
    }
  }

  async getUserActivity(id: string, days: number = 30) {
    try {
      const user = await this.getUserById(id);

      // Mock activity data - would need actual activity tracking
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        activity: {
          logins: Math.floor(Math.random() * days),
          resumeUploads: Math.floor(Math.random() * 10),
          jobApplications: Math.floor(Math.random() * 20),
          lastActivity: user.lastLoginAt,
        },
        timeline: [], // Would contain actual activity timeline
      };
    } catch (error) {
      this.logger.error(`Failed to get user activity for ${id}:`, error);
      throw error;
    }
  }
}

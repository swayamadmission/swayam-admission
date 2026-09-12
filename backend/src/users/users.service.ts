import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Role } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { IdGeneratorService } from '../common/id-generator.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private authorizationService: AuthorizationService,
    private idGenerator: IdGeneratorService,
  ) {}

  async getMe(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Auto-generate missing student identifiers if student
    if (user.role === Role.STUDENT && (!user.studentId || !user.registrationNumber || !user.isApproved || user.status === 'PENDING_APPROVAL')) {
      const updates: any = {};
      if (!user.studentId) {
        updates.studentId = await this.idGenerator.generateStudentId();
      }
      if (!user.registrationNumber) {
        updates.registrationNumber = await this.idGenerator.generateRegistrationNumber(
          new Date(user.createdAt).getFullYear(),
        );
      }
      if (!user.isApproved || user.status === 'PENDING_APPROVAL' || !user.isActive) {
        updates.isApproved = true;
        updates.status = 'ACTIVE';
        updates.isActive = true;
      }
      if (!user.profile) {
        await this.prisma.studentProfile.create({
          data: {
            userId: user.id,
            nationality: 'Indian',
          },
        });
      }
      if (Object.keys(updates).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updates,
          include: {
            profile: true,
          },
        });
      }
    }

    let iamAccess = {
      roles: [] as any[],
      effectivePermissions: [] as string[],
      dataScopes: [] as string[],
      isSuperAdmin: user.role === Role.SUPER_ADMIN,
    };

    try {
      const access = await this.authorizationService.getUserEffectiveAccess(userId);
      iamAccess = {
        roles: access.roles,
        effectivePermissions: access.effectivePermissions,
        dataScopes: access.dataScopes,
        isSuperAdmin: access.isSuperAdmin || user.role === Role.SUPER_ADMIN,
      };
    } catch {
      iamAccess.isSuperAdmin = user.role === Role.SUPER_ADMIN;
    }

    const { password, ...userWithoutPassword } = user;

    // Sanitize profile by stripping PAN and Passport
    if (userWithoutPassword.profile) {
      const { pan, passport, ...cleanProfile } = userWithoutPassword.profile;
      userWithoutPassword.profile = cleanProfile as any;
    }

    return {
      ...userWithoutPassword,
      roles: iamAccess.roles,
      effectivePermissions: iamAccess.effectivePermissions,
      dataScopes: iamAccess.dataScopes,
      isSuperAdmin: iamAccess.isSuperAdmin,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Update User Table Fields
    const userUpdate: any = {};
    if (dto.fullName) userUpdate.fullName = dto.fullName.trim();
    if (dto.gender) userUpdate.gender = dto.gender;
    if (dto.dob) userUpdate.dateOfBirth = new Date(dto.dob);
    if (dto.country) userUpdate.country = dto.country;
    if (dto.state) userUpdate.state = dto.state;
    if (dto.city) userUpdate.city = dto.city;
    if (dto.address) userUpdate.address = dto.address;
    if (dto.pincode) userUpdate.pincode = dto.pincode;

    // Merge preferences
    if (dto.preferences) {
      const existingPrefs =
        typeof user.preferences === 'object' && user.preferences !== null
          ? (user.preferences as any)
          : {};
      userUpdate.preferences = {
        ...existingPrefs,
        ...dto.preferences,
      };
    }

    if (Object.keys(userUpdate).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: userUpdate,
      });
    }

    // 2. Upsert Student Profile
    const profileUpdate: any = {
      dob: dto.dob ? new Date(dto.dob) : undefined,
      gender: dto.gender,
      category: dto.category,
      address: dto.address,
      city: dto.city,
      district: dto.district,
      state: dto.state,
      pincode: dto.pincode,
      nationality: dto.country || user.country || 'Indian',
      tenthBoard: dto.tenthBoard,
      tenthMarks: dto.tenthMarks,
      tenthPassingYear: dto.tenthPassingYear,
      twelfthBoard: dto.twelfthBoard,
      twelfthMarks: dto.twelfthMarks,
      twelfthPassingYear: dto.twelfthPassingYear,
      graduationCourse: dto.graduationCourse,
      graduationCollege: dto.graduationCollege,
      graduationPercentage: dto.graduationPercentage,
    };

    // Clean undefined fields for update
    const cleanProfileUpdate = Object.entries(profileUpdate).reduce(
      (acc, [k, v]) => (v !== undefined ? { ...acc, [k]: v } : acc),
      {},
    );

    await this.prisma.studentProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...cleanProfileUpdate,
      },
      update: cleanProfileUpdate,
    });

    // 3. Sync with StudentPreference if education preferences provided
    if (dto.preferences?.education) {
      const edu = dto.preferences.education;
      try {
        await this.prisma.studentPreference.upsert({
          where: { userId },
          create: {
            userId,
            stream: edu.stream || 'ENGINEERING',
            tenthMarks: dto.tenthMarks ?? user.profile?.tenthMarks ?? 75,
            twelfthMarks: dto.twelfthMarks ?? user.profile?.twelfthMarks ?? 75,
            budgetMin: edu.budgetMin ? Number(edu.budgetMin) : 50000,
            budgetMax: edu.budgetMax ? Number(edu.budgetMax) : 500000,
            preferredStates: edu.preferredState ? [edu.preferredState] : [],
            preferredCities: edu.preferredCity ? [edu.preferredCity] : [],
            preferredCourses: edu.course ? [edu.course] : [],
            interests: edu.specialization ? [edu.specialization] : [],
          },
          update: {
            tenthMarks: dto.tenthMarks ?? undefined,
            twelfthMarks: dto.twelfthMarks ?? undefined,
            budgetMin: edu.budgetMin ? Number(edu.budgetMin) : undefined,
            budgetMax: edu.budgetMax ? Number(edu.budgetMax) : undefined,
            preferredStates: edu.preferredState ? [edu.preferredState] : undefined,
            preferredCities: edu.preferredCity ? [edu.preferredCity] : undefined,
            preferredCourses: edu.course ? [edu.course] : undefined,
            interests: edu.specialization ? [edu.specialization] : undefined,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to sync StudentPreference for user ${userId}: ${err.message}`);
      }
    }

    // 4. Cascade sync to matching Lead record
    try {
      await this.prisma.lead.updateMany({
        where: {
          OR: [
            { mobile: user.mobile },
            ...(user.email ? [{ email: user.email }] : []),
          ],
        },
        data: {
          fullName: dto.fullName || user.fullName,
          state: dto.state || user.state,
          district: dto.district || undefined,
          city: dto.city || user.city,
        },
      });
    } catch {}

    // 5. Create Audit Log
    try {
      await this.prisma.auditLog.create({
        data: {
          module: 'USER_PROFILE',
          action: 'PROFILE_UPDATED',
          description: `Student ${user.fullName} updated their personal profile & preferences`,
          userId,
          entityType: 'STUDENT',
          entityId: userId,
          entityName: user.fullName,
        },
      });
    } catch {}

    return this.getMe(userId);
  }

  async getAllUsers(query?: {
    page?: number;
    limit?: number;
    role?: string;
    q?: string;
    isApproved?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.max(1, Math.min(100, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.role) {
      where.role = query.role.toUpperCase() as Role;
    } else {
      where.role = Role.STUDENT;
    }

    if (query?.isApproved !== undefined && query?.isApproved !== '') {
      where.isApproved = query.isApproved === 'true';
    }

    if (query?.q && query.q.trim()) {
      const searchTerm = query.q.trim();
      where.OR = [
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { mobile: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const orderByField = query?.sortBy || 'createdAt';
    const orderByDir = query?.sortOrder === 'asc' ? 'asc' : 'desc';

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          profile: true,
          applications: {
            select: { id: true, status: true, paymentStatus: true, createdAt: true },
          },
        },
        orderBy: { [orderByField]: orderByDir },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formatted = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      data: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getAllStudents() {
    return this.getAllUsers({ role: 'STUDENT' });
  }

  async toggleApproval(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isApproved: !user.isApproved,
      },
    });

    const { password, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }
}

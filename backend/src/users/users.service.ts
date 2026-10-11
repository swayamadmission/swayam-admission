import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
      mobileVerified: !!user.phoneVerified,
      phoneVerified: !!user.phoneVerified,
      emailVerified: !!user.emailVerified,
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

    // Email update & verification status reset
    if (dto.email !== undefined && dto.email !== null) {
      const cleanEmail = dto.email.trim().toLowerCase();
      if (cleanEmail) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(cleanEmail)) {
          throw new BadRequestException('Please enter a valid email address.');
        }
        const domain = cleanEmail.split('@')[1];
        const DISPOSABLE_DOMAINS = new Set([
          'mailinator.com',
          'tempmail.com',
          '10minutemail.com',
          'guerrillamail.com',
          'yopmail.com',
          'sharklasers.com',
          'dispostable.com',
          'trashmail.com',
          'getairmail.com',
          'mytemp.email',
          'temp-mail.org',
          'fakeinbox.com',
          'throwawaymail.com',
        ]);
        if (DISPOSABLE_DOMAINS.has(domain)) {
          throw new BadRequestException(
            'Disposable or temporary email domains are not permitted. Please use your personal or official email.',
          );
        }
        if (cleanEmail !== user.email) {
          const conflict = await this.prisma.user.findFirst({
            where: {
              id: { not: userId },
              OR: [{ email: cleanEmail }, { personalEmail: cleanEmail }],
            },
          });
          if (conflict) {
            throw new BadRequestException(
              'Email address is already registered with another account.',
            );
          }
          userUpdate.email = cleanEmail;
          userUpdate.personalEmail = cleanEmail;
          userUpdate.emailVerified = false;
          userUpdate.emailVerifiedAt = null;
        }
      }
    }

    // Mobile update
    if (dto.mobile !== undefined && dto.mobile !== null) {
      const cleaned = dto.mobile.replace(/[^\d+]/g, '');
      let digits = cleaned.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
      else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
      if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
        throw new BadRequestException(
          'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).',
        );
      }
      const canonicalMobile = `+91${digits}`;
      if (canonicalMobile !== user.mobile) {
        const conflict = await this.prisma.user.findFirst({
          where: {
            id: { not: userId },
            OR: [{ mobile: canonicalMobile }, { personalMobile: canonicalMobile }],
          },
        });
        if (conflict) {
          throw new BadRequestException(
            'Mobile number is already registered with another account.',
          );
        }
        userUpdate.mobile = canonicalMobile;
        userUpdate.personalMobile = canonicalMobile;
      }
    }

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
            ...(user.mobile ? [{ mobile: user.mobile }] : []),
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

  async getShortlist(userId: string) {
    const savedItems = await this.prisma.savedItem.findMany({
      where: {
        userId,
        itemType: 'COLLEGE',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (savedItems.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
      };
    }

    const collegeIds = savedItems.map((item) => item.itemId);
    const colleges = await this.prisma.college.findMany({
      where: {
        id: { in: collegeIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        banner: true,
        city: true,
        state: true,
        ownership: true,
        type: true,
        rating: true,
        ranking: true,
        gallery: {
          select: { imageUrl: true },
          take: 1,
        },
        courses: {
          select: {
            id: true,
            name: true,
            totalFees: true,
            duration: true,
          },
          take: 4,
        },
      },
    });

    const collegeMap = new Map(colleges.map((c) => [c.id, c]));

    const formattedList = savedItems
      .map((item) => {
        const college = collegeMap.get(item.itemId);
        if (!college) return null;

        const minFee = college.courses?.reduce((min, c) => {
          return c.totalFees && c.totalFees < min ? c.totalFees : min;
        }, Infinity);

        return {
          id: item.id,
          userId: item.userId,
          collegeId: college.id,
          createdAt: item.createdAt,
          savedAt: item.createdAt,
          college: {
            ...college,
            img: college.banner || college.gallery?.[0]?.imageUrl || college.logo,
            bannerImg: college.banner || college.gallery?.[0]?.imageUrl || college.logo,
            coursesCount: college.courses?.length || 0,
            totalFees: minFee !== Infinity ? minFee : 120000,
          },
        };
      })
      .filter(Boolean);

    return {
      success: true,
      count: formattedList.length,
      data: formattedList,
    };
  }

  async getShortlistIds(userId: string) {
    const savedItems = await this.prisma.savedItem.findMany({
      where: {
        userId,
        itemType: 'COLLEGE',
      },
      select: { itemId: true },
    });

    const ids = savedItems.map((item) => item.itemId);
    return {
      success: true,
      data: ids,
      collegeIds: ids,
    };
  }

  async addToShortlist(userId: string, collegeId: string) {
    if (!collegeId) {
      throw new BadRequestException('College ID is required');
    }

    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
      select: { id: true, name: true },
    });

    if (!college) {
      throw new NotFoundException('College not found');
    }

    const existing = await this.prisma.savedItem.findUnique({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType: 'COLLEGE',
          itemId: college.id,
        },
      },
    });

    if (existing) {
      return {
        success: true,
        message: 'College is already in your shortlist',
        saved: true,
        isSaved: true,
        alreadySaved: true,
        data: existing,
      };
    }

    const saved = await this.prisma.savedItem.create({
      data: {
        userId,
        itemType: 'COLLEGE',
        itemId: college.id,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          module: 'COLLEGE_SHORTLIST',
          action: 'COLLEGE_SAVED',
          description: `Student saved college: ${college.name}`,
          userId,
          entityType: 'COLLEGE',
          entityId: college.id,
          entityName: college.name,
        },
      });
    } catch {}

    return {
      success: true,
      message: 'College saved successfully',
      saved: true,
      isSaved: true,
      alreadySaved: false,
      data: saved,
    };
  }

  async removeFromShortlist(userId: string, idOrCollegeId: string) {
    if (!idOrCollegeId) {
      throw new BadRequestException('ID or College ID is required');
    }

    const result = await this.prisma.savedItem.deleteMany({
      where: {
        userId,
        itemType: 'COLLEGE',
        OR: [
          { id: idOrCollegeId },
          { itemId: idOrCollegeId },
        ],
      },
    });

    try {
      await this.prisma.collegeShortlist.updateMany({
        where: {
          studentId: userId,
          collegeId: idOrCollegeId,
          status: 'SHORTLISTED',
        },
        data: {
          status: 'REMOVED',
        },
      });
    } catch {}

    return {
      success: true,
      message: 'College removed from saved list',
      saved: false,
      isSaved: false,
      removed: result.count > 0,
      count: result.count,
    };
  }

  async toggleShortlist(userId: string, collegeId: string) {
    if (!collegeId) {
      throw new BadRequestException('College ID is required');
    }

    const existing = await this.prisma.savedItem.findUnique({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType: 'COLLEGE',
          itemId: collegeId,
        },
      },
    });

    if (existing) {
      await this.removeFromShortlist(userId, collegeId);
      return {
        success: true,
        saved: false,
        isSaved: false,
        message: 'College removed from saved list',
      };
    } else {
      await this.addToShortlist(userId, collegeId);
      return {
        success: true,
        saved: true,
        isSaved: true,
        message: 'College saved successfully',
      };
    }
  }
}

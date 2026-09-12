import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { CreateCounselorDto } from './dto/create-counselor.dto';
import { UpdateCounselorDto } from './dto/update-counselor.dto';
import {
  AssignStudentDto,
  AssignLeadDto,
  AssignApplicationDto,
  UnassignCounselorDto,
  ReassignCounselorDto,
} from './dto/assign.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class CounselorsService {
  constructor(
    private prisma: PrismaService,
    private dataScopeService: DataScopeService,
  ) {}

  /**
   * Helper to ensure counselor profile exists for a counselor user
   */
  private async ensureCounselorProfile(user: any) {
    if (!user) return null;
    let profile = await this.prisma.counselorProfile.findUnique({
      where: { userId: user.id },
    });

    if (
      !profile &&
      (user.role === Role.COUNSELOR ||
        user.role === Role.SENIOR_COUNSELOR ||
        user.role === Role.ADMIN ||
        user.role === Role.SUPER_ADMIN)
    ) {
      const count = await this.prisma.counselorProfile.count();
      const nextNum = (count + 1).toString().padStart(4, '0');
      const counselorId = `CNS-2026-${nextNum}`;

      profile = await this.prisma.counselorProfile.create({
        data: {
          userId: user.id,
          counselorId,
          employeeId: user.employeeId || `EMP-${nextNum}`,
          department: user.department || 'Admissions',
          designation: user.designation || (user.role === Role.SENIOR_COUNSELOR ? 'Senior Educational Counselor' : 'Educational Counselor'),
          experience: user.experience || 'Not specified',
          qualification: user.qualification || 'Not specified',
          gender: user.gender,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
          state: user.state,
          district: user.city,
          pincode: user.pincode,
          joiningDate: user.joiningDate || new Date(),
          employmentStatus: user.isActive ? 'ACTIVE' : 'INACTIVE',
          assignedRegion: 'Default Region',
          assignedStates: user.state ? [user.state] : [],
          assignedColleges: [],
          assignedCourses: [],
          assignedCategories: [],
          commissionRate: 5.0,
          salary: 0,
          incentives: 0,
          bankDetails: {},
          emergencyContact: user.emergencyContact || {},
          notes: 'Active Counselor profile',
          performanceScore: undefined,
          rating: undefined,
          revenueGenerated: 0,
          commissionEarned: 0,
          currentStatus: user.isActive ? 'ONLINE' : 'OFFLINE',
          activeDevice: 'Desktop',
          todaysCallsCount: 0,
          todaysWhatsappCount: 0,
          todaysMeetingsCount: 0,
        },
      });
    }

    return profile;
  }

  /**
   * GET /counselors
   */
  async getAllCounselors(
    query: {
      page?: number;
      limit?: number;
      q?: string;
      isApproved?: string;
      department?: string;
      state?: string;
      sortBy?: string;
      sortOrder?: string;
    },
    authUser?: any,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 12));
    const skip = (page - 1) * limit;

    let where: any = {
      OR: [
        { role: { in: [Role.COUNSELOR, Role.SENIOR_COUNSELOR] } },
        { counselorProfile: { isNot: null } },
      ],
    };

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      const scopeFilter = this.dataScopeService.buildCounselorScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    if (query.isApproved !== undefined && query.isApproved !== '') {
      where = { AND: [where, { isApproved: query.isApproved === 'true' }] };
    }

    if (query.q) {
      const searchCondition = {
        OR: [
          { fullName: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
          { mobile: { contains: query.q, mode: 'insensitive' } },
          { employeeId: { contains: query.q, mode: 'insensitive' } },
          { department: { contains: query.q, mode: 'insensitive' } },
        ],
      };
      where = { AND: [where, searchCondition] };
    }

    const orderByField = query.sortBy || 'createdAt';
    const orderByDir = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [counselors, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderByDir },
        include: {
          counselorProfile: true,
          assignedLeads: {
            where: { isDeleted: false },
            select: {
              id: true,
              status: true,
              priority: true,
              fullName: true,
              mobile: true,
              followUpDate: true,
            },
          },
          counseledApplications: {
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              collegeId: true,
              courseId: true,
              createdAt: true,
            },
          },
          assignedStudents: {
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
              createdAt: true,
            },
          },
          counselorDocuments: {
            select: { id: true, title: true, status: true },
          },
          counselorPayments: {
            select: {
              id: true,
              amount: true,
              status: true,
              counselorCommission: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    for (const c of counselors) {
      if (!c.counselorProfile) {
        c.counselorProfile = await this.ensureCounselorProfile(c);
      }
    }

    return {
      data: counselors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /counselors/:id
   */
  async getCounselorById(id: string, authUser?: any) {
    const counselor = await this.prisma.user.findFirst({
      where: {
        id,
      },
      include: {
        counselorProfile: {
          include: {
            reportingManager: {
              select: { id: true, fullName: true, email: true, mobile: true },
            },
            counselorMeetings: {
              orderBy: { scheduledAt: 'desc' },
              take: 20,
            },
            counselorAttendance: {
              orderBy: { date: 'desc' },
              take: 30,
            },
            counselorCommissions: {
              orderBy: { createdAt: 'desc' },
              take: 30,
            },
            counselorActivities: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        },
        assignedLeads: {
          where: { isDeleted: false },
          orderBy: { updatedAt: 'desc' },
        },
        counseledApplications: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, mobile: true },
            },
            college: { select: { id: true, name: true, logo: true } },
            course: { select: { id: true, name: true, duration: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        assignedStudents: {
          include: {
            profile: true,
            applications: { select: { id: true, status: true } },
          },
        },
        counselorDocuments: {
          orderBy: { uploadedAt: 'desc' },
        },
        counselorPayments: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        assignedTasks: {
          orderBy: { dueDate: 'asc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        counselorSupportTickets: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!counselor) {
      throw new NotFoundException(`Counselor with ID '${id}' not found`);
    }

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      this.dataScopeService.enforceCounselorScope(ctx, counselor);
    }

    if (!counselor.counselorProfile) {
      (counselor as any).counselorProfile =
        await this.ensureCounselorProfile(counselor);
    }

    return counselor;
  }

  /**
   * POST /counselors (Create Counselor)
   */
  async createCounselor(adminUserId: string, dto: CreateCounselorDto) {
    if (adminUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminUserId);
      this.dataScopeService.validateMutationScope(ctx, 'COUNSELOR', dto);
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Email already exists');

    const existingMobile = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });
    if (existingMobile) throw new ConflictException('Mobile already exists');

    const hashedPassword = await bcrypt.hash(
      dto.password || 'Counselor@123',
      10,
    );

    const count = await this.prisma.counselorProfile.count();
    const nextNum = (count + 1).toString().padStart(4, '0');
    const counselorId = `CNS-2026-${nextNum}`;
    const employeeId = dto.employeeId || `EMP-${nextNum}`;

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        mobile: dto.mobile,
        password: hashedPassword,
        role: Role.COUNSELOR,
        isApproved: dto.isApproved !== undefined ? dto.isApproved : true,
        employeeId,
        department: dto.department || 'Admissions',
        designation: dto.designation || 'Educational Counselor',
        experience: dto.experience || '3 Years',
        qualification: dto.qualification || 'Master of Business Administration',
        gender: dto.gender,
        dateOfBirth: dto.dob ? new Date(dto.dob) : undefined,
        address: dto.address,
        state: dto.state || 'Delhi',
        city: dto.district || 'New Delhi',
        pincode: dto.pincode,
        status: dto.employmentStatus || 'ACTIVE',
        counselorProfile: {
          create: {
            counselorId,
            employeeId,
            department: dto.department || 'Admissions',
            designation: dto.designation || 'Educational Counselor',
            experience: dto.experience || '3 Years',
            qualification:
              dto.qualification || 'Master of Business Administration',
            gender: dto.gender,
            dateOfBirth: dto.dob ? new Date(dto.dob) : undefined,
            address: dto.address,
            state: dto.state || 'Delhi',
            district: dto.district || 'New Delhi',
            pincode: dto.pincode,
            joiningDate: new Date(),
            employmentStatus: dto.employmentStatus || 'ACTIVE',
            reportingManagerId: dto.reportingManagerId,
            assignedRegion: dto.assignedRegion || 'North Region',
            assignedStates: dto.assignedStates || ['Delhi', 'Uttar Pradesh'],
            assignedColleges: dto.assignedColleges || [],
            assignedCourses: dto.assignedCourses || [],
            assignedCategories: dto.assignedCategories || [
              'ENGINEERING',
              'MANAGEMENT',
            ],
            commissionRate: dto.commissionRate || 5.0,
            salary: dto.salary || 40000,
            incentives: dto.incentives || 5000,
            bankDetails: dto.bankDetails || {},
            emergencyContact: dto.emergencyContact || {},
            notes: dto.notes || 'Newly onboarded Educational Counselor.',
          },
        },
      },
      include: {
        counselorProfile: true,
      },
    });

    // Audit Log & Notification
    await Promise.all([
      this.prisma.auditLog.create({
        data: {
          module: 'COUNSELOR',
          action: 'CREATE_COUNSELOR',
          description: `Created counselor ${dto.fullName} (${counselorId})`,
          userId: adminUserId,
          entityType: 'COUNSELOR',
          entityId: user.id,
          entityName: dto.fullName,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: user.id,
          type: 'COUNSELOR',
          title: 'Welcome to Swayam Admission CRM',
          message: `Your counselor account ${counselorId} has been created successfully.`,
          category: 'COUNSELOR',
        },
      }),
    ]);

    return user;
  }

  /**
   * PATCH /counselors/:id
   */
  async updateCounselor(
    adminUserId: string,
    id: string,
    dto: UpdateCounselorDto,
  ) {
    const counselor = await this.prisma.user.findFirst({
      where: { id, role: Role.COUNSELOR },
      include: { counselorProfile: true },
    });

    if (!counselor) {
      throw new NotFoundException(`Counselor with ID '${id}' not found`);
    }

    if (adminUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminUserId);
      this.dataScopeService.enforceCounselorScope(ctx, counselor);
      this.dataScopeService.validateMutationScope(ctx, 'COUNSELOR', dto);
    }

    const userData: any = {};
    if (dto.fullName) userData.fullName = dto.fullName;
    if (dto.email) userData.email = dto.email;
    if (dto.mobile) userData.mobile = dto.mobile;
    if (dto.isApproved !== undefined) userData.isApproved = dto.isApproved;
    if (dto.password) userData.password = await bcrypt.hash(dto.password, 10);
    if (dto.department) userData.department = dto.department;
    if (dto.designation) userData.designation = dto.designation;
    if (dto.employmentStatus) userData.status = dto.employmentStatus;

    const profileData: any = {};
    if (dto.employeeId) profileData.employeeId = dto.employeeId;
    if (dto.department) profileData.department = dto.department;
    if (dto.designation) profileData.designation = dto.designation;
    if (dto.experience) profileData.experience = dto.experience;
    if (dto.qualification) profileData.qualification = dto.qualification;
    if (dto.gender) profileData.gender = dto.gender;
    if (dto.dob) profileData.dateOfBirth = new Date(dto.dob);
    if (dto.address) profileData.address = dto.address;
    if (dto.state) profileData.state = dto.state;
    if (dto.district) profileData.district = dto.district;
    if (dto.pincode) profileData.pincode = dto.pincode;
    if (dto.employmentStatus)
      profileData.employmentStatus = dto.employmentStatus;
    if (dto.assignedRegion) profileData.assignedRegion = dto.assignedRegion;
    if (dto.assignedStates) profileData.assignedStates = dto.assignedStates;
    if (dto.assignedColleges)
      profileData.assignedColleges = dto.assignedColleges;
    if (dto.assignedCourses) profileData.assignedCourses = dto.assignedCourses;
    if (dto.assignedCategories)
      profileData.assignedCategories = dto.assignedCategories;
    if (dto.commissionRate !== undefined)
      profileData.commissionRate = dto.commissionRate;
    if (dto.salary !== undefined) profileData.salary = dto.salary;
    if (dto.incentives !== undefined) profileData.incentives = dto.incentives;
    if (dto.bankDetails) profileData.bankDetails = dto.bankDetails;
    if (dto.emergencyContact)
      profileData.emergencyContact = dto.emergencyContact;
    if (dto.notes !== undefined) profileData.notes = dto.notes;
    if (dto.reportingManagerId)
      profileData.reportingManagerId = dto.reportingManagerId;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        counselorProfile: {
          upsert: {
            create: {
              counselorId: `CNS-2026-${id.slice(-4).toUpperCase()}`,
              ...profileData,
            },
            update: profileData,
          },
        },
      },
      include: {
        counselorProfile: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        module: 'COUNSELOR',
        action: 'UPDATE_COUNSELOR',
        description: `Updated counselor ${updatedUser.fullName}`,
        userId: adminUserId,
        entityType: 'COUNSELOR',
        entityId: id,
        entityName: updatedUser.fullName,
      },
    });

    return updatedUser;
  }

  /**
   * DELETE /counselors/:id
   */
  async deleteCounselor(adminUserId: string, id: string) {
    const counselor = await this.prisma.user.findFirst({
      where: { id, role: Role.COUNSELOR },
      include: { counselorProfile: true },
    });

    if (!counselor) {
      throw new NotFoundException(`Counselor with ID '${id}' not found`);
    }

    if (adminUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminUserId);
      this.dataScopeService.enforceCounselorScope(ctx, counselor);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isApproved: false,
        isActive: false,
        status: 'DEACTIVATED',
        counselorProfile: {
          update: {
            employmentStatus: 'DEACTIVATED',
            currentStatus: 'OFFLINE',
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        module: 'COUNSELOR',
        action: 'DEACTIVATE_COUNSELOR',
        description: `Deactivated counselor ${counselor.fullName}`,
        userId: adminUserId,
        entityType: 'COUNSELOR',
        entityId: id,
        entityName: counselor.fullName,
      },
    });

    return {
      success: true,
      message: 'Counselor deactivated successfully',
      user: updated,
    };
  }

  /**
   * GET /counselors/stats
   */
  async getCounselorStats(counselorId?: string, authUser?: any) {
    let whereUser: any = {
      OR: [
        { role: { in: [Role.COUNSELOR, Role.SENIOR_COUNSELOR] } },
        { counselorProfile: { isNot: null } },
      ],
    };
    let whereLead: any = {
      assignedCounselorId: { not: null },
      isDeleted: false,
    };
    let whereApp: any = { counselorId: { not: null } };
    let whereStudent: any = {
      role: Role.STUDENT,
      assignedCounselorId: { not: null },
    };

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      whereUser = {
        AND: [whereUser, this.dataScopeService.buildCounselorScopeFilter(ctx)],
      };
      whereLead = {
        AND: [whereLead, this.dataScopeService.buildLeadScopeFilter(ctx)],
      };
      whereApp = {
        AND: [whereApp, this.dataScopeService.buildApplicationScopeFilter(ctx)],
      };
      whereStudent = {
        AND: [whereStudent, this.dataScopeService.buildStudentScopeFilter(ctx)],
      };
    }

    const [
      totalCounselors,
      activeCounselors,
      inactiveCounselors,
      leadsAssigned,
      assignedStudents,
      applicationsManaged,
      convertedLeads,
      pendingFollowUps,
      openTasks,
      totalPayments,
      meetingsToday,
      profiles,
    ] = await Promise.all([
      this.prisma.user.count({ where: whereUser }),
      this.prisma.user.count({
        where: { AND: [whereUser, { isApproved: true, isActive: true }] },
      }),
      this.prisma.user.count({
        where: {
          AND: [
            whereUser,
            { OR: [{ isApproved: false }, { isActive: false }] },
          ],
        },
      }),
      this.prisma.lead.count({ where: whereLead }),
      this.prisma.user.count({ where: whereStudent }),
      this.prisma.application.count({ where: whereApp }),
      this.prisma.lead.count({
        where: { AND: [whereLead, { status: 'CONVERTED' }] },
      }),
      this.prisma.lead.count({
        where: {
          AND: [
            whereLead,
            { status: { in: ['NEW', 'FOLLOW_UP', 'CONTACTED'] } },
          ],
        },
      }),
      this.prisma.task.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.aggregate({
        where: { counselorId: { not: null }, status: 'COMPLETED' },
        _sum: { amount: true, counselorCommission: true },
      }),
      this.prisma.counselorMeeting.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.counselorProfile.findMany({
        select: {
          currentStatus: true,
          todaysCallsCount: true,
          todaysWhatsappCount: true,
          todaysMeetingsCount: true,
          rating: true,
        },
      }),
    ]);

    const conversionRate =
      leadsAssigned > 0
        ? parseFloat(((convertedLeads / leadsAssigned) * 100).toFixed(1))
        : 0;
    const onlineNow =
      profiles.filter((p) => p.currentStatus === 'ONLINE').length ||
      activeCounselors;
    const offline = totalCounselors - onlineNow;
    const activeToday = activeCounselors;

    const todaysCalls =
      profiles.reduce((acc, p) => acc + (p.todaysCallsCount || 0), 0);
    const todaysWhatsapp =
      profiles.reduce((acc, p) => acc + (p.todaysWhatsappCount || 0), 0);
    const todaysMeetings =
      meetingsToday ||
      profiles.reduce((acc, p) => acc + (p.todaysMeetingsCount || 0), 0);
    const todaysRevenue = totalPayments._sum.amount || 0;
    const avgRating =
      profiles.length > 0
        ? (
            profiles.reduce((acc, p) => acc + (p.rating || 0), 0) /
            profiles.length
          ).toFixed(1)
        : '0';

    return {
      totalCounselors,
      activeCounselors,
      inactiveCounselors,
      activeToday,
      onlineNow,
      offline,
      leadsAssigned,
      assignedStudents,
      applicationsManaged,
      convertedLeads,
      conversionRate,
      pendingFollowUps,
      todaysCalls,
      todaysWhatsapp,
      todaysMeetings,
      todaysRevenue,
      averageRating: parseFloat(avgRating),
      openTasks,
      totalCommission: totalPayments._sum.counselorCommission || 0,
    };
  }

  /**
   * GET /counselors/performance
   */
  async getPerformance(counselorId?: string, authUser?: any) {
    let where: any = counselorId ? { userId: counselorId } : {};

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      const scopeFilter = this.dataScopeService.buildCounselorScopeFilter(ctx);
      where = { AND: [where, { user: scopeFilter }] };
    }

    const profiles = await this.prisma.counselorProfile.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    return profiles.map((p) => ({
      counselorId: p.userId,
      name: p.user?.fullName,
      rating: p.rating,
      performanceScore: p.performanceScore,
      revenueGenerated: p.revenueGenerated,
      commissionEarned: p.commissionEarned,
      todaysCalls: p.todaysCallsCount,
      todaysWhatsapp: p.todaysWhatsappCount,
      todaysMeetings: p.todaysMeetingsCount,
    }));
  }

  /**
   * GET /counselors/revenue
   */
  async getRevenue(counselorId?: string, authUser?: any) {
    let where: any = counselorId
      ? { counselorId }
      : { counselorId: { not: null } };

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      const scopeFilter = this.dataScopeService.buildPaymentScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        counselor: { select: { id: true, fullName: true } },
        user: { select: { id: true, fullName: true } },
        application: { select: { id: true, applicationId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalCommission = payments.reduce(
      (acc, p) => acc + p.counselorCommission,
      0,
    );

    return {
      totalRevenue,
      totalCommission,
      payments,
    };
  }

  /**
   * GET /counselors/commission
   */
  async getCommission(counselorId?: string, authUser?: any) {
    let where: any = counselorId ? { counselorId } : {};

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      const scopeFilter = this.dataScopeService.buildCounselorScopeFilter(ctx);
      where = { AND: [where, { counselor: { user: scopeFilter } }] };
    }

    const commissions = await this.prisma.counselorCommission.findMany({
      where,
      include: {
        counselor: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return commissions;
  }

  /**
   * GET /counselors/activity
   */
  async getActivity(counselorId?: string, authUser?: any) {
    let where: any = counselorId ? { counselorId } : {};

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      const scopeFilter = this.dataScopeService.buildCounselorScopeFilter(ctx);
      where = { AND: [where, { counselor: { user: scopeFilter } }] };
    }

    const activities = await this.prisma.counselorActivityLog.findMany({
      where,
      include: {
        counselor: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return activities;
  }

  /**
   * GET /counselors/students
   */
  async getStudents(counselorId?: string, authUser?: any) {
    let where: any = {
      role: Role.STUDENT,
      assignedCounselorId: counselorId ? counselorId : { not: null },
    };

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      const scopeFilter = this.dataScopeService.buildStudentScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    const students = await this.prisma.user.findMany({
      where,
      include: {
        profile: true,
        assignedCounselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        applications: {
          select: {
            id: true,
            status: true,
            college: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return students;
  }

  /**
   * GET /counselors/leads
   */
  async getLeads(counselorId?: string, authUser?: any) {
    let where: any = {
      isDeleted: false,
      assignedCounselorId: counselorId ? counselorId : { not: null },
    };

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      const scopeFilter = this.dataScopeService.buildLeadScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    const leads = await this.prisma.lead.findMany({
      where,
      include: {
        assignedCounselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return leads;
  }

  /**
   * GET /counselors/applications
   */
  async getApplications(counselorId?: string, authUser?: any) {
    let where: any = counselorId
      ? { counselorId }
      : { counselorId: { not: null } };

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      const scopeFilter =
        this.dataScopeService.buildApplicationScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    const applications = await this.prisma.application.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        college: { select: { id: true, name: true, logo: true } },
        course: { select: { id: true, name: true } },
        counselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return applications;
  }

  /**
   * ASSIGNMENT ENGINE: POST /counselors/assign/student
   */
  async assignStudent(adminUserId: string, dto: AssignStudentDto) {
    const { counselorId, studentId, remarks } = dto;

    const counselor = await this.prisma.user.findFirst({
      where: {
        id: counselorId,
        OR: [
          { role: { in: [Role.COUNSELOR, Role.SENIOR_COUNSELOR, Role.ADMIN, Role.SUPER_ADMIN] } },
          { counselorProfile: { isNot: null } },
        ],
      },
      include: { counselorProfile: true },
    });
    if (!counselor) throw new NotFoundException('Counselor not found');

    const student = await this.prisma.user.findFirst({
      where: { id: studentId },
      include: { profile: true, counselorProfile: true, applications: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (adminUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminUserId);
      this.dataScopeService.enforceCounselorScope(ctx, counselor);
      this.dataScopeService.enforceStudentScope(ctx, student);
    }

    // 1. Update Student
    const updatedStudent = await this.prisma.user.update({
      where: { id: studentId },
      data: { assignedCounselorId: counselorId },
      include: {
        assignedCounselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
      },
    });

    // 2. Cascade Sync: Update Student's Lead (if matching mobile/email)
    await this.prisma.lead.updateMany({
      where: {
        OR: [
          { mobile: student.mobile },
          ...(student.email ? [{ email: student.email }] : []),
        ],
      },
      data: { assignedCounselorId: counselorId },
    });

    // 3. Cascade Sync: Update Applications of this Student
    await this.prisma.application.updateMany({
      where: { userId: studentId },
      data: { counselorId },
    });

    // 4. Cascade Sync: Update Documents & Payments of this Student
    await this.prisma.document.updateMany({
      where: { userId: studentId },
      data: { counselorId },
    });
    await this.prisma.payment.updateMany({
      where: { userId: studentId },
      data: { counselorId },
    });

    // 5. Audit Log & Notifications & Counselor Activity
    await Promise.all([
      this.prisma.auditLog.create({
        data: {
          module: 'ASSIGNMENT_ENGINE',
          action: 'ASSIGN_STUDENT',
          description: `Assigned student ${student.fullName} to counselor ${counselor.fullName}. ${remarks || ''}`,
          userId: adminUserId,
          entityType: 'STUDENT',
          entityId: studentId,
          entityName: student.fullName,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: studentId,
          type: 'COUNSELOR',
          title: 'Counselor Assigned',
          message: `${counselor.fullName} has been assigned as your personal educational counselor.`,
          category: 'COUNSELOR',
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: counselorId,
          type: 'COUNSELOR',
          title: 'New Student Assigned',
          message: `Student ${student.fullName} (${student.mobile}) has been assigned to you.`,
          category: 'STUDENT',
        },
      }),
    ]);

    return {
      success: true,
      message: `Student ${student.fullName} successfully assigned to ${counselor.fullName}`,
      student: updatedStudent,
    };
  }

  /**
   * ASSIGNMENT ENGINE: POST /counselors/assign/lead
   */
  async assignLead(adminUserId: string, dto: AssignLeadDto) {
    const { counselorId, leadId, remarks } = dto;

    const counselor = await this.prisma.user.findFirst({
      where: {
        id: counselorId,
        OR: [
          { role: { in: [Role.COUNSELOR, Role.SENIOR_COUNSELOR, Role.ADMIN, Role.SUPER_ADMIN] } },
          { counselorProfile: { isNot: null } },
        ],
      },
      include: { counselorProfile: true },
    });
    if (!counselor) throw new NotFoundException('Counselor not found');

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    if (adminUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminUserId);
      this.dataScopeService.enforceCounselorScope(ctx, counselor);
      this.dataScopeService.enforceLeadScope(ctx, lead);
    }

    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: { assignedCounselorId: counselorId },
      include: {
        assignedCounselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
      },
    });

    await this.prisma.counselorAssignment.create({
      data: {
        leadId,
        counselorId,
        assignedBy: adminUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        module: 'ASSIGNMENT_ENGINE',
        action: 'ASSIGN_LEAD',
        description: `Assigned lead ${lead.fullName} (${lead.mobile}) to counselor ${counselor.fullName}. ${remarks || ''}`,
        userId: adminUserId,
        entityType: 'LEAD',
        entityId: leadId,
        entityName: lead.fullName,
      },
    });

    return {
      success: true,
      message: `Lead ${lead.fullName} assigned to ${counselor.fullName}`,
      lead: updatedLead,
    };
  }

  /**
   * ASSIGNMENT ENGINE: POST /counselors/assign/application
   */
  async assignApplication(adminUserId: string, dto: AssignApplicationDto) {
    const { counselorId, applicationId, remarks } = dto;

    const counselor = await this.prisma.user.findFirst({
      where: {
        id: counselorId,
        OR: [
          { role: { in: [Role.COUNSELOR, Role.SENIOR_COUNSELOR, Role.ADMIN, Role.SUPER_ADMIN] } },
          { counselorProfile: { isNot: null } },
        ],
      },
      include: { counselorProfile: true },
    });
    if (!counselor) throw new NotFoundException('Counselor not found');

    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { user: { include: { profile: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');

    if (adminUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminUserId);
      this.dataScopeService.enforceCounselorScope(ctx, counselor);
      this.dataScopeService.enforceApplicationScope(ctx, app);
    }

    const updatedApp = await this.prisma.application.update({
      where: { id: applicationId },
      data: { counselorId },
      include: {
        counselor: { select: { id: true, fullName: true, email: true } },
        college: { select: { name: true } },
        course: { select: { name: true } },
      },
    });

    await this.prisma.applicationTimeline.create({
      data: {
        applicationId,
        userId: adminUserId,
        action: 'COUNSELOR_ASSIGNED',
        remarks: `Assigned to counselor ${counselor.fullName}. ${remarks || ''}`,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        module: 'ASSIGNMENT_ENGINE',
        action: 'ASSIGN_APPLICATION',
        description: `Assigned application ${app.applicationId} to counselor ${counselor.fullName}`,
        userId: adminUserId,
        entityType: 'APPLICATION',
        entityId: applicationId,
      },
    });

    return {
      success: true,
      message: `Application ${app.applicationId} assigned to ${counselor.fullName}`,
      application: updatedApp,
    };
  }

  /**
   * ASSIGNMENT ENGINE: POST /counselors/unassign
   */
  async unassignCounselor(adminUserId: string, dto: UnassignCounselorDto) {
    if (adminUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminUserId);
      if (dto.studentId) {
        const student = await this.prisma.user.findUnique({
          where: { id: dto.studentId },
          include: { profile: true },
        });
        if (student) this.dataScopeService.enforceStudentScope(ctx, student);
      }
      if (dto.leadId) {
        const lead = await this.prisma.lead.findUnique({
          where: { id: dto.leadId },
          include: { assignedCounselor: true },
        });
        if (lead) this.dataScopeService.enforceLeadScope(ctx, lead);
      }
      if (dto.applicationId) {
        const app = await this.prisma.application.findUnique({
          where: { id: dto.applicationId },
          include: { user: { include: { profile: true } } },
        });
        if (app) this.dataScopeService.enforceApplicationScope(ctx, app);
      }
    }

    if (dto.studentId) {
      await this.prisma.user.update({
        where: { id: dto.studentId },
        data: { assignedCounselorId: null },
      });
    }

    if (dto.leadId) {
      await this.prisma.lead.update({
        where: { id: dto.leadId },
        data: { assignedCounselorId: null },
      });
    }

    if (dto.applicationId) {
      await this.prisma.application.update({
        where: { id: dto.applicationId },
        data: { counselorId: null },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        module: 'ASSIGNMENT_ENGINE',
        action: 'UNASSIGN_COUNSELOR',
        description: `Unassigned counselor. ${dto.remarks || ''}`,
        userId: adminUserId,
      },
    });

    return { success: true, message: 'Unassigned successfully' };
  }

  /**
   * ASSIGNMENT ENGINE: POST /counselors/reassign
   */
  async reassignCounselor(adminUserId: string, dto: ReassignCounselorDto) {
    const {
      oldCounselorId,
      newCounselorId,
      studentId,
      leadId,
      applicationId,
      remarks,
    } = dto;

    const newCounselor = await this.prisma.user.findFirst({
      where: {
        id: newCounselorId,
        OR: [
          { role: { in: [Role.COUNSELOR, Role.SENIOR_COUNSELOR, Role.ADMIN, Role.SUPER_ADMIN] } },
          { counselorProfile: { isNot: null } },
        ],
      },
      include: { counselorProfile: true },
    });
    if (!newCounselor) throw new NotFoundException('New Counselor not found');

    if (adminUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminUserId);
      this.dataScopeService.enforceCounselorScope(ctx, newCounselor);
    }

    if (studentId) {
      await this.assignStudent(adminUserId, {
        counselorId: newCounselorId,
        studentId,
        remarks,
      });
    }

    if (leadId) {
      await this.assignLead(adminUserId, {
        counselorId: newCounselorId,
        leadId,
        remarks,
      });
    }

    if (applicationId) {
      await this.assignApplication(adminUserId, {
        counselorId: newCounselorId,
        applicationId,
        remarks,
      });
    }

    await this.prisma.auditLog.create({
      data: {
        module: 'ASSIGNMENT_ENGINE',
        action: 'REASSIGN_COUNSELOR',
        description: `Reassigned from ${oldCounselorId} to ${newCounselor.fullName}. ${remarks || ''}`,
        userId: adminUserId,
      },
    });

    return {
      success: true,
      message: `Reassigned successfully to ${newCounselor.fullName}`,
    };
  }

  /**
   * GET /counselors/dashboard
   */
  async getCounselorDashboard(user: any) {
    const counselorUserId = user?.id;

    const profile = await this.prisma.counselorProfile.findUnique({
      where: { userId: counselorUserId },
    });
    const profileId = profile?.id || '';

    const [leads, applications, students, tasks, meetings, payments] =
      await Promise.all([
        this.prisma.lead.findMany({
          where: { assignedCounselorId: counselorUserId, isDeleted: false },
        }),
        this.prisma.application.findMany({
          where: { counselorId: counselorUserId },
        }),
        this.prisma.user.findMany({
          where: { role: Role.STUDENT, assignedCounselorId: counselorUserId },
        }),
        this.prisma.task.findMany({
          where: { assignedTo: counselorUserId },
          orderBy: { dueDate: 'asc' },
        }),
        this.prisma.counselorMeeting.findMany({
          where: { counselorId: profileId },
          orderBy: { scheduledAt: 'asc' },
        }),
        this.prisma.payment.findMany({
          where: { counselorId: counselorUserId },
        }),
      ]);

    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalCommission = payments.reduce(
      (acc, p) => acc + p.counselorCommission,
      0,
    );

    return {
      profile,
      stats: {
        assignedLeads: leads.length,
        assignedApplications: applications.length,
        assignedStudents: students.length,
        pendingTasks: tasks.filter((t) => t.status === 'PENDING').length,
        upcomingMeetings: meetings.filter((m) => m.status === 'SCHEDULED')
          .length,
        totalRevenue,
        totalCommission,
      },
      leads,
      applications,
      students,
      tasks,
      meetings,
    };
  }
}


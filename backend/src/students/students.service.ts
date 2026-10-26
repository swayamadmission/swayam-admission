import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { IdGeneratorService } from '../common/id-generator.service';
import { LiveSyncService } from '../events/live-sync.service';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { AssignCounselorDto } from './dto/assign-counselor.dto';
import { SendStudentNotificationDto } from './dto/send-notification.dto';
import { CreateStudentNoteDto } from './dto/create-note.dto';
import { CreateStudentCommunicationDto } from './dto/create-communication.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScopeService: DataScopeService,
    private readonly idGenerator: IdGeneratorService,
    private readonly liveSync: LiveSyncService,
  ) {}

  /**
   * Calculates student profile completion percentage dynamically.
   */
  private calculateCompletion(user: any): number {
    const profile = user?.profile || {};
    const fields = [
      user?.fullName,
      user?.email,
      user?.mobile,
      user?.gender || profile.gender,
      user?.dateOfBirth || profile.dob,
      user?.address || profile.address,
      user?.city || profile.city,
      user?.state || profile.state,
      user?.pincode || profile.pincode,
      profile.category,
      profile.tenthBoard,
      profile.tenthMarks,
      profile.twelfthBoard,
      profile.twelfthMarks,
      profile.aadhaar || profile.pan || profile.passport,
      profile.parentName || profile.parentContact,
    ];
    const filled = fields.filter(
      (f) => f !== null && f !== undefined && f !== '',
    ).length;
    return Math.round((filled / fields.length) * 100);
  }

  /**
   * Computes student current admission stage and progress percentage.
   */
  private computeJourneyStage(user: any) {
    const apps = user.applications || [];
    const docs = user.documents || [];
    const payments = user.payments || [];
    const verifiedDocs = docs.filter((d: any) => d.status === 'VERIFIED');
    const completedPayments = payments.filter(
      (p: any) => p.status === 'COMPLETED' || p.status === 'SUCCESS',
    );
    const approvedApps = apps.filter(
      (a: any) =>
        a.status === 'APPROVED' ||
        a.status === 'COLLEGE_APPROVED' ||
        a.status === 'ADMISSION_CONFIRMED' ||
        a.status === 'ADMISSION_COMPLETED' ||
        a.status === 'STUDENT_ENROLLED',
    );

    let stage = 'Registration';
    let progress = 20;

    if (
      apps.some(
        (a: any) =>
          a.status === 'STUDENT_ENROLLED' || a.status === 'ADMISSION_COMPLETED',
      )
    ) {
      stage = 'Enrollment Completed';
      progress = 100;
    } else if (apps.some((a: any) => a.status === 'ADMISSION_CONFIRMED')) {
      stage = 'Admission Confirmed';
      progress = 92;
    } else if (approvedApps.length > 0 && completedPayments.length > 0) {
      stage = 'Offer Letter Received';
      progress = 88;
    } else if (completedPayments.length > 0) {
      stage = 'Fee Payment Completed';
      progress = 80;
    } else if (approvedApps.length > 0) {
      stage = 'Admission Approved';
      progress = 75;
    } else if (verifiedDocs.length > 0) {
      stage = 'Documents Verified';
      progress = 60;
    } else if (docs.length > 0) {
      stage = 'Documents Uploaded';
      progress = 50;
    } else if (apps.length > 0) {
      stage = 'Application Submitted';
      progress = 40;
    } else if (
      user.assignedCounselorId ||
      user.assignedLeads?.length > 0 ||
      user.counselorAssignments?.length > 0
    ) {
      stage = 'Counselor Assigned';
      progress = 30;
    }

    return { stage, progress };
  }

  /**
   * GET /students (List with pagination, search, filters & DataScope)
   */
  async getAllStudents(
    query: {
      page?: number;
      limit?: number;
      q?: string;
      isApproved?: string;
      status?: string;
      state?: string;
      district?: string;
      counselorId?: string;
      sortBy?: string;
      sortOrder?: string;
    },
    authUser?: any,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    let where: any = {
      role: 'STUDENT',
    };

    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      const scopeFilter = this.dataScopeService.buildStudentScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    if (query.isApproved !== undefined && query.isApproved !== '') {
      where = { AND: [where, { isApproved: query.isApproved === 'true' }] };
    }

    if (query.status) {
      where = { AND: [where, { status: query.status }] };
    }

    if (query.counselorId) {
      where = { AND: [where, { assignedCounselorId: query.counselorId }] };
    }

    if (query.state) {
      where = {
        AND: [
          where,
          {
            OR: [
              { state: { contains: query.state, mode: 'insensitive' } },
              { profile: { state: { contains: query.state, mode: 'insensitive' } } },
            ],
          },
        ],
      };
    }

    if (query.district) {
      where = {
        AND: [
          where,
          {
            OR: [
              { city: { contains: query.district, mode: 'insensitive' } },
              { profile: { city: { contains: query.district, mode: 'insensitive' } } },
            ],
          },
        ],
      };
    }

    if (query.q && query.q.trim()) {
      const searchTerm = query.q.trim();
      const searchCondition = {
        OR: [
          { studentId: { contains: searchTerm, mode: 'insensitive' } },
          { registrationNumber: { contains: searchTerm, mode: 'insensitive' } },
          { fullName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { mobile: { contains: searchTerm, mode: 'insensitive' } },
          { profile: { city: { contains: searchTerm, mode: 'insensitive' } } },
          { profile: { state: { contains: searchTerm, mode: 'insensitive' } } },
          { profile: { tenthBoard: { contains: searchTerm, mode: 'insensitive' } } },
          { profile: { twelfthStream: { contains: searchTerm, mode: 'insensitive' } } },
        ],
      };
      where = { AND: [where, searchCondition] };
    }

    const orderByField = query.sortBy || 'createdAt';
    const orderByDir = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderByDir },
        include: {
          profile: true,
          assignedCounselor: {
            select: {
              id: true,
              fullName: true,
              designation: true,
              qualification: true,
              avatar: true,
            },
          },
          applications: {
            select: {
              id: true,
              applicationId: true,
              applicationNumber: true,
              status: true,
              paymentStatus: true,
              college: { select: { id: true, name: true, slug: true } },
              course: { select: { id: true, name: true, slug: true } },
              createdAt: true,
            },
          },
          documents: {
            select: {
              id: true,
              type: true,
              title: true,
              status: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formatted = students.map((s: any) => {
      const { password, ...userWithoutPassword } = s;
      if (userWithoutPassword.profile) {
        const { pan, passport, ...safeProfile } = userWithoutPassword.profile;
        userWithoutPassword.profile = safeProfile;
      }
      const journey = this.computeJourneyStage(s);
      const completionPercentage = this.calculateCompletion(s);

      return {
        ...userWithoutPassword,
        journeyStage: journey.stage,
        journeyProgress: journey.progress,
        completionPercentage,
        applicationsCount: s.applications?.length || 0,
        documentsCount: s.documents?.length || 0,
        paymentsCount: s.payments?.length || 0,
      };
    });

    return {
      data: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 1. GET /students/:id
   */
  async getStudentById(id: string, authUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        counselorProfile: true,
        applications: {
          include: {
            college: true,
            course: true,
            counselor: {
              select: {
                id: true,
                fullName: true,
                email: true,
                mobile: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        supportTickets: true,
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        assignedLeads: {
          include: {
            assignedCounselor: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
                designation: true,
                qualification: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    // Enforce Scope Check
    if (authUser?.id) {
      const ctx = await this.dataScopeService.resolveDataScope(authUser.id);
      this.dataScopeService.enforceStudentScope(ctx, user);
    }

    // Lead CRM mapping
    const lead = await this.prisma.lead.findFirst({
      where: {
        OR: [
          ...(user.mobile ? [{ mobile: user.mobile }] : []),
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      include: {
        assignedCounselor: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            designation: true,
            qualification: true,
          },
        },
      },
    });

    // Assigned counselor logic with safe public staff projection
    const rawCounselor =
      user.applications.find((a) => a.counselor)?.counselor ||
      (lead as any)?.assignedCounselor ||
      user.assignedLeads[0]?.assignedCounselor ||
      null;

    const assignedCounselor = rawCounselor
      ? {
          id: rawCounselor.id,
          fullName: rawCounselor.fullName,
          designation: (rawCounselor as any).designation || 'Senior Educational Counselor',
          qualification: (rawCounselor as any).qualification || 'Career & Admission Guidance',
          avatar: rawCounselor.avatar,
        }
      : null;

    const completionPercentage = this.calculateCompletion(user);
    const { stage, progress } = this.computeJourneyStage(user);
    const latestApp = user.applications[0];

    const studentId = user.studentId || (await this.idGenerator.generateStudentId());
    const registrationNumber = user.registrationNumber || (await this.idGenerator.generateRegistrationNumber(new Date(user.createdAt).getFullYear()));
    const applicationId = latestApp?.applicationId || latestApp?.applicationNumber || 'Not applied';

    // Strip sensitive fields
    const { password, ...safeUser } = user;
    let sanitizedProfile = safeUser.profile;
    if (safeUser.profile) {
      const { pan, passport, ...cleanProfile } = safeUser.profile;
      sanitizedProfile = cleanProfile as any;
    }

    return {
      success: true,
      data: {
        ...safeUser,
        profile: sanitizedProfile,
        studentId,
        registrationNumber,
        applicationId,
        crmLeadId: lead?.id || null,
        assignedCounselor,
        assignedManager: {
          fullName: 'Regional Admission Manager',
          email: process.env.SMTP_FROM_EMAIL || 'swayamadmissions@gmail.com',
        },
        admissionStatus: latestApp?.status || 'NEW',
        currentStage: stage,
        stageProgress: progress,
        profileCompletionPercentage: completionPercentage,
        isVerifiedBadge: user.isVerified || completionPercentage >= 80,
        leadDetails: lead,
      },
    };
  }

  /**
   * 2. PATCH /students/:id
   */
  async updateStudent(
    id: string,
    dto: UpdateStudentProfileDto,
    currentUserId?: string,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, counselorProfile: true, applications: true },
    });
    if (!existing) {
      throw new NotFoundException(`Student not found`);
    }

    // Enforce Scope & Mutation boundary validation
    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      this.dataScopeService.enforceStudentScope(ctx, existing);
      this.dataScopeService.validateMutationScope(ctx, 'STUDENT', dto);
    }

    const {
      fullName,
      mobile,
      alternatePhone,
      email,
      isApproved,
      isActive,
      status,
      gender,
      dateOfBirth,
      bloodGroup,
      religion,
      nationality,
      category,
      aadhaar,
      pan,
      passport,
      address,
      city,
      state,
      country,
      pincode,
      parentName,
      parentContact,
      parentRelation,
      tenthBoard,
      tenthSchool,
      tenthPassingYear,
      tenthMarks,
      tenthMaxMarks,
      tenthObtainedMarks,
      twelfthBoard,
      twelfthSchool,
      twelfthStream,
      twelfthPassingYear,
      twelfthMarks,
      twelfthMaxMarks,
      twelfthObtainedMarks,
      diplomaCourse,
      diplomaCollege,
      diplomaPercentage,
      diplomaPassingYear,
      graduationCourse,
      graduationCollege,
      graduationUniversity,
      graduationPercentage,
      graduationCgpa,
      graduationPassingYear,
      previousCollege,
      university,
      gapYears,
      backlogs,
      certificates,
    } = dto;

    const userUpdate: any = {};
    if (fullName !== undefined) userUpdate.fullName = fullName;
    if (mobile !== undefined) userUpdate.mobile = mobile;
    if (alternatePhone !== undefined)
      userUpdate.alternatePhone = alternatePhone;
    if (email !== undefined) userUpdate.email = email;
    if (isApproved !== undefined) userUpdate.isApproved = isApproved;
    if (isActive !== undefined) userUpdate.isActive = isActive;
    if (status !== undefined) userUpdate.status = status;
    if (gender !== undefined) userUpdate.gender = gender;
    if (bloodGroup !== undefined) userUpdate.bloodGroup = bloodGroup;
    if (address !== undefined) userUpdate.address = address;
    if (city !== undefined) userUpdate.city = city;
    if (state !== undefined) userUpdate.state = state;
    if (country !== undefined) userUpdate.country = country;
    if (pincode !== undefined) userUpdate.pincode = pincode;

    await this.prisma.user.update({
      where: { id },
      data: userUpdate,
    });

    const profileData: any = {
      dob: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      category,
      address,
      city,
      state,
      pincode,
      alternateMobile: alternatePhone,
      religion,
      nationality,
      bloodGroup,
      aadhaar,
      pan,
      passport,
      parentName,
      parentContact,
      parentRelation,
      tenthBoard,
      tenthSchool,
      tenthPassingYear,
      tenthMarks,
      tenthMaxMarks,
      tenthObtainedMarks,
      twelfthBoard,
      twelfthSchool,
      twelfthStream,
      twelfthPassingYear,
      twelfthMarks,
      twelfthMaxMarks,
      twelfthObtainedMarks,
      diplomaCourse,
      diplomaCollege,
      diplomaPercentage,
      diplomaPassingYear,
      graduationCourse,
      graduationCollege,
      graduationUniversity,
      graduationPercentage,
      graduationCgpa,
      graduationPassingYear,
      previousCollege,
      university,
      gapYears,
      backlogs,
      certificates,
    };

    // Clean undefined fields
    Object.keys(profileData).forEach((key) => {
      if (profileData[key] === undefined) delete profileData[key];
    });

    await this.prisma.studentProfile.upsert({
      where: { userId: id },
      create: { userId: id, ...profileData },
      update: profileData,
    });

    // Create Audit Log entry
    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId || id,
        action: 'UPDATE_STUDENT_PROFILE',
        entity: 'Student',
        entityId: id,
        description: JSON.stringify(dto),
      },
    });

    return this.getStudentById(id, { id: currentUserId });
  }

  /**
   * 3. GET /students/:id/overview
   */
  async getOverview(id: string, authUser?: any) {
    const studentRes = await this.getStudentById(id, authUser);
    const student = studentRes.data;

    const latestActivities = await this.prisma.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const upcomingTasks = await this.prisma.task.findMany({
      where: { assignedTo: id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentNotifications = await this.prisma.notification.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const latestPayment = student.payments?.[0] || null;
    const pendingDocs =
      student.documents?.filter((d: any) => d.status !== 'VERIFIED') || [];

    return {
      success: true,
      data: {
        summary: {
          fullName: student.fullName,
          email: student.email,
          mobile: student.mobile,
          admissionStatus: student.admissionStatus,
          currentStage: student.currentStage,
          stageProgress: student.stageProgress,
          profileCompletionPercentage: student.profileCompletionPercentage,
          assignedCounselor: student.assignedCounselor,
        },
        latestActivity: latestActivities,
        upcomingTasks,
        recentNotifications,
        admissionProgress: student.stageProgress,
        completionPercentage: student.profileCompletionPercentage,
        latestPayment,
        pendingDocuments: pendingDocs,
        assignedCounselor: student.assignedCounselor,
        remarks:
          latestActivities[0]?.description ||
          'Profile active and synchronized.',
      },
    };
  }

  /**
   * 4. GET /students/:id/applications
   */
  async getApplications(id: string, authUser?: any) {
    await this.getStudentById(id, authUser);

    const applications = await this.prisma.application.findMany({
      where: { userId: id },
      include: {
        college: true,
        course: true,
        counselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        timeline: { orderBy: { createdAt: 'desc' } },
        documents: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: applications,
      total: applications.length,
    };
  }

  /**
   * 5. GET /students/:id/documents
   */
  async getDocuments(id: string, authUser?: any) {
    await this.getStudentById(id, authUser);

    const documents = await this.prisma.document.findMany({
      where: { userId: id },
      include: {
        verifier: {
          select: { id: true, fullName: true, email: true },
        },
        history: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    const pending = documents.filter(
      (d) => d.status === 'UPLOADED' || d.status === 'UNDER_VERIFICATION',
    ).length;
    const verified = documents.filter((d) => d.status === 'VERIFIED').length;
    const rejected = documents.filter((d) => d.status === 'REJECTED').length;

    return {
      success: true,
      data: {
        documents,
        stats: {
          total: documents.length,
          pending,
          verified,
          rejected,
        },
      },
    };
  }

  /**
   * 6. GET /students/:id/payments
   */
  async getPayments(id: string, authUser?: any) {
    await this.getStudentById(id, authUser);

    const payments = await this.prisma.payment.findMany({
      where: { userId: id },
      include: {
        college: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        application: { select: { id: true, applicationId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completedAmount = payments
      .filter((p) => p.status === 'COMPLETED' || p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingAmount = payments
      .filter((p) => p.status === 'PENDING' || p.status === 'INITIATED')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      success: true,
      data: {
        payments,
        stats: {
          totalCount: payments.length,
          completedAmount,
          pendingAmount,
        },
      },
    };
  }

  /**
   * 7. GET /students/:id/timeline
   */
  async getTimeline(id: string, authUser?: any) {
    await this.getStudentById(id, authUser);

    const appTimeline = await this.prisma.applicationTimeline.findMany({
      where: { application: { userId: id } },
      include: { application: { select: { applicationId: true } } },
    });

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { entityId: id },
    });

    const notifications = await this.prisma.notification.findMany({
      where: { userId: id },
    });

    const communications = await this.prisma.studentCommunication.findMany({
      where: { studentId: id },
    });

    // Merge all events chronologically
    const events: any[] = [];

    appTimeline.forEach((t) => {
      events.push({
        id: t.id,
        category: 'APPLICATION',
        action: t.action,
        title: `Application ${t.application?.applicationId || ''}: ${t.action}`,
        description: t.remarks || `Status changed to ${t.newStatus || ''}`,
        timestamp: t.createdAt,
      });
    });

    auditLogs.forEach((a) => {
      events.push({
        id: a.id,
        category: 'AUDIT',
        action: a.action,
        title: a.action,
        description: a.description || 'System action executed',
        timestamp: a.createdAt,
      });
    });

    notifications.forEach((n) => {
      events.push({
        id: n.id,
        category: 'NOTIFICATION',
        action: n.type,
        title: n.title,
        description: n.message,
        timestamp: n.createdAt,
      });
    });

    communications.forEach((c) => {
      events.push({
        id: c.id,
        category: 'COMMUNICATION',
        action: c.channel,
        title: `${c.channel} (${c.type})`,
        description: c.content,
        timestamp: c.createdAt,
      });
    });

    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      success: true,
      data: events,
    };
  }

  /**
   * 8. GET /students/:id/activity
   */
  async getActivity(id: string, authUser?: any) {
    await this.getStudentById(id, authUser);

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const loginHistories = await this.prisma.userLoginHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const deviceSessions = await this.prisma.userDeviceSession.findMany({
      where: { userId: id },
      orderBy: { lastActiveAt: 'desc' },
    });

    return {
      success: true,
      data: {
        auditLogs,
        loginHistories,
        deviceSessions,
      },
    };
  }

  /**
   * 9. GET /students/:id/counselor
   */
  async getCounselor(id: string, authUser?: any) {
    const studentRes = await this.getStudentById(id, authUser);
    const counselor = studentRes.data.assignedCounselor;

    const assignments = await this.prisma.counselorAssignment.findMany({
      where: { lead: { mobile: studentRes.data.mobile || '' } },
      include: {
        counselor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            avatar: true,
          },
        },
        assigner: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const communications = await this.prisma.studentCommunication.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: {
        assignedCounselor: counselor,
        assignmentHistory: assignments,
        communications,
        performanceNotes:
          'Consistent interaction and high student response rate.',
      },
    };
  }

  /**
   * 10. GET /students/:id/notes
   */
  async getNotes(id: string, authUser?: any) {
    await this.getStudentById(id, authUser);

    const notes = await this.prisma.studentNote.findMany({
      where: { studentId: id },
      include: {
        author: {
          select: { id: true, fullName: true, role: true, avatar: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      success: true,
      data: notes,
    };
  }

  /**
   * 11. GET /students/:id/support
   */
  async getSupport(id: string, authUser?: any) {
    await this.getStudentById(id, authUser);

    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId: id },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: tickets,
    };
  }

  /**
   * 12. GET /students/:id/analytics
   */
  async getAnalytics(id: string, authUser?: any) {
    const studentRes = await this.getStudentById(id, authUser);
    const student = studentRes.data;

    const docs = student.documents || [];
    const verifiedDocs = docs.filter(
      (d: any) => d.status === 'VERIFIED',
    ).length;
    const apps = student.applications || [];
    const payments = student.payments || [];
    const completedPayments = payments.filter(
      (p: any) => p.status === 'COMPLETED' || p.status === 'SUCCESS',
    ).length;

    // AI Insight Metrics
    let admissionProbability = 40;
    if (student.profileCompletionPercentage >= 80) admissionProbability += 20;
    if (verifiedDocs > 0) admissionProbability += 20;
    if (completedPayments > 0) admissionProbability += 20;

    const insights: any[] = [];
    if (student.profileCompletionPercentage < 80) {
      insights.push({
        type: 'INCOMPLETE_PROFILE',
        label: 'Incomplete Profile',
        message: 'Personal/Academic details pending.',
      });
    }
    if (docs.length === 0 || verifiedDocs < docs.length) {
      insights.push({
        type: 'MISSING_DOCUMENTS',
        label: 'Missing or Unverified Documents',
        message: `${docs.length - verifiedDocs} documents unverified.`,
      });
    }
    if (payments.length === 0 || completedPayments < payments.length) {
      insights.push({
        type: 'PENDING_FEES',
        label: 'Pending Application / Admission Fees',
        message: 'Pending payments require follow up.',
      });
    }

    const riskLevel =
      admissionProbability > 75
        ? 'Low'
        : admissionProbability > 50
          ? 'Medium'
          : 'High';
    const suggestedNextAction =
      verifiedDocs === 0
        ? 'Verify uploaded marksheets & ID proof'
        : completedPayments === 0
          ? 'Collect application fee payment'
          : 'Approve final admission seat';

    return {
      success: true,
      data: {
        admissionProbability,
        riskLevel,
        suggestedNextAction,
        insights,
        conversionTimeline: [
          { stage: 'Lead', date: student.createdAt },
          { stage: 'Registration', date: student.createdAt },
          { stage: 'Application', date: apps[0]?.createdAt || null },
          { stage: 'Payment', date: payments[0]?.createdAt || null },
        ],
      },
    };
  }

  /**
   * 13. GET /students/:id/communication
   */
  async getCommunication(id: string, authUser?: any) {
    await this.getStudentById(id, authUser);

    const logs = await this.prisma.studentCommunication.findMany({
      where: { studentId: id },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: logs,
    };
  }

  /**
   * 14. POST /students/:id/assign-counselor
   */
  async assignCounselor(
    id: string,
    dto: AssignCounselorDto,
    assignerId?: string,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, counselorProfile: true, applications: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (assignerId) {
      const ctx = await this.dataScopeService.resolveDataScope(assignerId);
      this.dataScopeService.enforceStudentScope(ctx, student);
      this.dataScopeService.validateMutationScope(ctx, 'STUDENT', {
        assignedCounselorId: dto.counselorId,
      });
    }

    const counselor = await this.prisma.user.findUnique({
      where: { id: dto.counselorId },
    });
    if (
      !counselor ||
      (counselor.role !== 'COUNSELOR' &&
        counselor.role !== 'SENIOR_COUNSELOR' &&
        counselor.role !== 'ADMIN' &&
        counselor.role !== 'SUPER_ADMIN')
    ) {
      throw new NotFoundException('Valid active counselor not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Student User Record
      await tx.user.update({
        where: { id },
        data: { assignedCounselorId: dto.counselorId },
      });

      // 2. Update all Applications for this student
      await tx.application.updateMany({
        where: { userId: id },
        data: { counselorId: dto.counselorId },
      });

      // 3. Update Lead and Counselor Assignment history if matching lead exists
      const lead = await tx.lead.findFirst({
        where: {
          OR: [
            ...(student.mobile ? [{ mobile: student.mobile }] : []),
            ...(student.email ? [{ email: student.email }] : []),
          ],
        },
      });

      if (lead) {
        await tx.lead.update({
          where: { id: lead.id },
          data: { assignedCounselorId: dto.counselorId },
        });

        await tx.counselorAssignment.updateMany({
          where: { leadId: lead.id, isActive: true },
          data: { isActive: false },
        });

        await tx.counselorAssignment.create({
          data: {
            leadId: lead.id,
            counselorId: dto.counselorId,
            assignedBy: assignerId,
            isActive: true,
          },
        });
      }

      // 4. Send In-App Notifications to Student & Counselor
      await tx.notification.create({
        data: {
          userId: id,
          receiverId: id,
          title: 'Counselor Assigned',
          message: `Educational Counselor ${counselor.fullName} has been assigned to guide your admission journey.`,
          type: 'SYSTEM',
        },
      });

      await tx.notification.create({
        data: {
          userId: dto.counselorId,
          receiverId: dto.counselorId,
          title: 'New Student Assigned',
          message: `Student ${student.fullName} (${student.email}) has been assigned to you.`,
          type: 'SYSTEM',
        },
      });

      // 5. Audit Log & Communication Record
      await tx.auditLog.create({
        data: {
          userId: assignerId || dto.counselorId,
          action: 'ASSIGN_COUNSELOR',
          entity: 'STUDENT',
          entityId: id,
        },
      });

      await tx.studentCommunication.create({
        data: {
          studentId: id,
          senderId: assignerId,
          channel: 'INTERNAL_NOTE',
          type: 'SYSTEM',
          subject: 'Counselor Assigned',
          content: `Assigned counselor ${counselor.fullName}. Remarks: ${dto.remarks || 'None'}`,
        },
      });

      return this.getStudentById(id, { id: assignerId });
    });
  }

  /**
   * 15. POST /students/:id/send-notification
   */
  async sendNotification(
    id: string,
    dto: SendStudentNotificationDto,
    senderId?: string,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, counselorProfile: true, applications: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (senderId) {
      const ctx = await this.dataScopeService.resolveDataScope(senderId);
      this.dataScopeService.enforceStudentScope(ctx, student);
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: id,
        senderId,
        title: dto.title,
        message: dto.message,
        category: 'STUDENT',
        metadata: dto.metadata || {},
      },
    });

    await this.prisma.studentCommunication.create({
      data: {
        studentId: id,
        senderId,
        channel: dto.channel,
        type: 'OUTBOUND',
        subject: dto.title,
        content: dto.message,
        status: 'SENT',
      },
    });

    return {
      success: true,
      data: notification,
    };
  }

  /**
   * 16. POST /students/:id/export
   */
  async exportProfile(id: string, currentUserId?: string) {
    const studentRes = await this.getStudentById(id, { id: currentUserId });
    return {
      success: true,
      exportDate: new Date().toISOString(),
      studentProfile: studentRes.data,
    };
  }

  /**
   * Create Note Helper
   */
  async createNote(id: string, dto: CreateStudentNoteDto, authorId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, counselorProfile: true, applications: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (authorId) {
      const ctx = await this.dataScopeService.resolveDataScope(authorId);
      this.dataScopeService.enforceStudentScope(ctx, student);
    }

    const note = await this.prisma.studentNote.create({
      data: {
        studentId: id,
        authorId,
        title: dto.title,
        content: dto.content,
        noteType: dto.noteType || 'GENERAL',
        isPinned: dto.isPinned || false,
        attachments: dto.attachments || [],
      },
    });
    return { success: true, data: note };
  }

  /**
   * Create Communication Helper
   */
  async createCommunication(
    id: string,
    dto: CreateStudentCommunicationDto,
    senderId?: string,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, counselorProfile: true, applications: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (senderId) {
      const ctx = await this.dataScopeService.resolveDataScope(senderId);
      this.dataScopeService.enforceStudentScope(ctx, student);
    }

    const comm = await this.prisma.studentCommunication.create({
      data: {
        studentId: id,
        senderId,
        channel: dto.channel,
        type: dto.type || 'OUTBOUND',
        subject: dto.subject,
        content: dto.content,
        status: dto.status || 'SENT',
        attachments: dto.attachments || [],
      },
    });
    return { success: true, data: comm };
  }
}

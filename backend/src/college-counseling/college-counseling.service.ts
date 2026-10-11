import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JourneyService } from '../journey/journey.service';
import {
  CreateRecommendationDto,
  CreateShortlistDto,
  CreateSelectionDto,
  InitiateApplicationDto,
  UpdateRequirementProfileDto,
  CreateCounselingNoteDto,
} from './dto/counseling.dto';
import { IUser } from '../auth/interfaces/user.interface';
import { ApplicationStatus, RecommendationStatus, ShortlistStatus } from '@prisma/client';

@Injectable()
export class CollegeCounselingService {
  constructor(
    private prisma: PrismaService,
    private dataScopeService: DataScopeService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private journeyService: JourneyService,
  ) {}

  /**
   * Validate Offering Unit: College -> Course -> Branch
   */
  async validateOffering(collegeId: string, courseId: string, branchId?: string) {
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
    });
    if (!college || college.status === 'ARCHIVED') {
      throw new NotFoundException('Selected college is unavailable or invalid');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course || course.collegeId !== collegeId || course.status === 'ARCHIVED') {
      throw new BadRequestException('Selected course is not offered by this college');
    }

    let branch: any = null;
    if (branchId) {
      branch = await this.prisma.courseBranch.findUnique({
        where: { id: branchId },
      });
      if (!branch || branch.courseId !== courseId || branch.status !== 'ACTIVE') {
        throw new BadRequestException('Selected branch is not available for this course');
      }
    }

    return { college, course, branch };
  }

  /**
   * Helper: Generate unique application ID prefix
   */
  private async generateApplicationId(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `APP-${year}${month}-`;

    const latestApp = await this.prisma.application.findFirst({
      where: { applicationId: { startsWith: prefix } },
      orderBy: { applicationId: 'desc' },
    });

    let seq = 1;
    if (latestApp) {
      const lastSeqStr = latestApp.applicationId.replace(prefix, '');
      seq = parseInt(lastSeqStr, 10) + 1;
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  /**
   * 1. GET Requirement Profile (Student Inputs + Counselor Observations)
   */
  async getRequirementProfile(actorUser: IUser, studentId: string) {
    if (actorUser.id !== studentId) {
      await this.journeyService.verifyActorStudentAccess(actorUser.id, studentId);
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
        studentPreference: true,
        assignedCounselor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student user not found');
    }

    // Attempt to pull lead context if available
    const lead = await this.prisma.lead.findFirst({
      where: {
        OR: [
          ...(student.mobile ? [{ mobile: student.mobile }] : []),
          ...(student.email ? [{ email: student.email }] : []),
        ],
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Notes visibility rule: Student sees ONLY STUDENT_VISIBLE, staff sees all
    const isStudentSelf = actorUser.id === studentId;
    const notesWhere: any = { studentId };
    if (isStudentSelf) {
      notesWhere.visibility = 'STUDENT_VISIBLE';
    }

    const notes = await this.prisma.studentNote.findMany({
      where: notesWhere,
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      success: true,
      studentId: student.id,
      fullName: student.fullName,
      email: student.email,
      mobile: student.mobile,
      academicProfile: student.profile,
      assignedCounselor: student.assignedCounselor,
      studentPreferences: student.studentPreference || {
        stream: student.profile?.twelfthStream || 'SCIENCE',
        tenthMarks: student.profile?.tenthMarks || 0,
        twelfthMarks: student.profile?.twelfthMarks || 0,
        budgetMin: 0,
        budgetMax: 500000,
        preferredStates: student.profile?.state ? [student.profile.state] : [],
        preferredCities: student.profile?.city ? [student.profile.city] : [],
        hostelRequired: false,
        transportRequired: false,
        scholarshipRequired: false,
      },
      leadData: lead
        ? {
            id: lead.id,
            source: lead.source,
            preferredCourse: lead.preferredCourse,
            preferredCollege: lead.preferredCollege,
            budget: lead.budget,
            district: lead.district,
            state: lead.state,
          }
        : null,
      notes,
    };
  }

  /**
   * 2. UPDATE Requirement Profile
   */
  async updateRequirementProfile(
    actorUser: IUser,
    studentId: string,
    dto: UpdateRequirementProfileDto,
  ) {
    const isStudentSelf = actorUser.id === studentId;
    if (!isStudentSelf) {
      await this.journeyService.verifyActorStudentAccess(actorUser.id, studentId);
    }

    const currentPref = await this.prisma.studentPreference.findUnique({
      where: { userId: studentId },
    });

    const updateData: any = {};

    if (isStudentSelf) {
      // Student updating own preferences
      if (dto.hostelRequired !== undefined) updateData.hostelRequired = dto.hostelRequired;
      if (dto.transportRequired !== undefined) updateData.transportRequired = dto.transportRequired;
      if (dto.scholarshipRequired !== undefined) updateData.scholarshipRequired = dto.scholarshipRequired;
      if (dto.admissionUrgency) updateData.admissionUrgency = dto.admissionUrgency;
      if (dto.otherRequirements) updateData.otherRequirements = dto.otherRequirements;
    } else {
      // Counselor/Staff adding observations (preserves original student preferences)
      if (dto.counselorObservation) updateData.counselorObservation = dto.counselorObservation;
      if (dto.hostelRequired !== undefined) updateData.hostelRequired = dto.hostelRequired;
      if (dto.transportRequired !== undefined) updateData.transportRequired = dto.transportRequired;
      if (dto.scholarshipRequired !== undefined) updateData.scholarshipRequired = dto.scholarshipRequired;
      if (dto.admissionUrgency) updateData.admissionUrgency = dto.admissionUrgency;
      if (dto.otherRequirements) updateData.otherRequirements = dto.otherRequirements;
    }

    let updatedPref;
    if (currentPref) {
      updatedPref = await this.prisma.studentPreference.update({
        where: { userId: studentId },
        data: updateData,
      });
    } else {
      updatedPref = await this.prisma.studentPreference.create({
        data: {
          userId: studentId,
          stream: 'SCIENCE',
          tenthMarks: 0,
          twelfthMarks: 0,
          budgetMax: 500000,
          interests: [],
          preferredStates: [],
          preferredCities: [],
          ...updateData,
        },
      });
    }

    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'STUDENT_REQUIREMENT_PROFILE_UPDATED',
      entity: 'StudentPreference',
      entityId: updatedPref.id,
      description: `Requirement profile updated by ${actorUser.role}`,
      metadata: { targetUserId: studentId },
    });

    return {
      success: true,
      message: 'Requirement profile updated successfully',
      data: updatedPref,
    };
  }

  /**
   * 3. POST Counselor Recommendation
   */
  async createRecommendation(
    counselorUser: IUser,
    studentId: string,
    dto: CreateRecommendationDto,
  ) {
    await this.journeyService.verifyActorStudentAccess(counselorUser.id, studentId);
    const { college, course, branch } = await this.validateOffering(
      dto.collegeId,
      dto.courseId,
      dto.branchId,
    );

    const session = dto.academicSession || '2026-2027';

    // Idempotent upsert logic for active recommendation
    const existingRec = await this.prisma.collegeRecommendation.findFirst({
      where: {
        studentId,
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        branchId: dto.branchId || null,
        academicSession: session,
      },
    });

    let rec;
    if (existingRec) {
      rec = await this.prisma.collegeRecommendation.update({
        where: { id: existingRec.id },
        data: {
          counselorId: counselorUser.id,
          reason: dto.reason || existingRec.reason,
          status: 'RECOMMENDED',
          updatedAt: new Date(),
        },
        include: { college: true, course: true, branch: true, counselor: true },
      });
    } else {
      rec = await this.prisma.collegeRecommendation.create({
        data: {
          studentId,
          counselorId: counselorUser.id,
          collegeId: dto.collegeId,
          courseId: dto.courseId,
          branchId: dto.branchId || null,
          academicSession: session,
          reason: dto.reason || `Recommended based on student academic profile and location preference`,
          status: 'RECOMMENDED',
        },
        include: { college: true, course: true, branch: true, counselor: true },
      });
    }

    // Audit log
    await this.auditService.logAction({
      userId: counselorUser.id,
      action: 'COLLEGE_RECOMMENDED',
      entity: 'CollegeRecommendation',
      entityId: rec.id,
      description: `Recommended ${college.name} (${course.name}${branch ? ' - ' + branch.name : ''})`,
      metadata: { targetUserId: studentId, collegeId: college.id, courseId: course.id, branchId: dto.branchId },
    });

    // Notify Student
    await this.notificationsService.createNotification({
      userId: studentId,
      type: 'COUNSELOR',
      title: 'New College Recommendation',
      message: `Your counselor ${counselorUser.fullName} recommended ${college.name} for ${course.name}${branch ? ' (' + branch.name + ')' : ''}.`,
      actionUrl: `/dashboard?tab=saved`,
      metadata: { recommendationId: rec.id, collegeId: college.id },
    });

    return {
      success: true,
      message: 'College recommended successfully',
      data: rec,
    };
  }

  /**
   * 4. GET Counselor Recommendations for Student
   */
  async getStudentRecommendations(actorUser: IUser, studentId: string) {
    if (actorUser.id !== studentId) {
      await this.journeyService.verifyActorStudentAccess(actorUser.id, studentId);
    }

    const recs = await this.prisma.collegeRecommendation.findMany({
      where: { studentId },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            city: true,
            state: true,
            type: true,
            hostelAvailable: true,
            transportAvailable: true,
            scholarshipAvailable: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            totalFees: true,
            semesterFees: true,
            duration: true,
            seats: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        counselor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      count: recs.length,
      data: recs,
    };
  }

  /**
   * 5. DECLINE Counselor Recommendation (Student Action)
   */
  async declineRecommendation(studentUser: IUser, recommendationId: string) {
    const rec = await this.prisma.collegeRecommendation.findUnique({
      where: { id: recommendationId },
      include: { college: true, course: true },
    });

    if (!rec || rec.studentId !== studentUser.id) {
      throw new NotFoundException('Recommendation not found or access denied');
    }

    const updated = await this.prisma.collegeRecommendation.update({
      where: { id: recommendationId },
      data: { status: 'DECLINED' },
    });

    await this.auditService.logAction({
      userId: studentUser.id,
      action: 'COLLEGE_RECOMMENDATION_DECLINED',
      entity: 'CollegeRecommendation',
      entityId: recommendationId,
      description: `Declined recommendation for ${rec.college.name} - ${rec.course.name}`,
    });

    // Notify counselor
    if (rec.counselorId) {
      await this.notificationsService.createNotification({
        userId: rec.counselorId,
        type: 'COUNSELOR',
        title: 'Recommendation Declined',
        message: `Student ${studentUser.fullName} declined recommendation for ${rec.college.name}.`,
        metadata: { recommendationId },
      });
    }

    return {
      success: true,
      message: 'Recommendation declined',
      data: updated,
    };
  }

  /**
   * 6. GET Student Shortlist
   */
  async getShortlist(actorUser: IUser, studentId: string) {
    if (actorUser.id !== studentId) {
      await this.journeyService.verifyActorStudentAccess(actorUser.id, studentId);
    }

    const isStudentSelf = actorUser.id === studentId;
    const whereClause: any = { studentId };
    if (isStudentSelf) {
      whereClause.status = 'SHORTLISTED';
    }

    const shortlist = await this.prisma.collegeShortlist.findMany({
      where: whereClause,
      include: {
        college: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            city: true,
            state: true,
            ownership: true,
            type: true,
            hostelAvailable: true,
            scholarshipAvailable: true,
            transportAvailable: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            totalFees: true,
            semesterFees: true,
            seats: true,
            duration: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        recommendation: {
          select: {
            id: true,
            reason: true,
            createdAt: true,
            counselor: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      count: shortlist.length,
      data: shortlist,
    };
  }

  /**
   * 7. POST Student Shortlist (Add offering to shortlist)
   */
  async addToShortlist(studentUser: IUser, dto: CreateShortlistDto) {
    const { college, course, branch } = await this.validateOffering(
      dto.collegeId,
      dto.courseId,
      dto.branchId,
    );

    const session = dto.academicSession || '2026-2027';

    // Idempotent duplicate check
    const existingShortlist = await this.prisma.collegeShortlist.findFirst({
      where: {
        studentId: studentUser.id,
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        branchId: dto.branchId || null,
        academicSession: session,
      },
    });

    let shortlist;
    if (existingShortlist) {
      shortlist = await this.prisma.collegeShortlist.update({
        where: { id: existingShortlist.id },
        data: {
          status: 'SHORTLISTED',
          notes: dto.notes || existingShortlist.notes,
          updatedAt: new Date(),
        },
        include: { college: true, course: true, branch: true },
      });
    } else {
      // Find matching counselor recommendation if available
      let recId = dto.recommendationId;
      if (!recId) {
        const matchingRec = await this.prisma.collegeRecommendation.findFirst({
          where: {
            studentId: studentUser.id,
            collegeId: dto.collegeId,
            courseId: dto.courseId,
            branchId: dto.branchId || null,
            status: { in: ['RECOMMENDED', 'VIEWED'] },
          },
        });
        if (matchingRec) recId = matchingRec.id;
      }

      shortlist = await this.prisma.collegeShortlist.create({
        data: {
          studentId: studentUser.id,
          collegeId: dto.collegeId,
          courseId: dto.courseId,
          branchId: dto.branchId || null,
          academicSession: session,
          recommendationId: recId || null,
          notes: dto.notes,
          status: 'SHORTLISTED',
        },
        include: { college: true, course: true, branch: true },
      });

      if (recId) {
        await this.prisma.collegeRecommendation.update({
          where: { id: recId },
          data: { status: 'SHORTLISTED' },
        }).catch(() => null);
      }
    }

    // Also sync with generic SavedItem for backward compatibility
    await this.prisma.savedItem
      .upsert({
        where: {
          userId_itemType_itemId: {
            userId: studentUser.id,
            itemType: 'COLLEGE',
            itemId: dto.collegeId,
          },
        },
        create: {
          userId: studentUser.id,
          itemType: 'COLLEGE',
          itemId: dto.collegeId,
        },
        update: {},
      })
      .catch(() => null);

    await this.auditService.logAction({
      userId: studentUser.id,
      action: 'COLLEGE_SHORTLISTED',
      entity: 'CollegeShortlist',
      entityId: shortlist.id,
      description: `Shortlisted ${college.name} (${course.name}${branch ? ' - ' + branch.name : ''})`,
    });

    // Notify assigned counselor if assigned
    const dbStudentObj = await this.prisma.user.findUnique({
      where: { id: studentUser.id },
      select: { assignedCounselorId: true },
    });
    if (dbStudentObj?.assignedCounselorId) {
      await this.notificationsService.createNotification({
        userId: dbStudentObj.assignedCounselorId,
        type: 'COUNSELOR',
        title: 'Student Shortlisted College',
        message: `Student ${studentUser.fullName} shortlisted ${college.name} for ${course.name}.`,
        metadata: { shortlistId: shortlist.id, studentId: studentUser.id },
      });
    }

    return {
      success: true,
      message: 'College offering shortlisted successfully',
      data: shortlist,
    };
  }

  /**
   * 8. DELETE Student Shortlist Item
   */
  async removeFromShortlist(studentUser: IUser, shortlistId: string) {
    const item = await this.prisma.collegeShortlist.findUnique({
      where: { id: shortlistId },
      include: { college: true },
    });

    if (!item || item.studentId !== studentUser.id) {
      throw new NotFoundException('Shortlist item not found or access denied');
    }

    const updated = await this.prisma.collegeShortlist.update({
      where: { id: shortlistId },
      data: { status: 'REMOVED' },
    });

    await this.auditService.logAction({
      userId: studentUser.id,
      action: 'COLLEGE_SHORTLIST_REMOVED',
      entity: 'CollegeShortlist',
      entityId: shortlistId,
      description: `Removed ${item.college.name} from shortlist`,
    });

    return {
      success: true,
      message: 'Shortlist item removed',
      data: updated,
    };
  }

  /**
   * 9. GET Final Selections
   */
  async getSelection(actorUser: IUser, studentId: string) {
    if (actorUser.id !== studentId) {
      await this.journeyService.verifyActorStudentAccess(actorUser.id, studentId);
    }

    const selections = await this.prisma.studentCollegeSelection.findMany({
      where: { studentId },
      include: {
        college: {
          select: { id: true, name: true, logo: true, city: true, state: true },
        },
        course: {
          select: { id: true, name: true, totalFees: true, duration: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
        application: {
          select: { id: true, applicationId: true, status: true, paymentStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      count: selections.length,
      data: selections,
    };
  }

  /**
   * 10. POST Final College Offering Selection
   */
  async createSelection(
    actorUser: IUser,
    targetStudentId: string,
    dto: CreateSelectionDto,
  ) {
    const isStudentSelf = actorUser.id === targetStudentId;
    if (!isStudentSelf) {
      await this.journeyService.verifyActorStudentAccess(actorUser.id, targetStudentId);
    }

    const { college, course, branch } = await this.validateOffering(
      dto.collegeId,
      dto.courseId,
      dto.branchId,
    );

    const session = dto.academicSession || '2026-2027';

    const selection = await this.prisma.studentCollegeSelection.create({
      data: {
        studentId: targetStudentId,
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        branchId: dto.branchId || null,
        academicSession: session,
        selectedBy: actorUser.id,
        counselorId: isStudentSelf ? undefined : actorUser.id,
        studentChoiceConfirmed: dto.studentChoiceConfirmed ?? true,
        confirmationSource: isStudentSelf ? 'STUDENT_UI' : 'COUNSELOR_ON_BEHALF',
      },
      include: { college: true, course: true, branch: true },
    });

    // Update shortlist & recommendation state if present
    await this.prisma.collegeShortlist
      .updateMany({
        where: {
          studentId: targetStudentId,
          collegeId: dto.collegeId,
          courseId: dto.courseId,
          branchId: dto.branchId || null,
        },
        data: { status: 'SELECTED' },
      })
      .catch(() => null);

    await this.prisma.collegeRecommendation
      .updateMany({
        where: {
          studentId: targetStudentId,
          collegeId: dto.collegeId,
          courseId: dto.courseId,
          branchId: dto.branchId || null,
        },
        data: { status: 'SELECTED' },
      })
      .catch(() => null);

    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'COLLEGE_SELECTED',
      entity: 'StudentCollegeSelection',
      entityId: selection.id,
      description: `Selected ${college.name} (${course.name}${branch ? ' - ' + branch.name : ''}) for application`,
      metadata: { targetUserId: targetStudentId },
    });

    return {
      success: true,
      message: 'College offering selected successfully',
      data: selection,
    };
  }

  /**
   * 11. INITIATE APPLICATION DRAFT (Idempotent)
   */
  async initiateApplication(
    actorUser: IUser,
    targetStudentId: string,
    dto: InitiateApplicationDto,
  ) {
    const isStudentSelf = actorUser.id === targetStudentId;
    if (!isStudentSelf) {
      await this.journeyService.verifyActorStudentAccess(actorUser.id, targetStudentId);
    }

    if (dto.studentChoiceConfirmed === false) {
      throw new BadRequestException(
        'Application draft cannot be initiated without explicit student confirmation',
      );
    }

    const { college, course, branch } = await this.validateOffering(
      dto.collegeId,
      dto.courseId,
      dto.branchId,
    );

    // Duplicate Protection: Check if active application exists
    const existingApp = await this.prisma.application.findFirst({
      where: {
        userId: targetStudentId,
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        branchId: dto.branchId || null,
        status: { not: ApplicationStatus.CANCELLED },
      },
      include: {
        college: true,
        course: true,
        branch: true,
        timeline: true,
      },
    });

    if (existingApp) {
      return {
        success: true,
        isExisting: true,
        message: 'Active application draft already exists for this program',
        data: existingApp,
        application: existingApp,
      };
    }

    // Get student user to obtain assigned counselor
    const studentUserObj = await this.prisma.user.findUnique({
      where: { id: targetStudentId },
      select: { assignedCounselorId: true, fullName: true },
    });

    const appId = await this.generateApplicationId();

    const application = await this.prisma.application.create({
      data: {
        applicationId: appId,
        userId: targetStudentId,
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        branchId: dto.branchId || null,
        branchName: branch ? branch.name : null,
        counselorId: studentUserObj?.assignedCounselorId || (isStudentSelf ? null : actorUser.id),
        status: ApplicationStatus.NEW,
        admissionYear: 2026,
        remarks: `Application draft initiated by ${actorUser.role}`,
        timeline: {
          create: {
            userId: actorUser.id,
            action: 'APPLICATION_DRAFT_CREATED',
            newStatus: ApplicationStatus.NEW,
            remarks: `Selected ${college.name} - ${course.name}${branch ? ' (' + branch.name + ')' : ''}`,
          },
        },
      },
      include: {
        college: true,
        course: true,
        branch: true,
        counselor: {
          select: { id: true, fullName: true, email: true },
        },
        timeline: true,
      },
    });

    // Create selection entry linking the application
    await this.prisma.studentCollegeSelection.create({
      data: {
        studentId: targetStudentId,
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        branchId: dto.branchId || null,
        academicSession: dto.academicSession || '2026-2027',
        selectedBy: actorUser.id,
        counselorId: studentUserObj?.assignedCounselorId || undefined,
        studentChoiceConfirmed: true,
        confirmationSource: isStudentSelf ? 'STUDENT_UI' : 'COUNSELOR_ON_BEHALF',
        applicationId: application.id,
      },
    });

    // Audit log
    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'APPLICATION_INITIATED',
      entity: 'Application',
      entityId: application.id,
      description: `Initiated application draft ${appId} for ${college.name}`,
      metadata: { targetUserId: targetStudentId },
    });

    // Notify student & counselor
    await this.notificationsService.createNotification({
      userId: targetStudentId,
      type: 'APPLICATION',
      title: 'Application Draft Initiated',
      message: `Your application draft (${appId}) for ${college.name} ${course.name} has been initiated.`,
      actionUrl: `/dashboard?tab=applications`,
      metadata: { applicationId: application.id },
    });

    if (studentUserObj?.assignedCounselorId) {
      await this.notificationsService.createNotification({
        userId: studentUserObj.assignedCounselorId,
        type: 'APPLICATION',
        title: 'Student Initiated Application',
        message: `Student ${studentUserObj.fullName} initiated application draft (${appId}) for ${college.name}.`,
        metadata: { applicationId: application.id, studentId: targetStudentId },
      });
    }

    return {
      success: true,
      isExisting: false,
      message: 'Application draft initiated successfully',
      data: application,
      application,
    };
  }

  /**
   * 12. Create Counseling Requirement Note
   */
  async createCounselingNote(
    actorUser: IUser,
    targetStudentId: string,
    dto: CreateCounselingNoteDto,
  ) {
    const isStudentSelf = actorUser.id === targetStudentId;
    if (!isStudentSelf) {
      await this.journeyService.verifyActorStudentAccess(actorUser.id, targetStudentId);
    }

    const note = await this.prisma.studentNote.create({
      data: {
        studentId: targetStudentId,
        authorId: actorUser.id,
        noteType: 'COUNSELING_REQUIREMENT',
        title: dto.title || 'Counseling Requirement Note',
        content: dto.content,
        visibility: isStudentSelf ? 'STUDENT_VISIBLE' : (dto.visibility || 'INTERNAL'),
      },
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'COUNSELING_NOTE_ADDED',
      entity: 'StudentNote',
      entityId: note.id,
      description: `Added counseling note with visibility ${note.visibility}`,
      metadata: { targetUserId: targetStudentId },
    });

    return {
      success: true,
      message: 'Counseling note created',
      data: note,
    };
  }
}

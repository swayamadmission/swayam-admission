import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollegeDto } from './dto/create-college.dto';
import { UpdateCollegeDto } from './dto/update-college.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CollegesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getDashboardStats() {
    const [
      totalColleges,
      featuredColleges,
      activeColleges,
      governmentCount,
      privateCount,
      deemedCount,
      autonomousCount,
      statesCoveredResult,
      totalStudentsEnrolled,
    ] = await Promise.all([
      this.prisma.college.count({ where: { status: { not: 'ARCHIVED' } } }),
      this.prisma.college.count({
        where: { featured: true, status: { not: 'ARCHIVED' } },
      }),
      this.prisma.college.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.college.count({
        where: { ownership: 'GOVERNMENT', status: { not: 'ARCHIVED' } },
      }),
      this.prisma.college.count({
        where: { ownership: 'PRIVATE', status: { not: 'ARCHIVED' } },
      }),
      this.prisma.college.count({
        where: { type: 'DEEMED', status: { not: 'ARCHIVED' } },
      }),
      this.prisma.college.count({
        where: { type: 'AUTONOMOUS', status: { not: 'ARCHIVED' } },
      }),
      this.prisma.college.groupBy({
        by: ['state'],
        where: { status: { not: 'ARCHIVED' } },
      }),
      // Calculate total enrolled students from Applications where status is ADMISSION_CONFIRMED or STUDENT_ENROLLED
      this.prisma.application.count({
        where: { status: { in: ['ADMISSION_CONFIRMED', 'STUDENT_ENROLLED'] } },
      }),
    ]);

    // Average rating can be derived from CollegeReview or simulated for now if reviews don't exist
    const reviewsAgg = await this.prisma.collegeReview.aggregate({
      _avg: { rating: true },
    });
    const averageRating = reviewsAgg._avg.rating || 0;

    return {
      totalColleges,
      statesCovered: statesCoveredResult.length,
      featuredColleges,
      activeColleges,
      totalStudentsEnrolled,
      averageRating: averageRating.toFixed(1),
      governmentCount,
      privateCount,
      deemedCount,
      autonomousCount,
    };
  }

  async getAllColleges(filters?: {
    q?: string;
    page?: number;
    limit?: number;
    budgetMin?: number;
    budgetMax?: number;
    placementMin?: number;
    ownership?: string;
    state?: string;
    city?: string;
    hostel?: boolean;
    approval?: string;
    naacGrade?: string;
    featured?: boolean;
    status?: string;
  }) {
    const {
      q,
      page = 1,
      limit = 20,
      budgetMin,
      budgetMax,
      placementMin,
      ownership,
      state,
      city,
      hostel,
      approval,
      naacGrade,
      featured,
      status,
    } = filters || {};

    const whereClause: Prisma.CollegeWhereInput = {
      status: status ? (status as any) : { not: 'ARCHIVED' },
    };

    if (q) {
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { university: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (state) {
      whereClause.AND = [
        ...((whereClause.AND as any[]) || []),
        {
          OR: [
            { state: { equals: state, mode: 'insensitive' } },
            { stateId: state },
            { stateRelation: { name: { equals: state, mode: 'insensitive' } } },
            { stateRelation: { code: { equals: state.toUpperCase() } } },
          ],
        },
      ];
    }
    if (city) {
      whereClause.AND = [
        ...((whereClause.AND as any[]) || []),
        {
          OR: [
            { city: { equals: city, mode: 'insensitive' } },
            { districtId: city },
            { districtRelation: { name: { equals: city, mode: 'insensitive' } } },
          ],
        },
      ];
    }
    if (ownership) whereClause.ownership = ownership as any;
    if (hostel !== undefined) whereClause.hostelAvailable = hostel;
    if (placementMin) whereClause.highestPackage = { gte: placementMin };
    if (naacGrade) whereClause.naacGrade = naacGrade;
    if (featured !== undefined) whereClause.featured = featured;
    if (approval) {
      whereClause.approvals = { has: approval };
    }

    if (budgetMin !== undefined || budgetMax !== undefined) {
      whereClause.courses = {
        some: {
          totalFees: {
            gte: budgetMin ?? 0,
            lte: budgetMax ?? 99999999,
          },
        },
      };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.college.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stateRelation: { select: { id: true, name: true, code: true } },
          districtRelation: { select: { id: true, name: true, code: true } },
          courses: {
            where: { status: 'PUBLISHED' },
          },
          _count: {
            select: { applications: true },
          },
        },
      }),
      this.prisma.college.count({ where: whereClause }),
    ]);

    return { data, total, page, limit };
  }

  async getCollegeById(id: string) {
    const college = await this.prisma.college.findUnique({
      where: { id },
      include: {
        stateRelation: true,
        districtRelation: true,
        courses: {
          where: { status: { not: 'ARCHIVED' } },
          include: {
            branches: true,
          },
        },
        gallery: {
          orderBy: { sortOrder: 'asc' },
        },
        StudyMaterial: {
          where: { status: 'PUBLISHED' },
        },
        faqs: {
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            applications: true,
            courses: true,
            gallery: true,
            StudyMaterial: true,
          },
        },
      },
    });

    if (!college) {
      throw new NotFoundException(`College with id ${id} not found`);
    }

    return college;
  }

  async compareColleges(ids: string[]) {
    const colleges = await this.prisma.college.findMany({
      where: { id: { in: ids } },
      include: {
        courses: {
          include: {
            branches: true,
          },
        },
      },
    });

    return colleges.map((c) => ({
      ...c,
      availabilityDisclaimer: 'Availability subject to college confirmation.',
    }));
  }

  private mapDtoToData(dto: Partial<CreateCollegeDto>, isUpdate = false): any {
    const data: any = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
      data.slug = dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    if (dto.shortDescription !== undefined) data.shortDescription = dto.shortDescription;
    if (dto.fullDescription !== undefined) data.fullDescription = dto.fullDescription;
    if (dto.logo !== undefined) data.logo = dto.logo;
    if (dto.banner !== undefined) data.banner = dto.banner;
    if (dto.establishedYear !== undefined) data.establishedYear = dto.establishedYear;
    if (dto.ownership !== undefined) data.ownership = dto.ownership;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.university !== undefined) data.university = dto.university;
    if (dto.accreditation !== undefined) data.accreditation = dto.accreditation;
    if (dto.approvals !== undefined) data.approvals = dto.approvals;
    if (dto.ranking !== undefined) data.ranking = dto.ranking;
    if (dto.nirfRanking !== undefined) data.nirfRanking = dto.nirfRanking;
    if (dto.naacGrade !== undefined) data.naacGrade = dto.naacGrade;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.stateId !== undefined) data.stateId = dto.stateId;
    if (dto.districtId !== undefined) data.districtId = dto.districtId;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.pincode !== undefined) data.pincode = dto.pincode;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.whatsapp !== undefined) data.whatsapp = dto.whatsapp;
    if (dto.contactPerson !== undefined) data.contactPerson = dto.contactPerson;
    if (dto.placementPercentage !== undefined) data.placementPercentage = dto.placementPercentage;
    if (dto.highestPackage !== undefined) data.highestPackage = dto.highestPackage;
    if (dto.averagePackage !== undefined) data.averagePackage = dto.averagePackage;
    if (dto.medianPackage !== undefined) data.medianPackage = dto.medianPackage;
    if (dto.placementCompanies !== undefined) data.placementCompanies = dto.placementCompanies;
    if (dto.placementInfo !== undefined) data.placementInfo = dto.placementInfo;
    if (dto.placementYear !== undefined) data.placementYear = dto.placementYear;
    if (dto.hostelAvailable !== undefined) data.hostelAvailable = dto.hostelAvailable;
    if (dto.boysHostelAvailable !== undefined) data.boysHostelAvailable = dto.boysHostelAvailable;
    if (dto.girlsHostelAvailable !== undefined) data.girlsHostelAvailable = dto.girlsHostelAvailable;
    if (dto.hostelFee !== undefined) data.hostelFee = dto.hostelFee;
    if (dto.hostelFacilities !== undefined) data.hostelFacilities = dto.hostelFacilities;
    if (dto.messInfo !== undefined) data.messInfo = dto.messInfo;
    if (dto.otherFacilities !== undefined) data.otherFacilities = dto.otherFacilities;
    if (dto.transportAvailable !== undefined) data.transportAvailable = dto.transportAvailable;
    if (dto.scholarshipAvailable !== undefined) data.scholarshipAvailable = dto.scholarshipAvailable;
    if (dto.applicationFee !== undefined) data.applicationFee = dto.applicationFee;
    if (dto.featured !== undefined) data.featured = dto.featured;
    if (dto.verified !== undefined) data.verified = dto.verified;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.seoTitle !== undefined) data.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined) data.seoDescription = dto.seoDescription;
    if (dto.seoKeywords !== undefined) data.seoKeywords = dto.seoKeywords;
    if (dto.rating !== undefined) data.rating = dto.rating;

    // Apply defaults only on create (not update)
    if (!isUpdate) {
      if (data.status === undefined) data.status = 'PUBLISHED';
      if (data.rating === undefined) data.rating = 4.2;
      if (data.hostelAvailable === undefined) {
        data.hostelAvailable = !!(data.boysHostelAvailable || data.girlsHostelAvailable);
      }
      if (data.boysHostelAvailable === undefined) data.boysHostelAvailable = false;
      if (data.girlsHostelAvailable === undefined) data.girlsHostelAvailable = false;
      if (data.transportAvailable === undefined) data.transportAvailable = false;
      if (data.scholarshipAvailable === undefined) data.scholarshipAvailable = false;
      if (data.placementCompanies === undefined) data.placementCompanies = [];
      if (data.hostelFacilities === undefined) data.hostelFacilities = [];
      if (data.otherFacilities === undefined) data.otherFacilities = [];
      if (data.seoKeywords === undefined) data.seoKeywords = [];
    }

    return data;
  }

  private async resolveGeography(data: any) {
    if (data.stateId) {
      const stateObj = await this.prisma.state.findUnique({
        where: { id: data.stateId },
      });
      if (stateObj) {
        data.state = stateObj.name;
      }
    } else if (data.state) {
      const stateObj = await this.prisma.state.findFirst({
        where: {
          OR: [
            { name: { equals: data.state.trim(), mode: 'insensitive' } },
            { code: { equals: data.state.trim().toUpperCase() } },
          ],
        },
      });
      if (stateObj) {
        data.stateId = stateObj.id;
        data.state = stateObj.name;
      }
    }

    if (data.districtId) {
      const districtObj = await this.prisma.district.findUnique({
        where: { id: data.districtId },
      });
      if (districtObj) {
        data.city = districtObj.name;
        if (!data.stateId) {
          data.stateId = districtObj.stateId;
          const st = await this.prisma.state.findUnique({ where: { id: districtObj.stateId } });
          if (st) data.state = st.name;
        }
      }
    } else if (data.city) {
      const districtWhere: any = {
        name: { equals: data.city.trim(), mode: 'insensitive' },
      };
      if (data.stateId) {
        districtWhere.stateId = data.stateId;
      }
      const districtObj = await this.prisma.district.findFirst({
        where: districtWhere,
      });
      if (districtObj) {
        data.districtId = districtObj.id;
      }
    }
  }

  async createCollege(dto: CreateCollegeDto, adminId: string) {
    const data = this.mapDtoToData(dto);
    await this.resolveGeography(data);

    // If gallery or faqs exist, we create them along with the college
    if (dto.gallery && dto.gallery.length > 0) {
      data.gallery = {
        create: dto.gallery.map((g, idx) => ({
          ...g,
          sortOrder: g.sortOrder ?? idx,
        })),
      };
    }

    if (dto.faqs && dto.faqs.length > 0) {
      data.faqs = {
        create: dto.faqs.map((f, idx) => ({
          ...f,
          sortOrder: f.sortOrder ?? idx,
        })),
      };
    }

    const college = await this.prisma.college.create({ data });

    await this.auditService.logAction({
      userId: adminId,
      action: 'CREATE_COLLEGE',
      entity: 'College',
      entityId: college.id,
      newValue: college as any,
    });

    return college;
  }

  async updateCollege(id: string, dto: UpdateCollegeDto, adminId: string) {
    const existing = await this.prisma.college.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`College with id ${id} not found`);
    }

    const data = this.mapDtoToData(dto, true);
    await this.resolveGeography(data);

    // For update, we don't necessarily want to override slug unless explicitly requested
    delete data.slug;

    // Handle nested arrays (Gallery, FAQs) - simplistically by deleting and recreating
    const updateQuery: any = { ...data };

    if (dto.gallery) {
      updateQuery.gallery = {
        deleteMany: {},
        create: dto.gallery.map((g, idx) => ({
          imageUrl: g.imageUrl,
          caption: g.caption || '',
          sortOrder: g.sortOrder ?? idx,
          isCover: g.isCover ?? (idx === 0),
        })),
      };
    }

    if (dto.faqs) {
      updateQuery.faqs = {
        deleteMany: {},
        create: dto.faqs.map((f, idx) => ({
          ...f,
          sortOrder: f.sortOrder ?? idx,
        })),
      };
    }

    const updated = await this.prisma.college.update({
      where: { id },
      data: updateQuery,
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'UPDATE_COLLEGE',
      entity: 'College',
      entityId: id,
      oldValue: existing as any,
      newValue: updated as any,
    });

    return updated;
  }

  async deactivateCollege(id: string, adminId: string) {
    const existing = await this.prisma.college.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`College with id ${id} not found`);
    }

    const updated = await this.prisma.college.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'DELETE_COLLEGE',
      entity: 'College',
      entityId: id,
      oldValue: existing as any,
      newValue: { status: 'ARCHIVED' },
    });

    return updated;
  }

  async addCourse(collegeId: string, dto: CreateCourseDto) {
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
    });

    if (!college) {
      throw new NotFoundException(`College with id ${collegeId} not found`);
    }

    return this.prisma.course.create({
      data: {
        collegeId,
        name: dto.name,
        duration: dto.duration,
        seats: dto.seats,
        totalFees: dto.fees,
        slug:
          dto.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '') +
          '-' +
          collegeId,
      },
    });
  }

  async deactivateCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'ARCHIVED' },
    });
  }

  async updateCourse(courseId: string, dto: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!existing) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        name: dto.name,
        duration: dto.duration,
        seats: dto.seats,
        totalFees: dto.totalFees !== undefined ? dto.totalFees : dto.fees,
        semesterFees: dto.semesterFees,
        applicationFee: dto.applicationFee,
        level: dto.level,
        category: dto.category,
        specialization: dto.specialization,
        eligibility: dto.eligibility,
        scholarshipInfo: dto.scholarshipInfo,
        status: dto.status,
      },
    });
  }

  // =========================================================================
  // GALLERY MANAGEMENT
  // =========================================================================

  async addGalleryImage(
    collegeId: string,
    data: { imageUrl: string; caption?: string; sortOrder?: number; isCover?: boolean },
  ) {
    const college = await this.prisma.college.findUnique({ where: { id: collegeId } });
    if (!college) {
      throw new NotFoundException(`College with id ${collegeId} not found`);
    }

    if (data.isCover) {
      // Unset previous cover images
      await this.prisma.collegeGallery.updateMany({
        where: { collegeId, isCover: true },
        data: { isCover: false },
      });
    }

    return this.prisma.collegeGallery.create({
      data: {
        collegeId,
        imageUrl: data.imageUrl,
        caption: data.caption || '',
        sortOrder: data.sortOrder ?? 0,
        isCover: data.isCover ?? false,
      },
    });
  }

  async updateGalleryImage(
    collegeId: string,
    imageId: string,
    data: { caption?: string; sortOrder?: number; isCover?: boolean },
  ) {
    const existing = await this.prisma.collegeGallery.findUnique({ where: { id: imageId } });
    if (!existing || existing.collegeId !== collegeId) {
      throw new NotFoundException(`Gallery image not found`);
    }

    if (data.isCover) {
      await this.prisma.collegeGallery.updateMany({
        where: { collegeId, isCover: true },
        data: { isCover: false },
      });
    }

    return this.prisma.collegeGallery.update({
      where: { id: imageId },
      data: {
        caption: data.caption !== undefined ? data.caption : existing.caption,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder,
        isCover: data.isCover !== undefined ? data.isCover : existing.isCover,
      },
    });
  }

  async deleteGalleryImage(collegeId: string, imageId: string) {
    const existing = await this.prisma.collegeGallery.findUnique({ where: { id: imageId } });
    if (!existing || existing.collegeId !== collegeId) {
      throw new NotFoundException(`Gallery image not found`);
    }

    return this.prisma.collegeGallery.delete({
      where: { id: imageId },
    });
  }

  // =========================================================================
  // STUDY MATERIALS LINKING
  // =========================================================================

  async getCollegeStudyMaterials(collegeId: string) {
    return this.prisma.studyMaterial.findMany({
      where: { collegeId, status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async linkStudyMaterial(collegeId: string, materialId: string) {
    const college = await this.prisma.college.findUnique({ where: { id: collegeId } });
    if (!college) {
      throw new NotFoundException(`College with id ${collegeId} not found`);
    }

    return this.prisma.studyMaterial.update({
      where: { id: materialId },
      data: { collegeId },
    });
  }

  async unlinkStudyMaterial(collegeId: string, materialId: string) {
    return this.prisma.studyMaterial.update({
      where: { id: materialId },
      data: { collegeId: null },
    });
  }

  // =========================================================================
  // PUBLISH / UNPUBLISH STATUS TOGGLE
  // =========================================================================

  async setPublishStatus(collegeId: string, publish: boolean, adminId: string) {
    const status = publish ? 'PUBLISHED' : 'DRAFT';
    const updated = await this.prisma.college.update({
      where: { id: collegeId },
      data: { status },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: publish ? 'PUBLISH_COLLEGE' : 'UNPUBLISH_COLLEGE',
      entity: 'College',
      entityId: collegeId,
      newValue: { status },
    });

    return updated;
  }

  // =========================================================================
  // COLLEGE PARTNER ORGANIZATION LIFECYCLE & VERIFICATION
  // =========================================================================

  async verifyCollege(id: string, adminId: string) {
    const existing = await this.prisma.college.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`College with id ${id} not found`);
    }

    const updated = await this.prisma.college.update({
      where: { id },
      data: {
        verified: true,
        status: 'VERIFIED',
      },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'COLLEGE_VERIFIED',
      entity: 'College',
      entityId: id,
      oldValue: existing as any,
      newValue: updated as any,
    });

    return {
      success: true,
      data: updated,
      message: `College ${existing.name} verified successfully.`,
    };
  }

  async activateCollege(id: string, adminId: string) {
    const existing = await this.prisma.college.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`College with id ${id} not found`);
    }

    const updated = await this.prisma.college.update({
      where: { id },
      data: {
        verified: true,
        status: 'ACTIVE',
      },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'COLLEGE_ACTIVATED',
      entity: 'College',
      entityId: id,
      oldValue: existing as any,
      newValue: updated as any,
    });

    return {
      success: true,
      data: updated,
      message: `College ${existing.name} is now ACTIVE.`,
    };
  }

  async suspendCollege(id: string, adminId: string, reason?: string) {
    const existing = await this.prisma.college.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`College with id ${id} not found`);
    }

    const updated = await this.prisma.college.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
      },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'COLLEGE_SUSPENDED',
      entity: 'College',
      entityId: id,
      oldValue: existing as any,
      newValue: { ...updated, reason } as any,
    });

    return {
      success: true,
      data: updated,
      message: `College ${existing.name} has been suspended.`,
    };
  }

  // =========================================================================
  // COLLEGE PORTAL REAL-TIME BACKEND-DERIVED METRICS
  // =========================================================================

  async getCollegePortalMetrics(collegeId: string, userId?: string) {
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
      include: {
        _count: {
          select: {
            applications: true,
            courses: true,
            offerings: true,
            reviews: true,
            staffUsers: true,
          },
        },
      },
    });

    if (!college) {
      throw new NotFoundException(`College with id ${collegeId} not found`);
    }

    // Applications breakdown by status
    const [
      totalApplications,
      newApplications,
      underReview,
      correctionRequired,
      approved,
      rejected,
      paymentPending,
      admissionConfirmed,
      reportingPending,
      reportingCompleted,
      enrolled,
      activeOfferings,
    ] = await Promise.all([
      this.prisma.application.count({ where: { collegeId } }),
      this.prisma.application.count({
        where: {
          collegeId,
          status: { in: ['NEW', 'DRAFT', 'READY_TO_SUBMIT', 'SUBMITTED'] },
        },
      }),
      this.prisma.application.count({
        where: {
          collegeId,
          status: { in: ['UNDER_REVIEW', 'COUNSELOR_ASSIGNED'] },
        },
      }),
      this.prisma.application.count({
        where: { collegeId, status: 'CORRECTION_REQUIRED' },
      }),
      this.prisma.application.count({
        where: { collegeId, status: { in: ['APPROVED', 'COLLEGE_APPROVED'] } },
      }),
      this.prisma.application.count({
        where: { collegeId, status: 'REJECTED' },
      }),
      this.prisma.application.count({
        where: { collegeId, paymentStatus: 'PENDING' },
      }),
      this.prisma.application.count({
        where: {
          collegeId,
          status: { in: ['ADMISSION_CONFIRMED', 'ADMISSION_COMPLETED'] },
        },
      }),
      this.prisma.collegeReporting.count({
        where: { collegeId, status: { not: 'REPORTING_COMPLETED' } },
      }),
      this.prisma.collegeReporting.count({
        where: { collegeId, status: 'REPORTING_COMPLETED' },
      }),
      this.prisma.studentEnrollment.count({
        where: { collegeId, status: 'ENROLLED' },
      }),
      this.prisma.collegeOffering.findMany({
        where: { collegeId, status: 'ACTIVE' },
        select: {
          totalSeats: true,
          availableSeats: true,
          reservedSeats: true,
          consumedSeats: true,
          waitlistCount: true,
        },
      }),
    ]);

    const totalSeats = activeOfferings.reduce((sum, o) => sum + o.totalSeats, 0);
    const availableSeats = activeOfferings.reduce((sum, o) => sum + o.availableSeats, 0);
    const consumedSeats = activeOfferings.reduce((sum, o) => sum + o.consumedSeats, 0);
    const reservedSeats = activeOfferings.reduce((sum, o) => sum + o.reservedSeats, 0);

    return {
      success: true,
      data: {
        college: {
          id: college.id,
          name: college.name,
          slug: college.slug,
          status: college.status,
          verified: college.verified,
          logo: college.logo,
          city: college.city,
          state: college.state,
          email: college.email,
          phone: college.phone,
        },
        metrics: {
          totalApplications,
          newApplications,
          underReview,
          correctionRequired,
          approved,
          rejected,
          paymentPending,
          admissionConfirmed,
          reportingPending,
          reportingCompleted,
          enrolled,
          activeOfferingsCount: activeOfferings.length,
          seatAccounting: {
            totalSeats,
            availableSeats,
            consumedSeats,
            reservedSeats,
          },
        },
      },
    };
  }

  // =========================================================================
  // COLLEGE STAFF ONBOARDING & MANAGEMENT
  // =========================================================================

  async getCollegeStaff(collegeId: string) {
    const staff = await this.prisma.user.findMany({
      where: { collegeId },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        role: true,
        designation: true,
        department: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: staff,
    };
  }

  async inviteCollegeStaff(
    collegeId: string,
    dto: {
      fullName: string;
      email: string;
      mobile: string;
      roleSlug?: string;
      designation?: string;
      password?: string;
    },
    adminUserId: string,
  ) {
    const email = dto.email.trim().toLowerCase();
    const mobile = dto.mobile.trim();

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { mobile }] },
    });

    if (existing) {
      if (existing.collegeId && existing.collegeId !== collegeId) {
        throw new BadRequestException(
          'User already belongs to another institution.',
        );
      }
      // Update existing user with college association
      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          collegeId,
          designation: dto.designation || existing.designation,
        },
      });
      return {
        success: true,
        data: updated,
        message: 'Existing user linked to college successfully.',
      };
    }

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(dto.password || 'College@123', 10);

    const newUser = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email,
        mobile,
        password: hashedPassword,
        collegeId,
        designation: dto.designation || 'College Staff',
        department: 'College Operations',
        role: 'ADMIN' as any,
        isActive: true,
        isApproved: true,
      },
    });

    // Assign RoleEntity if roleSlug provided or default to 'college-admin'
    const roleSlug = dto.roleSlug || 'college-admin';
    const roleEntity = await this.prisma.roleEntity.findUnique({
      where: { slug: roleSlug },
    });

    if (roleEntity) {
      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: newUser.id,
            roleId: roleEntity.id,
          },
        },
        create: {
          userId: newUser.id,
          roleId: roleEntity.id,
        },
        update: {},
      });
    }

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'COLLEGE_STAFF_CREATED',
      entity: 'User',
      entityId: newUser.id,
      newValue: { collegeId, email, roleSlug },
    });

    return {
      success: true,
      data: newUser,
      message: 'College staff account created successfully.',
    };
  }

  async updateCollegeStaffStatus(
    collegeId: string,
    staffUserId: string,
    isActive: boolean,
    adminUserId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: staffUserId, collegeId },
    });

    if (!user) {
      throw new NotFoundException('Staff user not found for this college.');
    }

    const updated = await this.prisma.user.update({
      where: { id: staffUserId },
      data: { isActive },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: isActive ? 'COLLEGE_STAFF_ACTIVATED' : 'COLLEGE_STAFF_SUSPENDED',
      entity: 'User',
      entityId: staffUserId,
      newValue: { isActive },
    });

    return {
      success: true,
      data: updated,
    };
  }

  // =========================================================================
  // COLLEGE INSTITUTIONAL COMPLIANCE DOCUMENTS
  // =========================================================================

  async getCollegeDocuments(collegeId: string) {
    const documents = await this.prisma.collegeDocument.findMany({
      where: { collegeId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: documents,
    };
  }

  async createCollegeDocument(
    collegeId: string,
    dto: {
      type: string;
      title: string;
      fileName: string;
      fileUrl: string;
      mimeType: string;
      fileSize?: number;
      validFrom?: Date;
      validUntil?: Date;
    },
    userId: string,
  ) {
    const doc = await this.prisma.collegeDocument.create({
      data: {
        collegeId,
        type: dto.type,
        title: dto.title,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize || 0,
        validFrom: dto.validFrom || null,
        validUntil: dto.validUntil || null,
        createdById: userId,
      },
    });

    return {
      success: true,
      data: doc,
    };
  }

  async deleteCollegeDocument(collegeId: string, docId: string) {
    await this.prisma.collegeDocument.deleteMany({
      where: { id: docId, collegeId },
    });

    return {
      success: true,
      message: 'College document removed successfully',
    };
  }

  // =========================================================================
  // COLLEGE CHANGE REQUESTS GOVERNANCE
  // =========================================================================

  async getChangeRequests(collegeId?: string) {
    const where: any = {};
    if (collegeId) where.collegeId = collegeId;

    const requests = await this.prisma.collegeChangeRequest.findMany({
      where,
      include: {
        college: { select: { id: true, name: true, slug: true } },
        offering: {
          include: {
            course: { select: { name: true } },
            branch: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: requests,
    };
  }

  async submitChangeRequest(
    collegeId: string,
    dto: {
      offeringId?: string;
      requestType: string;
      title: string;
      description?: string;
      currentData?: any;
      proposedData: any;
    },
    userId: string,
  ) {
    const req = await this.prisma.collegeChangeRequest.create({
      data: {
        collegeId,
        offeringId: dto.offeringId || null,
        requestType: dto.requestType,
        title: dto.title,
        description: dto.description || null,
        currentData: dto.currentData || null,
        proposedData: dto.proposedData,
        requestedById: userId,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      data: req,
      message: 'Change request submitted for central admin governance approval',
    };
  }

  async reviewChangeRequest(
    requestId: string,
    dto: {
      status: 'APPROVED' | 'REJECTED';
      remarks?: string;
    },
    adminId: string,
  ) {
    const req = await this.prisma.collegeChangeRequest.findUnique({
      where: { id: requestId },
      include: { offering: true },
    });

    if (!req) {
      throw new NotFoundException(`Change request ${requestId} not found`);
    }

    const updated = await this.prisma.collegeChangeRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        reviewRemarks: dto.remarks || null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    // If approved and related to offering fee/seat change, apply proposedData
    if (dto.status === 'APPROVED' && req.offeringId && req.proposedData) {
      const pData = req.proposedData as any;
      await this.prisma.collegeOffering.update({
        where: { id: req.offeringId },
        data: {
          totalSeats: pData.totalSeats !== undefined ? pData.totalSeats : undefined,
          tuitionFee: pData.tuitionFee !== undefined ? pData.tuitionFee : undefined,
          admissionFee: pData.admissionFee !== undefined ? pData.admissionFee : undefined,
          totalFee: pData.totalFee !== undefined ? pData.totalFee : undefined,
        },
      });
    }

    return {
      success: true,
      data: updated,
      message: `Change request marked as ${dto.status}`,
    };
  }
}

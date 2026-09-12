import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateStateDto,
  CreateDistrictDto,
  CreateGeographicAssignmentDto,
  UpdateGeographicAssignmentDto,
  GeographicQueryDto,
  GeographicStatusEnum,
} from './dto/geography.dto';
import { Prisma } from '@prisma/client';
import { COMPLETE_INDIAN_GEOGRAPHY } from './india-geography.data';

@Injectable()
export class GeographyService {
  private readonly logger = new Logger(GeographyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Validate counselor eligibility
   */
  private async validateCounselorEligibility(
    userId?: string | null,
    label = 'Responsible User',
  ): Promise<any> {
    if (!userId) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        counselorProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`${label} with ID "${userId}" not found`);
    }

    if (!user.isActive) {
      throw new BadRequestException(
        `${label} "${user.fullName}" is currently inactive`,
      );
    }

    const isLocked = user.userRoles.some((ur) => ur.role.status === 'LOCKED');
    if (isLocked) {
      throw new ForbiddenException(
        `${label} "${user.fullName}" has a security-locked role and cannot be assigned geographic responsibility`,
      );
    }

    return user;
  }

  /**
   * List all States with district counts and active assignment counts
   */
  async getStates() {
    const states = await this.prisma.state.findMany({
      include: {
        _count: {
          select: {
            districts: true,
            assignments: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return states.map((st) => ({
      id: st.id,
      name: st.name,
      code: st.code,
      status: st.status,
      districtsCount: st._count.districts,
      activeAssignmentsCount: st._count.assignments,
      createdAt: st.createdAt,
      updatedAt: st.updatedAt,
    }));
  }

  /**
   * Create a State
   */
  async createState(dto: CreateStateDto, actorUserId?: string) {
    const existing = await this.prisma.state.findFirst({
      where: {
        OR: [
          { name: { equals: dto.name.trim(), mode: 'insensitive' } },
          { code: dto.code.toUpperCase().trim() },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException(
        `State with name "${dto.name}" or code "${dto.code}" already exists`,
      );
    }

    const state = await this.prisma.state.create({
      data: {
        name: dto.name.trim(),
        code: dto.code.toUpperCase().trim(),
        status: dto.status || 'ACTIVE',
      },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'STATE_CREATED',
      entity: 'STATE',
      entityId: state.id,
      entityName: state.name,
      userId: actorUserId,
      newValue: { name: state.name, code: state.code },
      description: `State "${state.name}" (${state.code}) added to geographic registry`,
    });

    return state;
  }

  /**
   * List Districts for a State
   */
  async getDistricts(stateId: string) {
    const state = await this.prisma.state.findUnique({
      where: { id: stateId },
    });

    if (!state) {
      throw new NotFoundException(`State with ID "${stateId}" not found`);
    }

    return this.prisma.district.findMany({
      where: { stateId },
      include: {
        _count: {
          select: { assignments: { where: { status: 'ACTIVE' } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a District
   */
  async createDistrict(dto: CreateDistrictDto, actorUserId?: string) {
    const state = await this.prisma.state.findUnique({
      where: { id: dto.stateId },
    });

    if (!state) {
      throw new NotFoundException(`State with ID "${dto.stateId}" not found`);
    }

    const existing = await this.prisma.district.findFirst({
      where: {
        stateId: dto.stateId,
        name: { equals: dto.name.trim(), mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `District "${dto.name}" already exists under state "${state.name}"`,
      );
    }

    const district = await this.prisma.district.create({
      data: {
        name: dto.name.trim(),
        code: dto.code?.toUpperCase().trim() || null,
        stateId: dto.stateId,
        status: dto.status || 'ACTIVE',
      },
      include: { state: { select: { name: true, code: true } } },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'DISTRICT_CREATED',
      entity: 'DISTRICT',
      entityId: district.id,
      entityName: `${district.name}, ${district.state.name}`,
      userId: actorUserId,
      newValue: { name: district.name, state: district.state.name },
      description: `District "${district.name}" added under "${district.state.name}"`,
    });

    return district;
  }

  /**
   * List Geographic Responsibility Assignments with Filtering
   */
  async getAssignments(query: GeographicQueryDto) {
    const where: Prisma.GeographicAssignmentWhereInput = {};

    if (query.stateId) {
      where.stateId = query.stateId;
    }

    if (query.districtId) {
      where.districtId = query.districtId;
    }

    if (query.responsibleUserId) {
      where.OR = [
        { responsibleUserId: query.responsibleUserId },
        { backupUserId: query.responsibleUserId },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { state: { name: { contains: query.search, mode: 'insensitive' } } },
        { district: { name: { contains: query.search, mode: 'insensitive' } } },
        {
          responsibleUser: {
            fullName: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          backupUser: {
            fullName: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    return this.prisma.geographicAssignment.findMany({
      where,
      include: {
        state: { select: { id: true, name: true, code: true } },
        district: { select: { id: true, name: true, code: true } },
        responsibleUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            role: true,
            avatar: true,
            designation: true,
          },
        },
        backupUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            role: true,
            avatar: true,
            designation: true,
          },
        },
      },
      orderBy: [
        { state: { name: 'asc' } },
        { district: { name: 'asc' } },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get assignment history for a specific state and/or district
   */
  async getAssignmentHistory(stateId: string, districtId?: string) {
    const where: Prisma.GeographicAssignmentWhereInput = {
      stateId,
    };

    if (districtId !== undefined) {
      where.districtId = districtId || null;
    }

    const assignments = await this.prisma.geographicAssignment.findMany({
      where,
      include: {
        state: { select: { id: true, name: true, code: true } },
        district: { select: { id: true, name: true, code: true } },
        responsibleUser: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        backupUser: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        module: 'ORGANIZATION',
        action: {
          in: [
            'GEOGRAPHIC_ASSIGNMENT_CREATED',
            'GEOGRAPHIC_ASSIGNMENT_UPDATED',
            'GEOGRAPHIC_ASSIGNMENT_DISABLED',
          ],
        },
        state: stateId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      assignments,
      auditLogs,
    };
  }

  /**
   * Create a Geographic Responsibility Mapping
   */
  async createAssignment(
    dto: CreateGeographicAssignmentDto,
    actorUserId?: string,
  ) {
    const state = await this.prisma.state.findUnique({
      where: { id: dto.stateId },
    });
    if (!state) {
      throw new NotFoundException(`State with ID "${dto.stateId}" not found`);
    }

    let district: any = null;
    if (dto.districtId) {
      district = await this.prisma.district.findUnique({
        where: { id: dto.districtId },
      });
      if (!district) {
        throw new NotFoundException(
          `District with ID "${dto.districtId}" not found`,
        );
      }
      if (district.stateId !== dto.stateId) {
        throw new BadRequestException(
          `District "${district.name}" does not belong to state "${state.name}"`,
        );
      }
    }

    // Validate responsible counselors
    const primaryUser = await this.validateCounselorEligibility(
      dto.responsibleUserId,
      'Primary Responsible Counselor',
    );
    let backupUser: any = null;
    if (dto.backupUserId) {
      if (dto.backupUserId === dto.responsibleUserId) {
        throw new BadRequestException(
          'Primary counselor and backup counselor cannot be the same user',
        );
      }
      backupUser = await this.validateCounselorEligibility(
        dto.backupUserId,
        'Backup Responsible Counselor',
      );
    }

    // Effective dates validation
    const effectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : new Date();
    const effectiveUntil = dto.effectiveUntil
      ? new Date(dto.effectiveUntil)
      : null;
    if (effectiveUntil && effectiveFrom >= effectiveUntil) {
      throw new BadRequestException(
        'effectiveFrom must be before effectiveUntil',
      );
    }

    // Overlap prevention check
    const activeOverlap = await this.prisma.geographicAssignment.findFirst({
      where: {
        stateId: dto.stateId,
        districtId: dto.districtId || null,
        status: 'ACTIVE',
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gt: effectiveFrom } },
        ],
      },
    });

    if (activeOverlap) {
      throw new BadRequestException(
        `Active assignment already exists for ${district ? district.name : state.name}. Reassign or archive the previous assignment instead of creating a conflicting active record.`,
      );
    }

    const assignment = await this.prisma.geographicAssignment.create({
      data: {
        stateId: dto.stateId,
        districtId: dto.districtId || null,
        responsibleUserId: dto.responsibleUserId,
        backupUserId: dto.backupUserId || null,
        assignedRole: dto.assignedRole || 'SENIOR_COUNSELOR',
        status: dto.status || GeographicStatusEnum.ACTIVE,
        effectiveFrom,
        effectiveUntil,
        notes: dto.notes?.trim() || null,
        createdById: actorUserId || null,
      },
      include: {
        state: { select: { name: true } },
        district: { select: { name: true } },
        responsibleUser: { select: { fullName: true, email: true } },
        backupUser: { select: { fullName: true, email: true } },
      },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'GEOGRAPHIC_ASSIGNMENT_CREATED',
      entity: 'GEOGRAPHIC_ASSIGNMENT',
      entityId: assignment.id,
      entityName: `${assignment.state.name} -> ${assignment.district?.name || 'All Districts'}`,
      userId: actorUserId,
      state: state.name,
      city: district?.name,
      newValue: {
        state: assignment.state.name,
        district: assignment.district?.name || 'State-wide',
        primary: assignment.responsibleUser.fullName,
        backup: assignment.backupUser?.fullName || 'None',
        effectiveFrom,
      },
      description: `Geographic responsibility for ${assignment.state.name}/${assignment.district?.name || 'State-wide'} assigned to ${primaryUser.fullName}`,
    });

    return assignment;
  }

  /**
   * Reassign/Update Geographic Responsibility with Historical Preservation
   */
  async updateAssignment(
    id: string,
    dto: UpdateGeographicAssignmentDto,
    actorUserId?: string,
  ) {
    const current = await this.prisma.geographicAssignment.findUnique({
      where: { id },
      include: {
        state: true,
        district: true,
        responsibleUser: true,
        backupUser: true,
      },
    });

    if (!current) {
      throw new NotFoundException(
        `Geographic assignment with ID "${id}" not found`,
      );
    }

    const effectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : new Date();
    const effectiveUntil = dto.effectiveUntil
      ? new Date(dto.effectiveUntil)
      : null;
    if (effectiveUntil && effectiveFrom >= effectiveUntil) {
      throw new BadRequestException(
        'effectiveFrom must be before effectiveUntil',
      );
    }

    // If responsible user is changing, preserve history by archiving the current record and creating a new one
    const isPrimaryChanging =
      dto.responsibleUserId &&
      dto.responsibleUserId !== current.responsibleUserId;

    if (isPrimaryChanging) {
      const newPrimary = await this.validateCounselorEligibility(
        dto.responsibleUserId,
        'New Primary Responsible Counselor',
      );

      let newBackupId =
        dto.backupUserId !== undefined
          ? dto.backupUserId
          : current.backupUserId;
      if (newBackupId === dto.responsibleUserId) {
        throw new BadRequestException(
          'Primary counselor and backup counselor cannot be the same user',
        );
      }
      if (newBackupId) {
        await this.validateCounselorEligibility(
          newBackupId,
          'Backup Responsible Counselor',
        );
      }

      // Execute transaction: archive old assignment, create new assignment
      const [archivedOld, newAssignment] = await this.prisma.$transaction([
        this.prisma.geographicAssignment.update({
          where: { id },
          data: {
            status: GeographicStatusEnum.ARCHIVED,
            effectiveUntil: effectiveFrom,
          },
        }),
        this.prisma.geographicAssignment.create({
          data: {
            stateId: current.stateId,
            districtId: current.districtId,
            responsibleUserId: dto.responsibleUserId!,
            backupUserId: newBackupId || null,
            assignedRole: dto.assignedRole || current.assignedRole,
            status: dto.status || GeographicStatusEnum.ACTIVE,
            effectiveFrom,
            effectiveUntil,
            notes: dto.notes !== undefined ? dto.notes : current.notes,
            createdById: actorUserId || null,
          },
          include: {
            state: { select: { name: true } },
            district: { select: { name: true } },
            responsibleUser: { select: { fullName: true } },
            backupUser: { select: { fullName: true } },
          },
        }),
      ]);

      await this.auditService.logAction({
        module: 'ORGANIZATION',
        action: 'GEOGRAPHIC_ASSIGNMENT_UPDATED',
        entity: 'GEOGRAPHIC_ASSIGNMENT',
        entityId: newAssignment.id,
        entityName: `${current.state.name} -> ${current.district?.name || 'All'}`,
        userId: actorUserId,
        state: current.state.name,
        city: current.district?.name,
        oldValue: {
          assignmentId: current.id,
          primary: current.responsibleUser.fullName,
          status: current.status,
          effectiveUntil: effectiveFrom,
        },
        newValue: {
          assignmentId: newAssignment.id,
          primary: newPrimary.fullName,
          status: newAssignment.status,
          effectiveFrom,
        },
        description: `Geographic responsibility for ${current.state.name}/${current.district?.name || 'State-wide'} reassigned from ${current.responsibleUser.fullName} to ${newPrimary.fullName} (Historical ownership preserved)`,
      });

      return newAssignment;
    }

    // If only metadata / backup / notes / status is changing
    const dataToUpdate: Prisma.GeographicAssignmentUpdateInput = {};

    if (dto.backupUserId !== undefined) {
      if (dto.backupUserId) {
        if (dto.backupUserId === current.responsibleUserId) {
          throw new BadRequestException(
            'Primary counselor and backup counselor cannot be the same user',
          );
        }
        await this.validateCounselorEligibility(
          dto.backupUserId,
          'Backup Responsible Counselor',
        );
        dataToUpdate.backupUser = { connect: { id: dto.backupUserId } };
      } else {
        dataToUpdate.backupUser = { disconnect: true };
      }
    }

    if (dto.status) dataToUpdate.status = dto.status;
    if (dto.notes !== undefined) dataToUpdate.notes = dto.notes;
    if (dto.effectiveFrom)
      dataToUpdate.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveUntil !== undefined) {
      dataToUpdate.effectiveUntil = dto.effectiveUntil
        ? new Date(dto.effectiveUntil)
        : null;
    }

    const updated = await this.prisma.geographicAssignment.update({
      where: { id },
      data: dataToUpdate,
      include: {
        state: { select: { name: true } },
        district: { select: { name: true } },
        responsibleUser: { select: { fullName: true } },
        backupUser: { select: { fullName: true } },
      },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'GEOGRAPHIC_ASSIGNMENT_UPDATED',
      entity: 'GEOGRAPHIC_ASSIGNMENT',
      entityId: updated.id,
      entityName: `${updated.state.name} -> ${updated.district?.name || 'All'}`,
      userId: actorUserId,
      state: updated.state.name,
      newValue: {
        status: updated.status,
        backup: updated.backupUser?.fullName || 'None',
        notes: updated.notes,
      },
      description: `Geographic responsibility mapping updated for ${updated.state.name}/${updated.district?.name || 'All'}`,
    });

    return updated;
  }

  /**
   * Seed authoritative Indian States, Union Territories and all official Districts
   */
  async seedDefaultGeography(actorUserId?: string) {
    let statesCreated = 0;
    let statesUpdated = 0;
    let districtsCreated = 0;

    for (const item of COMPLETE_INDIAN_GEOGRAPHY) {
      let state = await this.prisma.state.findUnique({
        where: { code: item.code },
      });

      if (!state) {
        state = await this.prisma.state.create({
          data: {
            name: item.name,
            code: item.code,
            type: item.type,
            status: 'ACTIVE',
          },
        });
        statesCreated++;
      } else {
        if (state.name !== item.name || state.type !== item.type) {
          state = await this.prisma.state.update({
            where: { id: state.id },
            data: { name: item.name, type: item.type },
          });
          statesUpdated++;
        }
      }

      for (const distName of item.districts) {
        const existingDist = await this.prisma.district.findFirst({
          where: { stateId: state.id, name: distName },
        });

        if (!existingDist) {
          await this.prisma.district.create({
            data: {
              name: distName,
              stateId: state.id,
              status: 'ACTIVE',
            },
          });
          districtsCreated++;
        }
      }
    }

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'GEOGRAPHY_SEEDED',
      entity: 'GEOGRAPHY',
      userId: actorUserId,
      newValue: { statesCreated, statesUpdated, districtsCreated },
      description: `Authoritative Indian geography seeded: ${statesCreated} states created, ${statesUpdated} updated, ${districtsCreated} districts created`,
    });

    return {
      message: `Successfully verified and seeded complete geographic foundation (${statesCreated} new states, ${statesUpdated} updated states, ${districtsCreated} new districts)`,
      statesCreated,
      statesUpdated,
      districtsCreated,
    };
  }

  /**
   * Public: Get all active states/UTs for public dropdowns
   */
  async getPublicStates() {
    let states = await this.prisma.state.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
      },
      orderBy: { name: 'asc' },
    });

    if (states.length === 0) {
      try {
        await this.seedDefaultGeography();
        states = await this.prisma.state.findMany({
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
          orderBy: { name: 'asc' },
        });
      } catch {}
    }

    return states;
  }

  /**
   * Public: Get all active districts under a state (supports state id, name, or code)
   */
  async getPublicDistricts(stateId: string) {
    if (!stateId) return [];

    const state = await this.prisma.state.findFirst({
      where: {
        OR: [
          { id: stateId },
          { name: { equals: stateId, mode: 'insensitive' } },
          { code: { equals: stateId, mode: 'insensitive' } },
        ],
      },
    });

    if (!state) {
      return [];
    }

    return this.prisma.district.findMany({
      where: { stateId: state.id, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        code: true,
        stateId: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Public: Validate if a district belongs to a state
   */
  async validateStateDistrict(stateId: string, districtId: string) {
    const district = await this.prisma.district.findFirst({
      where: { id: districtId, stateId, status: 'ACTIVE' },
      include: { state: { select: { id: true, name: true, code: true } } },
    });

    return {
      isValid: !!district,
      district: district ? { id: district.id, name: district.name } : null,
      state: district?.state
        ? { id: district.state.id, name: district.state.name }
        : null,
    };
  }

  /**
   * Authoritative Postal Index Number (PIN) validation against State and District.
   * Enforces 6-digit standard, State postal circle prefix, and District sorting office range.
   */
  async validatePincode(
    stateNameOrId: string,
    districtNameOrId: string,
    pincode: string,
  ): Promise<{ isValid: boolean; message: string; state?: string; district?: string }> {
    if (!pincode || typeof pincode !== 'string') {
      return { isValid: false, message: 'PIN Code is required.' };
    }

    const cleanPin = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      return {
        isValid: false,
        message: 'Invalid PIN Code format. Must be a valid 6-digit Indian postal code.',
      };
    }

    // Resolve State
    const state = await this.prisma.state.findFirst({
      where: {
        OR: [
          { id: stateNameOrId },
          { name: { equals: stateNameOrId?.trim(), mode: 'insensitive' } },
          { code: { equals: stateNameOrId?.trim(), mode: 'insensitive' } },
        ],
      },
    });

    const stateName = (state?.name || stateNameOrId || '').trim();

    // Resolve District
    let districtName = (districtNameOrId || '').trim();
    if (districtNameOrId) {
      const districtRecord = await this.prisma.district.findFirst({
        where: {
          OR: [
            { id: districtNameOrId },
            { name: { equals: districtNameOrId?.trim(), mode: 'insensitive' } },
          ],
        },
      });
      if (districtRecord) {
        districtName = districtRecord.name;
      }
    }

    // 1. Authoritative State Postal Circle Prefix Validation
    const STATE_POSTAL_PREFIXES: Record<string, string[]> = {
      delhi: ['11'],
      haryana: ['12', '13'],
      punjab: ['14', '15', '16'],
      chandigarh: ['16'],
      'himachal pradesh': ['17'],
      'jammu and kashmir': ['18', '19'],
      ladakh: ['19'],
      'uttar pradesh': ['20', '21', '22', '23', '24', '25', '26', '27', '28'],
      uttarakhand: ['24', '26'],
      rajasthan: ['30', '31', '32', '33', '34'],
      gujarat: ['36', '37', '38', '39'],
      maharashtra: ['40', '41', '42', '43', '44'],
      goa: ['40'],
      'madhya pradesh': ['45', '46', '47', '48'],
      chhattisgarh: ['49'],
      telangana: ['50'],
      'andhra pradesh': ['51', '52', '53'],
      karnataka: ['56', '57', '58', '59'],
      'tamil nadu': ['60', '61', '62', '63', '64'],
      puducherry: ['60'],
      kerala: ['67', '68', '69'],
      lakshadweep: ['68'],
      'west bengal': ['70', '71', '72', '73', '74'],
      odisha: ['75', '76', '77'],
      assam: ['78'],
      meghalaya: ['79'],
      manipur: ['79'],
      mizoram: ['79'],
      nagaland: ['79'],
      tripura: ['79'],
      'arunachal pradesh': ['79'],
      bihar: ['80', '81', '82', '83', '84', '85'],
      jharkhand: ['81', '82', '83'],
    };

    const sKey = stateName.toLowerCase();
    const allowedStatePrefixes = STATE_POSTAL_PREFIXES[sKey];

    if (allowedStatePrefixes) {
      const pinPrefix2 = cleanPin.slice(0, 2);
      if (!allowedStatePrefixes.includes(pinPrefix2)) {
        return {
          isValid: false,
          message: `PIN Code "${cleanPin}" does not belong to the selected state "${stateName}".`,
          state: stateName,
          district: districtName,
        };
      }
    }

    // 2. Authoritative District Postal Sub-prefix / Sorting Office Validation
    const dKey = districtName.toLowerCase().replace(/[^a-z]/g, '');

    // Canonical district specific prefixes (3 or 4 digit checks)
    const DISTRICT_POSTAL_MAP: Record<string, string[]> = {
      // Bihar Districts
      buxar: ['80210', '80211', '80212', '80213', '80214', '8021'],
      bhojpur: ['80215', '80216', '80217', '80218', '8022', '8023'],
      patna: ['800', '801'],
      nalanda: ['8031', '8032'],
      rohtas: ['8022', '8213'],
      kaimur: ['8211'],
      gaya: ['823', '8242'],
      sitamarhi: ['8433'],
      muzaffarpur: ['842', '8431'],
      darbhanga: ['846', '847'],
      madhubani: ['8472', '8474'],
      bhagalpur: ['812', '813'],
      purnia: ['854'],
      munger: ['811'],
      begusarai: ['851'],
      samastipur: ['848'],
      vaishali: ['844'],
      saran: ['841'],
      siwan: ['8412'],
      gopalganj: ['8414'],
      eastchamparan: ['8454', '8455'],
      westchamparan: ['8451', '8454'],
      aurangabad: ['8241', '8242'],
      nawada: ['8051'],
      jehanabad: ['8044'],
      arwal: ['8044'],
      banka: ['8131', '8132'],
      jamui: ['8113'],
      khagaria: ['8512'],
      saharsa: ['8522'],
      madhepura: ['8521'],
      supaul: ['8521'],
      katihar: ['8541'],
      kishanganj: ['8551'],
      araria: ['8543'],
      sheohar: ['8433'],

      // Karnataka Districts
      chikkaballapura: ['5621', '5612', '5631'],
      chikballapur: ['5621', '5612', '5631'],
      bangaloreurban: ['560'],
      bengaluruurban: ['560'],
      bangalorerural: ['5621'],
      bengalururural: ['5621'],
      kolar: ['5631'],
      tumkur: ['572'],
      tumakuru: ['572'],
      mysore: ['570', '571'],
      mysuru: ['570', '571'],
      mandya: ['5714'],
      hassan: ['573'],
      dakshinakannada: ['574', '575'],
      mangaluru: ['574', '575'],
      udupi: ['576'],
      belgaum: ['590', '591'],
      belagavi: ['590', '591'],
      dharwad: ['580'],
      hubli: ['580'],
      hubballi: ['580'],
      bellary: ['583'],
      ballari: ['583'],
      shimoga: ['577'],
      shivamogga: ['577'],
      davanagere: ['577'],
      raichur: ['584'],
      koppal: ['5832'],
      gadag: ['582'],
      haveri: ['581'],
      bagalkot: ['587'],
      bijapur: ['586'],
      vijayapura: ['586'],
      gulbarga: ['585'],
      kalaburagi: ['585'],
      bidar: ['5852', '5853', '5854'],
      chamarajanagar: ['5711', '5713', '5714'],
      chikmagalur: ['5771'],
      chikkamagaluru: ['5771'],
      chitradurga: ['5775'],
      kodagu: ['5712'],
      uttarakannada: ['5813', '5814'],
      yadgir: ['5853'],

      // West Bengal Districts
      kolkata: ['700'],
      howrah: ['711'],
      hooghly: ['712'],
      north24parganas: ['7431', '7432', '7001'],
      south24parganas: ['7433', '7435'],
      purbabardhaman: ['713'],
      paschimbardhaman: ['713'],
      burdwan: ['713'],
      darjeeling: ['734'],
      nadia: ['741'],
      murshidabad: ['742'],
      purbamedinipur: ['721'],
      paschimmedinipur: ['721'],
      malda: ['732'],
      jalpaiguri: ['735'],
      alipurduar: ['736'],
      coochbehar: ['736'],
      bankura: ['722'],
      purulia: ['723'],
      birbhum: ['731'],

      // Jharkhand Districts
      ranchi: ['834', '835'],
      dhanbad: ['826', '828'],
      bokaro: ['827', '829'],
      eastsinghbhum: ['831', '832'],
      jamshedpur: ['831', '832'],
      westsinghbhum: ['833'],
      hazaribagh: ['825'],
      deoghar: ['814'],
      khunti: ['8352'],
      ramgarh: ['8291'],
      giridih: ['815'],
      koderma: ['8254'],
      chatra: ['8254'],
      dumka: ['8141'],
      godda: ['8141'],
      sahibganj: ['8161'],
      pakur: ['8161'],
      jamtara: ['8153'],
      palamu: ['8221'],
      garhwa: ['8221'],
      latehar: ['8292'],
      lohardaga: ['8353'],
      gumla: ['8352'],
      simdega: ['8352'],
      saraikela: ['8324', '8332'],
    };

    const allowedDistrictPrefixes = DISTRICT_POSTAL_MAP[dKey];
    if (allowedDistrictPrefixes && allowedDistrictPrefixes.length > 0) {
      const matchesDistrict = allowedDistrictPrefixes.some((p) =>
        cleanPin.startsWith(p),
      );
      if (!matchesDistrict) {
        return {
          isValid: false,
          message: `PIN Code "${cleanPin}" does not belong to the selected district "${districtName}".`,
          state: stateName,
          district: districtName,
        };
      }
    }

    return {
      isValid: true,
      message: `PIN Code "${cleanPin}" is valid for ${districtName}, ${stateName}.`,
      state: stateName,
      district: districtName,
    };
  }
}

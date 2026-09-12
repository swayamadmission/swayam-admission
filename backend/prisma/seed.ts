import { PrismaClient, Role, RoleStatus, DataScope } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SYSTEM_PERMISSIONS } from '../src/roles/seed-permissions';
import { COMPLETE_INDIAN_GEOGRAPHY } from '../src/organization/india-geography.data';

const bcryptLib = bcrypt as unknown as {
  hash: (s: string, saltOrRounds: number) => Promise<string>;
  compare: (s: string, hash: string) => Promise<boolean>;
};

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@swayamadmission.in';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_MOBILE = '0000000001';
const ADMIN_NAME = 'System Admin';

async function main() {
  console.log('🌱 Running Enterprise IAM & RBAC Seed...');

  // 1. Seed System Permissions (Idempotent upsert)
  console.log(`📦 Seeding ${SYSTEM_PERMISSIONS.length} system permissions...`);
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        category: perm.category,
        group: perm.group,
      },
      create: {
        code: perm.code,
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        category: perm.category,
        group: perm.group,
      },
    });
  }
  console.log('✅ Permissions synced successfully.');

  // 2. Ensure Super Admin User
  let admin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (admin) {
    admin = await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        role: Role.SUPER_ADMIN,
        fullName: ADMIN_NAME,
        isApproved: true,
      },
    });
    console.log(`✅ Super Admin user verified: ${admin.email} (id: ${admin.id})`);
  } else {
    const hashedPassword = await bcryptLib.hash(ADMIN_PASSWORD, 10);
    admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        fullName: ADMIN_NAME,
        mobile: ADMIN_MOBILE,
        isApproved: true,
      },
    });
    console.log(`✅ Super Admin user created: ${admin.email} (id: ${admin.id})`);
  }

  // 3. Seed Core System Role Entities
  console.log('🏢 Seeding core IAM hierarchy roles...');

  // Super Admin Role
  const superAdminRole = await prisma.roleEntity.upsert({
    where: { slug: 'super-admin' },
    update: {
      name: 'Super Admin',
      status: RoleStatus.ACTIVE,
      isProtected: true,
      dataScope: DataScope.GLOBAL,
      level: 1,
      priority: 100,
      department: 'Executive',
      color: '#4A7B5B',
    },
    create: {
      name: 'Super Admin',
      slug: 'super-admin',
      description: 'Supreme enterprise administrator with unrestricted platform authority.',
      status: RoleStatus.ACTIVE,
      isProtected: true,
      dataScope: DataScope.GLOBAL,
      level: 1,
      priority: 100,
      department: 'Executive',
      color: '#4A7B5B',
      isSystem: true,
    },
  });

  // Director Role
  const directorRole = await prisma.roleEntity.upsert({
    where: { slug: 'director' },
    update: {
      name: 'Director',
      parentRoleId: superAdminRole.id,
      status: RoleStatus.ACTIVE,
      isProtected: true,
      dataScope: DataScope.GLOBAL,
      level: 2,
      priority: 90,
      department: 'Management',
      color: '#7C3AED',
    },
    create: {
      name: 'Director',
      slug: 'director',
      description: 'Executive management director overseeing nationwide operations and approvals.',
      parentRoleId: superAdminRole.id,
      status: RoleStatus.ACTIVE,
      isProtected: true,
      dataScope: DataScope.GLOBAL,
      level: 2,
      priority: 90,
      department: 'Management',
      color: '#7C3AED',
      isSystem: true,
    },
  });

  // State Manager Role
  const stateManagerRole = await prisma.roleEntity.upsert({
    where: { slug: 'state-manager' },
    update: {
      name: 'State Manager',
      parentRoleId: directorRole.id,
      status: RoleStatus.ACTIVE,
      isProtected: false,
      dataScope: DataScope.STATE,
      level: 3,
      priority: 75,
      department: 'Admissions',
      color: '#0EA5E9',
    },
    create: {
      name: 'State Manager',
      slug: 'state-manager',
      description: 'Regional state head managing counselors, allocations, and district operations.',
      parentRoleId: directorRole.id,
      status: RoleStatus.ACTIVE,
      isProtected: false,
      dataScope: DataScope.STATE,
      level: 3,
      priority: 75,
      department: 'Admissions',
      color: '#0EA5E9',
      isSystem: true,
    },
  });

  // Senior Counselor Role
  const seniorCounselorRole = await prisma.roleEntity.upsert({
    where: { slug: 'senior-counselor' },
    update: {
      name: 'Senior Counselor',
      parentRoleId: stateManagerRole.id,
      status: RoleStatus.ACTIVE,
      isProtected: false,
      selfRegistrable: true,
      approvalRequired: true,
      dataScope: DataScope.TEAM,
      level: 4,
      priority: 60,
      department: 'Admissions',
      color: '#F0AE1A',
    },
    create: {
      name: 'Senior Counselor',
      slug: 'senior-counselor',
      description: 'Senior admissions counselor supervising junior teams and VIP candidates.',
      parentRoleId: stateManagerRole.id,
      status: RoleStatus.ACTIVE,
      isProtected: false,
      selfRegistrable: true,
      approvalRequired: true,
      dataScope: DataScope.TEAM,
      level: 4,
      priority: 60,
      department: 'Admissions',
      color: '#F0AE1A',
      isSystem: true,
    },
  });

  // Counselor Role
  const counselorRole = await prisma.roleEntity.upsert({
    where: { slug: 'counselor' },
    update: {
      name: 'Counselor',
      parentRoleId: seniorCounselorRole.id,
      status: RoleStatus.ACTIVE,
      isProtected: false,
      selfRegistrable: true,
      approvalRequired: true,
      dataScope: DataScope.ASSIGNED,
      level: 5,
      priority: 40,
      department: 'Admissions',
      color: '#64748B',
    },
    create: {
      name: 'Counselor',
      slug: 'counselor',
      description: 'Frontline academic counselor engaging with assigned student leads.',
      parentRoleId: seniorCounselorRole.id,
      status: RoleStatus.ACTIVE,
      isProtected: false,
      selfRegistrable: true,
      approvalRequired: true,
      dataScope: DataScope.ASSIGNED,
      level: 5,
      priority: 40,
      department: 'Admissions',
      color: '#64748B',
      isSystem: true,
    },
  });

  // Grant all permissions to Super Admin role
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      },
      update: { allow: true },
      create: {
        roleId: superAdminRole.id,
        permissionId: perm.id,
        allow: true,
      },
    });
  }

  // Assign Super Admin role to the default admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: superAdminRole.id,
    },
  });

  // 4. Seed Complete Authoritative Indian Geography (28 States + 8 UTs + All Districts)
  console.log('🗺️  Seeding complete Indian geography (28 States + 8 Union Territories + all Districts)...');
  
  let statesCount = 0;
  let districtsCount = 0;
  for (const item of COMPLETE_INDIAN_GEOGRAPHY) {
    const state = await prisma.state.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        type: item.type,
        status: 'ACTIVE',
      },
      create: {
        name: item.name,
        code: item.code,
        type: item.type,
        status: 'ACTIVE',
      },
    });
    statesCount++;

    for (const distName of item.districts) {
      await prisma.district.upsert({
        where: {
          stateId_name: {
            stateId: state.id,
            name: distName,
          },
        },
        update: {
          status: 'ACTIVE',
        },
        create: {
          name: distName,
          stateId: state.id,
          status: 'ACTIVE',
        },
      });
      districtsCount++;
    }
  }
  console.log(`✅ Geography synchronized: ${statesCount} States & UTs, ${districtsCount} Districts.`);

  console.log('✅ Core IAM Hierarchy & Super Admin assignment completed.');
  console.log('');
  console.log('🔑 Permanent Admin Credentials:');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role:     SUPER_ADMIN (RoleEntity: ${superAdminRole.name})`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

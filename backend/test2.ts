import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function run() {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@swayamadmission.in' }
    });
    
    if (!admin) {
      console.error('Admin not found!');
      return;
    }

    const adminId = admin.id;
    const dto = {
      fullName: 'DANISH',
      email: '1234567@gmail.com',
      mobile: '9876543210',
      password: 'password123',
      isApproved: true
    };
    
    console.log('Hitting prisma.user.create...');
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        mobile: dto.mobile,
        password: hashedPassword,
        role: 'COUNSELOR',
        isApproved: dto.isApproved,
      },
    });
    console.log('User created:', user.id);
    
    console.log('Hitting prisma.auditLog.create...');
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CREATE',
        entity: 'USER',
        entityId: user.id,
        newValue: JSON.stringify({ role: 'COUNSELOR', email: dto.email }),
      },
    });
    console.log('Audit log created');
  } catch (err) {
    console.error('EXCEPTION CAUGHT:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();

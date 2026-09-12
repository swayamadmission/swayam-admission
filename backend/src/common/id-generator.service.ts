import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class IdGeneratorService {
  private readonly logger = new Logger(IdGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates an immutable, unique Student ID: SWY-STU-XXXXXXXX (8 alphanumeric chars)
   */
  async generateStudentId(): Promise<string> {
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
      const studentId = `SWY-STU-${randomPart}`;

      const existing = await this.prisma.user.findFirst({
        where: { studentId },
        select: { id: true },
      });

      if (!existing) {
        return studentId;
      }
    }
    // Fallback timestamp-based guarantee
    return `SWY-STU-${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Generates an immutable, unique Registration Number: SA-REG-YYYY-XXXXXX
   */
  async generateRegistrationNumber(year = new Date().getFullYear()): Promise<string> {
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const regNumber = `SA-REG-${year}-${randomNum}`;

      const existing = await this.prisma.user.findFirst({
        where: { registrationNumber: regNumber },
        select: { id: true },
      });

      if (!existing) {
        return regNumber;
      }
    }
    return `SA-REG-${year}-${Date.now().toString().slice(-6)}`;
  }

  /**
   * Generates an immutable, unique Application ID: SWY-APP-YYYY-XXXXXX
   */
  async generateApplicationId(year = new Date().getFullYear()): Promise<string> {
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const appId = `SWY-APP-${year}-${randomNum}`;

      const existing = await this.prisma.application.findFirst({
        where: { applicationId: appId },
        select: { id: true },
      });

      if (!existing) {
        return appId;
      }
    }
    return `SWY-APP-${year}-${Date.now().toString().slice(-6)}`;
  }
}

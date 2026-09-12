import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true;
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Attach state restrictions to request if present
    const stateRestrictions = await this.prisma.stateRestriction.findMany({
      where: {
        role: {
          userRoles: {
            some: { userId: user.id },
          },
          isActive: true,
          stateRestricted: true,
        },
        enabled: true,
      },
    });

    if (stateRestrictions.length > 0) {
      request.userStateRestrictions = stateRestrictions.map((sr) => sr.state);
    }

    return true;
  }
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  async validate(payload: {
    id: string;
    email: string;
    role: string;
    sessionVersion?: number;
    companyEmail?: string;
    positionId?: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      return null;
    }

    // 1. Account Status and Activation Gates
    if (!user.isActive) {
      return null;
    }

    if (
      user.status === 'RESIGNED' ||
      user.status === 'DISABLED' ||
      user.status === 'LOCKED'
    ) {
      return null;
    }

    // 2. Session Version Invalidation Gate
    // If admin reset password, resigned, or revoked sessions, token sessionVersion will be outdated
    if (
      payload.sessionVersion !== undefined &&
      payload.sessionVersion !== (user.sessionVersion || 1)
    ) {
      return null;
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      personalEmail: user.personalEmail,
      mobile: user.mobile,
      role: user.role,
      isApproved: user.isApproved,
      status: user.status,
      sessionVersion: user.sessionVersion,
      mustChangePassword: user.mustChangePassword,
      companyEmail: payload.companyEmail,
      positionId: payload.positionId,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { User, Student, Driver, RefreshToken } from '@prisma/client';
import { UserRole, Prisma } from '@prisma/client';

export type UserWithProfile = User & {
  student: Student | null;
  driver: Driver | null;
};

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        student: true,
        driver: true,
      },
    });
  }

  async findUserById(id: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        student: true,
        driver: true,
      },
    });
  }

  async createStudentUser(params: {
    email: string;
    passwordHash: string;
    name: string;
    usn: string;
    phone?: string;
  }): Promise<UserWithProfile> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email: params.email.toLowerCase().trim(),
          passwordHash: params.passwordHash,
          role: UserRole.STUDENT,
          student: {
            create: {
              name: params.name.trim(),
              usn: params.usn.toUpperCase().trim(),
              phone: params.phone?.trim(),
            },
          },
        },
        include: {
          student: true,
          driver: true,
        },
      });

      return user;
    });
  }

  async createDriverUser(params: {
    email: string;
    passwordHash: string;
    name: string;
    licenseNumber: string;
    phone: string;
  }): Promise<UserWithProfile> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email: params.email.toLowerCase().trim(),
          passwordHash: params.passwordHash,
          role: UserRole.DRIVER,
          driver: {
            create: {
              name: params.name.trim(),
              licenseNumber: params.licenseNumber.toUpperCase().trim(),
              phone: params.phone.trim(),
            },
          },
        },
        include: {
          student: true,
          driver: true,
        },
      });

      return user;
    });
  }

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findValidRefreshToken(
    tokenHash: string,
  ): Promise<(RefreshToken & { user: UserWithProfile }) | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            student: true,
            driver: true,
          },
        },
      },
    });

    if (!token) {
      return null;
    }

    // Must not be revoked and must not be expired
    if (token.revokedAt !== null || token.expiresAt < new Date()) {
      return null;
    }

    return token;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}

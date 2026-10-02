import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ForbiddenException, UnauthorizedException } from '../errors/app.exception';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockContext = (user?: { role: UserRole; id: string }): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  it('should allow access if no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.DRIVER]);
    const context = createMockContext({ role: UserRole.ADMIN, id: 'admin-1' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user does not have the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext({ role: UserRole.STUDENT, id: 'student-1' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException if user is not attached to request', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '../errors/app.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      const message =
        info instanceof Error
          ? info.message
          : 'Authentication token is missing, invalid, or expired.';
      throw new UnauthorizedException(message);
    }
    return user;
  }
}

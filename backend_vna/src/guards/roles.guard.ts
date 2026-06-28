import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!requiredRoles.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = request.user?.roles ?? [];

    const hasRole = requiredRoles.some((role) => {
      if (
        role === 'USER' &&
        request.user?.accountType === 'DEPARTMENT'
      ) {
        return false;
      }

      return userRoles.includes(role);
    });

    if (!hasRole) {
      const requiredPermissions =
        this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) ?? [];

      if (
        requiredPermissions.length > 0 &&
        requiredRoles.includes('ADMIN') &&
        request.user?.accountType === 'DEPARTMENT'
      ) {
        return true;
      }

      throw new ForbiddenException('Bạn không có quyền thực hiện chức năng này');
    }

    return true;
  }
}

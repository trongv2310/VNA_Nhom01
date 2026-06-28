import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PermissionAccessService } from '../services/permission-access.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionAccessService: PermissionAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!requiredPermissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userRoles: string[] = user?.roles ?? [];
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (userRoles.includes('ADMIN')) {
      return true;
    }

    if (user?.accountType === 'BUSINESS' && requiredRoles.includes('USER')) {
      return true;
    }

    if (!user?.id) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện chức năng này',
      );
    }

    const permissionCodes =
      await this.permissionAccessService.getPermissionCodesForUser(user.id);
    request.user.permissions = permissionCodes;

    const hasPermission = requiredPermissions.some((permission) =>
      permissionCodes.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện chức năng này',
      );
    }

    return true;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';

@Injectable()
export class PermissionAccessService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getPermissionCodesForUser(userId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
      relations: {
        userRoles: {
          role: {
            rolePermissions: {
              permission: true,
            },
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    const permissionCodes = new Set<string>();

    for (const userRole of user.userRoles ?? []) {
      for (const rolePermission of userRole.role?.rolePermissions ?? []) {
        const code = rolePermission.permission?.code;
        if (code) {
          permissionCodes.add(code);
        }
      }
    }

    return [...permissionCodes].sort();
  }
}

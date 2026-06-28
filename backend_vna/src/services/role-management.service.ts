import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import {
  BulkDeleteRolesDto,
  CreateRoleDto,
  ListRolesQueryDto,
  UpdateRoleDto,
} from '../dtos/role-management.dto';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Role, RoleScope } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';

@Injectable()
export class RoleManagementService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,

    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,

    private readonly dataSource: DataSource,
  ) {}

  async getPermissions() {
    const permissions = await this.permissionRepository.find({
      relations: {
        parent: true,
      },
      order: {
        sortOrder: 'ASC',
        id: 'ASC',
      },
    });

    return {
      message: 'Lấy danh sách quyền thành công',
      data: {
        items: permissions.map((permission) =>
          this.mapPermission(permission),
        ),
      },
    };
  }

  async getRoles(query: ListRolesQueryDto) {
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .leftJoinAndSelect('role.userRoles', 'userRole')
      .distinct(true);

    if (query.code?.trim()) {
      queryBuilder.andWhere('LOWER(role.code) LIKE :code', {
        code: `%${query.code.trim().toLowerCase()}%`,
      });
    }

    if (query.name?.trim()) {
      queryBuilder.andWhere('LOWER(role.name) LIKE :name', {
        name: `%${query.name.trim().toLowerCase()}%`,
      });
    }

    const [roles, totalItems] = await queryBuilder
      .orderBy('role.isSystem', 'DESC')
      .addOrderBy('role.createdAt', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Lấy danh sách vai trò thành công',
      data: {
        items: roles.map((role) => this.mapRole(role)),
        meta: {
          page,
          limit,
          totalItems,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      },
    };
  }

  async getAssignableRoles() {
    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.code != :adminCode', { adminCode: 'ADMIN' })
      .andWhere('role.scope IN (:...scopes)', {
        scopes: [RoleScope.DEPARTMENT, RoleScope.LEGACY],
      })
      .orderBy('role.isSystem', 'DESC')
      .addOrderBy('role.name', 'ASC')
      .getMany();

    return {
      message: 'Lấy danh sách vai trò có thể gán thành công',
      data: {
        items: roles.map((role) => ({
          id: role.id,
          code: role.code,
          name: role.name,
          isSystem: role.isSystem,
          scope: role.scope,
        })),
      },
    };
  }

  async getRoleDetail(id: number) {
    const role = await this.findRoleWithPermissions(id);

    return {
      message: 'Lấy chi tiết vai trò thành công',
      data: this.mapRole(role),
    };
  }

  async createRole(body: CreateRoleDto) {
    const code = this.normalizeRoleCode(body.code);
    const name = body.name.trim();

    await this.assertUniqueRoleCode(code);
    const permissions = await this.getValidPermissions(body.permissionIds);

    const roleId = await this.dataSource.transaction(async (manager) => {
      const role = await manager.save(
        Role,
        manager.create(Role, {
          code,
          name,
          isSystem: false,
          scope: RoleScope.DEPARTMENT,
        }),
      );

      await manager.save(
        RolePermission,
        permissions.map((permission) =>
          manager.create(RolePermission, {
            role,
            permission,
          }),
        ),
      );

      return role.id;
    });

    const role = await this.findRoleWithPermissions(roleId);

    return {
      message: 'Thêm mới vai trò thành công',
      data: this.mapRole(role),
    };
  }

  async updateRole(id: number, body: UpdateRoleDto) {
    const role = await this.findRole(id);
    this.assertCustomRole(role);

    const name = body.name.trim();
    const permissions = await this.getValidPermissions(body.permissionIds);

    await this.dataSource.transaction(async (manager) => {
      role.name = name;
      await manager.save(Role, role);

      await manager.delete(RolePermission, {
        role: {
          id: role.id,
        },
      });

      await manager.save(
        RolePermission,
        permissions.map((permission) =>
          manager.create(RolePermission, {
            role,
            permission,
          }),
        ),
      );
    });

    const updatedRole = await this.findRoleWithPermissions(id);

    return {
      message: 'Cập nhật vai trò thành công',
      data: this.mapRole(updatedRole),
    };
  }

  async deleteRole(id: number) {
    const role = await this.findRole(id);
    await this.assertRoleCanBeDeleted(role);
    await this.roleRepository.remove(role);

    return {
      message: 'Xóa vai trò thành công',
      data: null,
    };
  }

  async bulkDeleteRoles(body: BulkDeleteRolesDto) {
    const roles = await this.roleRepository.findBy({
      id: In(body.ids),
    });

    if (roles.length !== body.ids.length) {
      throw new NotFoundException('Có vai trò không tồn tại');
    }

    for (const role of roles) {
      await this.assertRoleCanBeDeleted(role);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.remove(Role, roles);
    });

    return {
      message: `Đã xóa ${roles.length} vai trò`,
      data: null,
    };
  }

  private async findRole(id: number) {
    const role = await this.roleRepository.findOne({
      where: {
        id,
      },
    });

    if (!role) {
      throw new NotFoundException('Không tìm thấy vai trò');
    }

    return role;
  }

  private async findRoleWithPermissions(id: number) {
    const role = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .leftJoinAndSelect('role.userRoles', 'userRole')
      .where('role.id = :id', { id })
      .orderBy('permission.sortOrder', 'ASC')
      .getOne();

    if (!role) {
      throw new NotFoundException('Không tìm thấy vai trò');
    }

    return role;
  }

  private async assertUniqueRoleCode(code: string) {
    const existedRole = await this.roleRepository.findOne({
      where: {
        code,
      },
    });

    if (existedRole) {
      throw new BadRequestException('Mã vai trò đã tồn tại');
    }
  }

  private async getValidPermissions(permissionIds: number[]) {
    const uniqueIds = [...new Set(permissionIds)];
    const permissions = await this.permissionRepository.findBy({
      id: In(uniqueIds),
    });

    if (permissions.length !== uniqueIds.length) {
      throw new BadRequestException('Danh sách quyền không hợp lệ');
    }

    return permissions;
  }

  private assertCustomRole(role: Role) {
    if (role.isSystem) {
      throw new BadRequestException('Không thể chỉnh sửa vai trò hệ thống');
    }
  }

  private async assertRoleCanBeDeleted(role: Role) {
    this.assertCustomRole(role);

    const assignedUsers = await this.userRoleRepository.count({
      where: {
        role: {
          id: role.id,
        },
      },
    });

    if (assignedUsers > 0) {
      throw new BadRequestException(
        'Không thể xóa vai trò đang được gán cho người dùng',
      );
    }
  }

  private normalizeRoleCode(value: string) {
    return value.trim().toUpperCase();
  }

  private toPositiveNumber(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private mapPermission(permission: Permission) {
    return {
      id: permission.id,
      code: permission.code,
      name: permission.name,
      type: permission.type,
      parentId: permission.parent?.id ?? null,
      sortOrder: permission.sortOrder,
    };
  }

  private mapRole(role: Role) {
    const assignedUserCount = role.userRoles?.length ?? 0;
    const permissions = (role.rolePermissions ?? [])
      .map((rolePermission) => rolePermission.permission)
      .filter(Boolean)
      .sort((left, right) => left.sortOrder - right.sortOrder);

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      isSystem: role.isSystem,
      scope: role.scope,
      permissionIds: permissions.map((permission) => permission.id),
      permissionCount: permissions.length,
      assignedUserCount,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}

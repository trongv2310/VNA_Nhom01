import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Permissions } from '../decorators/permissions.decorator';
import { Roles } from '../decorators/roles.decorator';
import {
  BulkDeleteRolesDto,
  CreateRoleDto,
  ListRolesQueryDto,
  UpdateRoleDto,
} from '../dtos/role-management.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesGuard } from '../guards/roles.guard';
import { RoleManagementService } from '../services/role-management.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN')
@ApiTags('Permissions')
@ApiBearerAuth('access-token')
export class PermissionController {
  constructor(
    private readonly roleManagementService: RoleManagementService,
  ) {}

  @Get()
  @Permissions(
    'SYSTEM_C_PERMISSION_VIEW',
    'SYSTEM_C_ROLE_CREATE',
    'SYSTEM_C_ROLE_UPDATE',
  )
  @ApiOperation({ summary: 'Danh sách quyền hệ thống dạng cây' })
  getPermissions() {
    return this.roleManagementService.getPermissions();
  }
}

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN')
@ApiTags('Roles')
@ApiBearerAuth('access-token')
export class RoleManagementController {
  constructor(
    private readonly roleManagementService: RoleManagementService,
  ) {}

  @Get()
  @Permissions('SYSTEM_C_ROLE_VIEW')
  @ApiOperation({ summary: 'Danh sách vai trò' })
  getRoles(@Query() query: ListRolesQueryDto) {
    return this.roleManagementService.getRoles(query);
  }

  @Get('assignable')
  @Permissions('SYSTEM_C_USER_CREATE', 'SYSTEM_C_USER_UPDATE')
  @ApiOperation({ summary: 'Danh sách vai trò có thể gán cho người dùng sở' })
  getAssignableRoles() {
    return this.roleManagementService.getAssignableRoles();
  }

  @Get(':id')
  @Permissions('SYSTEM_C_ROLE_VIEW')
  @ApiOperation({ summary: 'Chi tiết vai trò' })
  getRoleDetail(@Param('id', ParseIntPipe) id: number) {
    return this.roleManagementService.getRoleDetail(id);
  }

  @Post()
  @Permissions('SYSTEM_C_ROLE_CREATE')
  @ApiOperation({ summary: 'Thêm vai trò' })
  createRole(@Body() body: CreateRoleDto) {
    return this.roleManagementService.createRole(body);
  }

  @Patch(':id')
  @Permissions('SYSTEM_C_ROLE_UPDATE')
  @ApiOperation({ summary: 'Cập nhật vai trò' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoleDto,
  ) {
    return this.roleManagementService.updateRole(id, body);
  }

  @Post('bulk-delete')
  @Permissions('SYSTEM_C_ROLE_DELETE')
  @ApiOperation({ summary: 'Xóa nhiều vai trò tùy chỉnh' })
  bulkDeleteRoles(@Body() body: BulkDeleteRolesDto) {
    return this.roleManagementService.bulkDeleteRoles(body);
  }

  @Delete(':id')
  @Permissions('SYSTEM_C_ROLE_DELETE')
  @ApiOperation({ summary: 'Xóa vai trò tùy chỉnh' })
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.roleManagementService.deleteRole(id);
  }
}

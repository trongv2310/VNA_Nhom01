import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Repository, EntityManager } from 'typeorm';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import type {} from 'multer';

import type { CurrentUserData } from '../decorators/current-user.decorator';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UserImportSummaryResponseDto, UserImportResultDetailDto } from '../dtos/user-import.dto';
import { ListUsersQueryDto } from '../dtos/list-users-query.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { Role } from '../entities/role.entity';
import { User, UserAccountType } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,

    private readonly configService: ConfigService,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getUsers(query: ListUsersQueryDto, currentUser: CurrentUserData) {
    this.assertAdminOrHasAnyPermission(currentUser, ['SYSTEM_C_USER_VIEW']);

    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .andWhere('user.accountType = :accountType', {
        accountType: UserAccountType.DEPARTMENT,
      })
      .distinct(true);

    this.excludeAdminUsers(queryBuilder);

    if (query.keyword?.trim()) {
      const keyword = this.toLikeValue(query.keyword);

      queryBuilder.andWhere(
        '(LOWER(user.fullName) LIKE :keyword OR LOWER(user.username) LIKE :keyword OR LOWER(user.email) LIKE :keyword OR LOWER(user.position) LIKE :keyword OR LOWER(role.name) LIKE :keyword OR LOWER(role.code) LIKE :keyword)',
        { keyword },
      );
    }

    if (query.fullName?.trim()) {
      queryBuilder.andWhere('LOWER(user.fullName) LIKE :fullName', {
        fullName: this.toLikeValue(query.fullName),
      });
    }

    if (query.username?.trim()) {
      queryBuilder.andWhere('LOWER(user.username) LIKE :username', {
        username: this.toLikeValue(query.username),
      });
    }

    if (query.email?.trim()) {
      queryBuilder.andWhere('LOWER(user.email) LIKE :email', {
        email: this.toLikeValue(query.email),
      });
    }

    if (query.role?.trim()) {
      queryBuilder.andWhere(
        '(LOWER(role.code) LIKE :role OR LOWER(role.name) LIKE :role)',
        {
          role: this.toLikeValue(query.role),
        },
      );
    }

    if (query.position?.trim()) {
      queryBuilder.andWhere('LOWER(user.position) LIKE :position', {
        position: this.toLikeValue(query.position),
      });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }

    const [users, totalItems] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Lấy danh sách người dùng thành công',
      data: {
        items: users.map((user) => this.mapUserListItem(user)),
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

  async getMe(userId: number) {
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
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const roles = this.mapRoles(user);
    const roleDisplay = roles.map((r) => r.name).join(', ');
    const permissions = this.mapPermissionCodes(user);

    return {
      message: 'Lấy thông tin người dùng thành công',
      data: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        gender: user.gender,
        dateOfBirth: this.formatDateInput(user.dateOfBirth),
        avatar: user.avatar,
        position: user.position,
        provinceCity: user.provinceCity,
        wardCommune: user.wardCommune,
        address: user.address,
        isActive: user.isActive,
        accountType: user.accountType,
        roles,
        roleDisplay,
        permissions,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async updateMe(
    userId: number,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
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
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    let avatarUrl = user.avatar;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        this.configService.get<string>('CLOUDINARY_FOLDER_USERS') || 'users',
      );

      avatarUrl = uploadResult.secure_url;
    }

    user.fullName =
      this.toTrimmedValue(updateUserDto.fullName) ?? user.fullName;
    user.gender = this.toOptionalString(updateUserDto.gender, user.gender);
    user.position = this.toOptionalString(
      updateUserDto.position,
      user.position,
    );
    user.provinceCity = this.toOptionalString(
      updateUserDto.provinceCity,
      user.provinceCity,
    );
    user.wardCommune = this.toOptionalString(
      updateUserDto.wardCommune,
      user.wardCommune,
    );
    user.address = this.toOptionalString(updateUserDto.address, user.address);
    user.avatar = avatarUrl;

    if (updateUserDto.dateOfBirth !== undefined) {
      const dateOfBirth = this.toTrimmedValue(updateUserDto.dateOfBirth);
      user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : user.dateOfBirth;
    }

    if (updateUserDto.isActive !== undefined) {
      const activeVal = String(updateUserDto.isActive);
      user.isActive = activeVal === 'true' || activeVal === '1' || (updateUserDto.isActive as any) === true;
      try {
        await this.userRepository.manager.createQueryBuilder()
          .update('businesses')
          .set({ is_active: user.isActive })
          .where('account_user_id = :userId', { userId })
          .execute();
      } catch {
        // Ignored if table or column mapping differs
      }
    }

    user.updatedAt = new Date();
    await this.userRepository.save(user);
    const savedUser = await this.findSelfUserWithPermissions(userId);

    return {
      message: 'Cập nhật thông tin thành công',
      data: this.mapUserDetail(savedUser),
    };
  }

  async removeMyAvatar(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
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
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    user.avatar = null;
    await this.userRepository.save(user);
    const savedUser = await this.findSelfUserWithPermissions(userId);

    return {
      message: 'Xóa ảnh đại diện thành công',
      data: this.mapUserDetail(savedUser),
    };
  }

  async getUserDetail(id: number, currentUser: CurrentUserData) {
    this.assertAdminOrHasAnyPermission(currentUser, ['SYSTEM_C_USER_VIEW']);
    const user = await this.findManageableUser(id);

    return {
      message: 'Lấy chi tiết người dùng thành công',
      data: this.mapUserDetail(user),
    };
  }

  async createUser(
    createUserDto: CreateUserDto,
    currentUser: CurrentUserData,
    file?: Express.Multer.File,
  ) {
    this.assertAdminOrHasAnyPermission(currentUser, ['SYSTEM_C_USER_CREATE']);

    const username = this.toRequiredString(createUserDto.username);
    const email = this.toRequiredString(createUserDto.email);

    await this.validateUniqueUsername(0, username, '');
    await this.validateUniqueEmail(0, email, '');

    const requestedRole =
      (await this.getRequestedRole(createUserDto)) ??
      (await this.getDefaultUserRole());

    let avatarUrl: string | null = null;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        this.configService.get<string>('CLOUDINARY_FOLDER_USERS') || 'users',
      );

      avatarUrl = uploadResult.secure_url;
    }

    const user = this.userRepository.create({
      username,
      password: await bcrypt.hash(this.toRequiredString(createUserDto.password), 10),
      fullName: this.toRequiredString(createUserDto.fullName),
      email,
      gender: this.toOptionalString(createUserDto.gender, null),
      dateOfBirth: createUserDto.dateOfBirth
        ? new Date(createUserDto.dateOfBirth)
        : null,
      avatar: avatarUrl,
      position: this.toOptionalString(createUserDto.position, null),
      provinceCity: this.toOptionalString(createUserDto.provinceCity, null),
      wardCommune: this.toOptionalString(createUserDto.wardCommune, null),
      address: this.toOptionalString(createUserDto.address, null),
      accountType: UserAccountType.DEPARTMENT,
      isActive:
        createUserDto.isActive === undefined
          ? true
          : createUserDto.isActive === 'true',
    });

    const savedUser = await this.userRepository.save(user);

    await this.userRoleRepository.save(
      this.userRoleRepository.create({
        user: savedUser,
        role: requestedRole,
      }),
    );

    const createdUser = await this.findManageableUser(savedUser.id);

    return {
      message: 'Tạo người dùng thành công',
      data: this.mapUserDetail(createdUser),
    };
  }

  async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser: CurrentUserData,
    file?: Express.Multer.File,
  ) {
    this.assertCanUpdateManagedUser(updateUserDto, currentUser);

    const user = await this.findManageableUser(id);

    await this.validateUniqueUsername(id, updateUserDto.username, user.username);
    await this.validateUniqueEmail(id, updateUserDto.email, user.email);

    const requestedRole = await this.getRequestedRole(updateUserDto);

    let avatarUrl = user.avatar;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        this.configService.get<string>('CLOUDINARY_FOLDER_USERS') || 'users',
      );

      avatarUrl = uploadResult.secure_url;
    } else if (updateUserDto.removeAvatar === 'true') {
      avatarUrl = null;
    } else if (updateUserDto.avatar !== undefined) {
      avatarUrl = this.toOptionalString(updateUserDto.avatar, user.avatar);
    }

    user.username = this.toTrimmedValue(updateUserDto.username) ?? user.username;
    user.fullName = this.toTrimmedValue(updateUserDto.fullName) ?? user.fullName;
    user.email = this.toTrimmedValue(updateUserDto.email) ?? user.email;
    user.gender = this.toOptionalString(updateUserDto.gender, user.gender);
    user.position = this.toOptionalString(updateUserDto.position, user.position);
    user.provinceCity = this.toOptionalString(
      updateUserDto.provinceCity,
      user.provinceCity,
    );
    user.wardCommune = this.toOptionalString(
      updateUserDto.wardCommune,
      user.wardCommune,
    );
    user.address = this.toOptionalString(updateUserDto.address, user.address);
    user.avatar = avatarUrl;

    if (updateUserDto.password?.trim()) {
      user.password = await bcrypt.hash(updateUserDto.password.trim(), 10);
    }

    if (updateUserDto.dateOfBirth !== undefined) {
      const dateOfBirth = this.toTrimmedValue(updateUserDto.dateOfBirth);
      user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : user.dateOfBirth;
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive === 'true';
    }

    user.updatedAt = new Date();
    const savedUser = await this.userRepository.save(user);

    if (requestedRole) {
      await this.userRoleRepository
        .createQueryBuilder()
        .delete()
        .from(UserRole)
        .where('user_id = :userId', { userId: savedUser.id })
        .execute();

      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          user: savedUser,
          role: requestedRole,
        }),
      );
    }

    const updatedUser = await this.findManageableUser(id);

    return {
      message: 'Cập nhật người dùng thành công',
      data: this.mapUserDetail(updatedUser),
    };
  }

  async deleteUser(id: number, currentUser: CurrentUserData) {
    this.assertAdminOrHasAnyPermission(currentUser, ['SYSTEM_C_USER_DELETE']);

    const user = await this.findManageableUser(id);

    await this.userRepository.remove(user);

    return {
      message: 'Xóa người dùng thành công',
      data: {
        id,
      },
    };
  }

  private async validateUniqueUsername(
    id: number,
    username: string | undefined,
    currentUsername: string,
  ) {
    const nextUsername = this.toTrimmedValue(username);

    if (!nextUsername || nextUsername === currentUsername) {
      return;
    }

    const existedUsername = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username', { username: nextUsername })
      .andWhere('user.id != :id', { id })
      .getOne();

    if (existedUsername) {
      throw new BadRequestException('Tên đăng nhập đã tồn tại');
    }
  }

  private async validateUniqueEmail(
    id: number,
    email: string | undefined,
    currentEmail: string,
  ) {
    const nextEmail = this.toTrimmedValue(email);

    if (!nextEmail || nextEmail === currentEmail) {
      return;
    }

    const existedEmail = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: nextEmail })
      .andWhere('user.id != :id', { id })
      .getOne();

    if (existedEmail) {
      throw new BadRequestException('Email đã tồn tại');
    }
  }

  private async findManageableUser(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    if (
      !user ||
      this.isAdminUser(user)
    ) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  private async findSelfUserWithPermissions(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
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
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  private assertCanUpdateManagedUser(
    updateUserDto: UpdateUserDto,
    currentUser: CurrentUserData,
  ) {
    if (currentUser.roles.includes('ADMIN')) {
      return;
    }

    const isPasswordUpdate = Boolean(updateUserDto.password?.trim());
    const isRoleUpdate = Boolean(
      this.toTrimmedValue(updateUserDto.roleId) ||
        this.toTrimmedValue(updateUserDto.roleCode) ||
        this.toTrimmedValue(updateUserDto.role),
    );
    const profileFields = [
      updateUserDto.username,
      updateUserDto.fullName,
      updateUserDto.email,
      updateUserDto.gender,
      updateUserDto.dateOfBirth,
      updateUserDto.position,
      updateUserDto.provinceCity,
      updateUserDto.wardCommune,
      updateUserDto.address,
      updateUserDto.avatar,
      updateUserDto.removeAvatar,
      updateUserDto.isActive,
    ];
    const hasProfileUpdate =
      isRoleUpdate || profileFields.some((value) => value !== undefined);

    if (isPasswordUpdate) {
      this.assertAdminOrHasAnyPermission(currentUser, ['SYSTEM_C_USER_RESET_PASSWORD']);
    }

    if (hasProfileUpdate) {
      this.assertAdminOrHasAnyPermission(currentUser, ['SYSTEM_C_USER_UPDATE']);
    }
  }

  private assertAdminOrHasAnyPermission(
    currentUser: CurrentUserData,
    permissions: string[],
  ) {
    if (currentUser.roles.includes('ADMIN')) {
      return;
    }

    const userPermissions = currentUser.permissions ?? [];
    const hasPermission = permissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện chức năng này',
      );
    }
  }

  private async getRequestedRole(updateUserDto: UpdateUserDto) {
    const roleId = this.toTrimmedValue(updateUserDto.roleId);
    const roleCode = this.toTrimmedValue(updateUserDto.roleCode);
    const role = this.toTrimmedValue(updateUserDto.role);

    if (!roleId && !roleCode && !role) {
      return null;
    }

    const queryBuilder = this.roleRepository.createQueryBuilder('role');

    if (roleId) {
      const parsedRoleId = Number(roleId);

      if (!Number.isInteger(parsedRoleId) || parsedRoleId < 1) {
        throw new BadRequestException('Vai trò không hợp lệ');
      }

      queryBuilder.where('role.id = :roleId', { roleId: parsedRoleId });
    } else {
      queryBuilder.where(
        'LOWER(role.code) = :roleValue OR LOWER(role.name) = :roleValue',
        {
          roleValue: (roleCode ?? role ?? '').toLowerCase(),
        },
      );
    }

    const requestedRole = await queryBuilder.getOne();

    if (!requestedRole) {
      throw new BadRequestException('Vai trò không hợp lệ');
    }

    if (requestedRole.code === 'ADMIN') {
      throw new BadRequestException(
        'Không thể gán vai trò quản trị viên tại màn quản lý người dùng',
      );
    }

    return requestedRole;
  }

  private async getDefaultUserRole() {
    const userRole = await this.roleRepository.findOne({
      where: {
        code: 'USER',
      },
    });

    if (!userRole) {
      throw new BadRequestException('Chưa cấu hình vai trò USER');
    }

    return userRole;
  }

  private excludeAdminUsers(queryBuilder: ReturnType<Repository<User>['createQueryBuilder']>) {
    queryBuilder.andWhere(
      `NOT EXISTS (
        SELECT 1
        FROM user_roles admin_user_role
        INNER JOIN roles admin_role ON admin_role.id = admin_user_role.role_id
        WHERE admin_user_role.user_id = "user"."id"
        AND admin_role.code = :excludedRole
      )`,
      { excludedRole: 'ADMIN' },
    );
  }

  private toPositiveNumber(value: string | undefined, defaultValue: number) {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 1) {
      return defaultValue;
    }

    return numberValue;
  }

  private toLikeValue(value: string) {
    return `%${value.trim().toLowerCase()}%`;
  }

  private toTrimmedValue(value: string | undefined) {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : undefined;
  }

  private toRequiredString(value: string | undefined) {
    const trimmedValue = value?.trim();

    if (!trimmedValue) {
      throw new BadRequestException('Dữ liệu bắt buộc không được để trống');
    }

    return trimmedValue;
  }

  private toOptionalString(
    value: string | undefined,
    currentValue: string | null,
  ) {
    if (value === undefined) {
      return currentValue;
    }

    return value.trim();
  }

  private isAdminUser(user: User) {
    return user.userRoles?.some((userRole) => userRole.role.code === 'ADMIN');
  }

  private formatDateInput(value: Date | string | null | undefined) {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.toISOString().slice(0, 10);
  }

  private mapUserListItem(user: User) {
    const roles = this.mapRoles(user);
    const roleNames = roles.map((role) => role.name);
    const roleCodes = roles.map((role) => role.code);

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      position: user.position,
      accountType: user.accountType,
      isActive: user.isActive,
      statusLabel: user.isActive ? 'Đang hoạt động' : 'Đã khóa',
      roles,
      roleCodes,
      roleNames,
      roleDisplay: roleNames.join(', '),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapUserDetail(user: User) {
    const roles = this.mapRoles(user);
    const primaryRole = roles[0] ?? null;

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      gender: user.gender,
      dateOfBirth: this.formatDateInput(user.dateOfBirth),
      avatar: user.avatar,
      position: user.position,
      provinceCity: user.provinceCity,
      wardCommune: user.wardCommune,
      address: user.address,
      accountType: user.accountType,
      isActive: user.isActive,
      statusLabel: user.isActive ? 'Đang hoạt động' : 'Đã khóa',
      hasPassword: Boolean(user.password),
      roleId: primaryRole?.id ?? null,
      roleCode: primaryRole?.code ?? null,
      roleName: primaryRole?.name ?? null,
      roleDisplay: roles.map((role) => role.name).join(', '),
      roles,
      permissions: this.mapPermissionCodes(user),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapRoles(user: User) {
    return (
      user.userRoles?.map((userRole) => ({
        id: userRole.role.id,
        code: userRole.role.code,
        name: userRole.role.name,
      })) ?? []
    );
  }

  private mapPermissionCodes(user: User) {
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

  async checkEmailExists(email: string, excludeUserId?: number): Promise<boolean> {
    if (!email || !email.trim()) {
      return false;
    }
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: email.trim().toLowerCase() });

    if (excludeUserId) {
      queryBuilder.andWhere('user.id != :userId', { userId: excludeUserId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async importFromExcel(
    file: Express.Multer.File,
    currentUser: CurrentUserData,
  ): Promise<UserImportSummaryResponseDto> {
    this.assertAdminOrHasAnyPermission(currentUser, ['SYSTEM_C_USER_CREATE']);

    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng cung cấp file Excel hợp lệ');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Không thể đọc file Excel. File có thể bị hỏng.');
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new BadRequestException('File Excel không có sheet nào');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

    if (rawData.length <= 1) {
      return {
        total: 0,
        successCount: 0,
        failCount: 0,
        details: [],
      };
    }

    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1);

    const getColumnIndex = (name: string) => {
      return headers.findIndex((h) => h && h.trim().toLowerCase().startsWith(name.trim().toLowerCase()));
    };

    const usernameIdx = getColumnIndex('Tên đăng nhập');
    const fullNameIdx = getColumnIndex('Họ và tên');
    const roleIdx = getColumnIndex('Vai trò');
    const emailIdx = getColumnIndex('Email');
    const genderIdx = getColumnIndex('Giới tính');
    const dobIdx = getColumnIndex('Ngày sinh');
    const positionIdx = getColumnIndex('Chức vụ');
    const provinceIdx = getColumnIndex('Tỉnh/Thành phố');
    const wardIdx = getColumnIndex('Phường/Xã');
    const addressIdx = getColumnIndex('Địa chỉ');
    const statusIdx = getColumnIndex('Trạng thái');

    const roles = await this.roleRepository.find();
    const rolesMap = new Map<string, Role>();
    for (const role of roles) {
      rolesMap.set(role.code.toLowerCase().trim(), role);
      rolesMap.set(role.name.toLowerCase().trim(), role);
    }

    const details: UserImportResultDetailDto[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[];
      const rowNumber = i + 2;

      if (!row || row.every((val) => val === undefined || val === null || val === '')) {
        continue;
      }

      const getValue = (idx: number) => {
        if (idx === -1 || idx >= row.length) return undefined;
        const val = row[idx];
        if (val === undefined || val === null) return undefined;
        return String(val).trim();
      };

      const username = getValue(usernameIdx);
      const fullName = getValue(fullNameIdx);
      const roleVal = getValue(roleIdx);
      const email = getValue(emailIdx);
      const gender = getValue(genderIdx);
      const dobVal = getValue(dobIdx);
      const position = getValue(positionIdx);
      const provinceCity = getValue(provinceIdx);
      const wardCommune = getValue(wardIdx);
      const address = getValue(addressIdx);
      const statusVal = getValue(statusIdx);

      const rowErrors: string[] = [];

      if (!username) rowErrors.push('Tên đăng nhập không được để trống');
      if (!fullName) rowErrors.push('Họ và tên không được để trống');
      if (!roleVal) rowErrors.push('Vai trò không được để trống');
      if (!email) rowErrors.push('Email không được để trống');

      let dateOfBirth: string | undefined = undefined;
      if (dobVal) {
        try {
          if (/^\d{5}$/.test(dobVal)) {
            const dateObj = XLSX.SSF.parse_date_code(Number(dobVal));
            const y = dateObj.y;
            const m = String(dateObj.m).padStart(2, '0');
            const d = String(dateObj.d).padStart(2, '0');
            dateOfBirth = `${y}-${m}-${d}`;
          } else {
            let parts: string[] = [];
            if (dobVal.includes('-')) {
              parts = dobVal.split('-');
            } else if (dobVal.includes('/')) {
              parts = dobVal.split('/');
            }
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                dateOfBirth = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              } else if (parts[2].length === 4) {
                dateOfBirth = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }
          }
          if (dateOfBirth && isNaN(Date.parse(dateOfBirth))) {
            rowErrors.push('Ngày sinh không đúng định dạng YYYY-MM-DD');
          }
        } catch {
          rowErrors.push('Ngày sinh không đúng định dạng YYYY-MM-DD');
        }
      }

      if (username) {
        const usernameExisted = await this.userRepository.findOne({
          where: { username },
        });
        if (usernameExisted) {
          rowErrors.push('Tên đăng nhập đã tồn tại trong hệ thống');
        }
      }

      if (email) {
        const emailExisted = await this.userRepository.findOne({
          where: { email },
        });
        if (emailExisted) {
          rowErrors.push('Email đã tồn tại trong hệ thống');
        }
      }

      let roleObj: Role | undefined = undefined;
      if (roleVal) {
        roleObj = rolesMap.get(roleVal.toLowerCase());
        if (!roleObj) {
          rowErrors.push(`Vai trò "${roleVal}" không hợp lệ hoặc không tồn tại`);
        }
      }

      let isActive = 'true';
      if (statusVal) {
        const lowerStatus = statusVal.toLowerCase();
        if (lowerStatus === 'khóa' || lowerStatus === 'khoa' || lowerStatus === 'false' || lowerStatus === 'inactive') {
          isActive = 'false';
        }
      }

      const createUserDtoData = {
        username: username || '',
        password: '123456',
        fullName: fullName || '',
        email: email || '',
        gender,
        dateOfBirth,
        position,
        provinceCity,
        wardCommune,
        address,
        isActive,
        roleCode: roleObj?.code,
        roleId: roleObj ? String(roleObj.id) : undefined,
      };

      const createUserDto = plainToInstance(CreateUserDto, createUserDtoData);
      const validationErrors = await validate(createUserDto);
      if (validationErrors.length > 0) {
        const validationMsgs = this.formatValidationErrors(validationErrors);
        rowErrors.push(...validationMsgs);
      }

      if (rowErrors.length > 0) {
        failCount++;
        details.push({
          rowNumber,
          username: username || '',
          fullName: fullName || '',
          errors: Array.from(new Set(rowErrors)),
        });
      } else {
        try {
          await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
            const userEntity = transactionalEntityManager.create(User, {
              username,
              password: await bcrypt.hash('123456', 10),
              fullName,
              email,
              gender: gender || null,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              position: position || null,
              provinceCity: provinceCity || null,
              wardCommune: wardCommune || null,
              address: address || null,
              accountType: UserAccountType.DEPARTMENT,
              isActive: isActive === 'true',
            });

            const savedUser = await transactionalEntityManager.save(userEntity);

            await transactionalEntityManager.save(UserRole, {
              user: savedUser,
              role: roleObj!,
            });
          });
          successCount++;
        } catch (err) {
          failCount++;
          details.push({
            rowNumber,
            username: username || '',
            fullName: fullName || '',
            errors: [err instanceof Error ? err.message : 'Lỗi hệ thống khi lưu người dùng'],
          });
        }
      }
    }

    return {
      total: dataRows.length,
      successCount,
      failCount,
      details,
    };
  }

  async generateImportTemplate(): Promise<Buffer> {
    const headers = [
      'Tên đăng nhập *',
      'Họ và tên *',
      'Vai trò *',
      'Email *',
      'Giới tính',
      'Ngày sinh (YYYY-MM-DD)',
      'Chức vụ',
      'Tỉnh/Thành phố',
      'Phường/Xã',
      'Địa chỉ',
      'Trạng thái (Hoạt động/Khóa)',
    ];

    const sampleRow = [
      'nguyenvana',
      'Nguyễn Văn A',
      'USER',
      'nguyenvana@gmail.com',
      'Nam',
      '1995-06-01',
      'Chuyên viên',
      'Thành phố Hà Nội',
      'Phường Trúc Bạch',
      '123 Phố Trúc Bạch',
      'Hoạt động',
    ];

    const roles = await this.roleRepository.find();
    const docRows = [
      ['HƯỚNG DẪN NHẬP LIỆU FILE MẪU'],
      [''],
      ['1. Các cột có dấu * là bắt buộc phải nhập.'],
      ['2. Cột Vai trò phải điền đúng mã vai trò hoặc tên vai trò hiện có trong hệ thống.'],
      ['3. Cột Trạng thái chỉ chấp nhận giá trị: "Hoạt động" hoặc "Khóa" (mặc định là Hoạt động).'],
      ['4. Cột Ngày sinh phải nhập theo định dạng YYYY-MM-DD (ví dụ: 1995-06-01).'],
      [''],
      ['DANH SÁCH VAI TRÒ HỢP LỆ TRONG HỆ THỐNG:'],
      ['Mã vai trò', 'Tên vai trò', 'Phạm vi'],
    ];

    for (const r of roles) {
      docRows.push([r.code, r.name, r.scope]);
    }

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Nhập người dùng');

    const ws2 = XLSX.utils.aoa_to_sheet(docRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Hướng dẫn & Danh mục');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  private formatValidationErrors(errors: any[]): string[] {
    const messages: string[] = [];
    for (const error of errors) {
      if (error.constraints) {
        messages.push(...(Object.values(error.constraints) as string[]));
      }
      if (error.children?.length) {
        messages.push(...this.formatValidationErrors(error.children));
      }
    }
    return messages;
  }

  async exportUsersToExcel(
    query: ListUsersQueryDto,
    currentUser: CurrentUserData,
  ): Promise<Buffer> {
    this.assertAdminOrHasAnyPermission(currentUser, ['SYSTEM_C_USER_VIEW']);

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .andWhere('user.accountType = :accountType', {
        accountType: UserAccountType.DEPARTMENT,
      })
      .distinct(true);

    this.excludeAdminUsers(queryBuilder);

    if (query.keyword?.trim()) {
      const keyword = this.toLikeValue(query.keyword);
      queryBuilder.andWhere(
        '(LOWER(user.fullName) LIKE :keyword OR LOWER(user.username) LIKE :keyword OR LOWER(user.email) LIKE :keyword OR LOWER(user.position) LIKE :keyword OR LOWER(role.name) LIKE :keyword OR LOWER(role.code) LIKE :keyword)',
        { keyword },
      );
    }

    if (query.fullName?.trim()) {
      queryBuilder.andWhere('LOWER(user.fullName) LIKE :fullName', {
        fullName: this.toLikeValue(query.fullName),
      });
    }

    if (query.username?.trim()) {
      queryBuilder.andWhere('LOWER(user.username) LIKE :username', {
        username: this.toLikeValue(query.username),
      });
    }

    if (query.email?.trim()) {
      queryBuilder.andWhere('LOWER(user.email) LIKE :email', {
        email: this.toLikeValue(query.email),
      });
    }

    if (query.role?.trim()) {
      queryBuilder.andWhere(
        '(LOWER(role.code) LIKE :role OR LOWER(role.name) LIKE :role)',
        {
          role: this.toLikeValue(query.role),
        },
      );
    }

    if (query.position?.trim()) {
      queryBuilder.andWhere('LOWER(user.position) LIKE :position', {
        position: this.toLikeValue(query.position),
      });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }

    const users = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .getMany();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách người dùng');

    const columns = [
      { header: 'Họ và tên', key: 'fullName' },
      { header: 'Tài khoản', key: 'username' },
      { header: 'Email', key: 'email' },
      { header: 'Vai trò', key: 'roleDisplay' },
      { header: 'Chức danh', key: 'position' },
    ];

    worksheet.columns = columns;

    for (const user of users) {
      const mapped = this.mapUserListItem(user);
      worksheet.addRow({
        fullName: mapped.fullName || '',
        username: mapped.username || '',
        email: mapped.email || '',
        roleDisplay: mapped.roleDisplay || '',
        position: mapped.position || '',
      });
    }

    // Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FF1F2937' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEBF2FE' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    // Data styling
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.height = 20;
      row.eachCell((cell) => {
        cell.font = {
          name: 'Arial',
          size: 10,
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Auto fit
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      if (column.header) {
        maxLen = Math.max(maxLen, column.header.toString().length);
      }
      column.eachCell && column.eachCell((cell, rowNumber) => {
        if (rowNumber === 1) return;
        const val = cell.value;
        if (val) {
          maxLen = Math.max(maxLen, val.toString().length);
        }
      });
      column.width = Math.min(Math.max(maxLen + 4, 15), 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

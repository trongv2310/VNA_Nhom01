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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type {} from 'multer';

import { Roles } from '../decorators/roles.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { CreateUserDto } from '../dtos/create-user.dto';
import { ListUsersQueryDto } from '../dtos/list-users-query.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesGuard } from '../guards/roles.guard';
import * as currentUserDecorator from '../decorators/current-user.decorator';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
  UserDetailResponseDto,
  UserListResponseDto,
} from '../dtos/swagger-response.dto';

@Controller('users')
@ApiTags('Users')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  UserListResponseDto,
  UserDetailResponseDto,
)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions('SYSTEM_C_USER_VIEW')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Danh sach nguoi dung',
    description: 'Chỉ ADMIN được xem. Tài khoản ADMIN không nằm trong danh sách.',
  })
  @ApiOkResponse({
    description: 'Danh sach user kem phan trang',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserListResponseDto) },
          },
        },
      ],
    },
  })
  getUsers(
    @Query() query: ListUsersQueryDto,
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
  ) {
    return this.userService.getUsers(query, currentUser);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thong tin user dang dang nhap' })
  @ApiOkResponse({
    description: 'Thong tin user dang dang nhap',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserDetailResponseDto) },
          },
        },
      ],
    },
  })
  getMe(
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
  ) {
    return this.userService.getMe(currentUser.id);
  }

  @Get('check-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Kiểm tra email đã tồn tại trên hệ thống chưa' })
  async checkEmail(
    @Query('email') email: string,
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
  ) {
    const exists = await this.userService.checkEmailExists(email, currentUser.id);
    return {
      success: true,
      message: 'Kiểm tra email thành công',
      data: { exists },
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Cập nhật hồ sơ của tài khoản đang đăng nhập',
    description:
      'Dùng multipart/form-data khi cần upload avatar. Field file phải tên là avatar.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'Nguyen Van A' },
        gender: { type: 'string', example: 'Nam' },
        dateOfBirth: { type: 'string', example: '1995-06-01' },
        position: { type: 'string', example: 'Chuyen vien' },
        provinceCity: { type: 'string', example: 'Thanh pho Ho Chi Minh' },
        wardCommune: { type: 'string', example: 'Phuong Go Vap' },
        address: { type: 'string', example: '123 Le Loi' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Thông tin tài khoản sau khi cập nhật',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserDetailResponseDto) },
          },
        },
      ],
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new Error('File upload phai la anh'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  updateMe(
    @Body() updateUserDto: UpdateUserDto,
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.updateMe(
      currentUser.id,
      updateUserDto,
      file,
    );
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa ảnh đại diện của tài khoản đang đăng nhập' })
  @ApiOkResponse({
    description: 'Thông tin tài khoản sau khi xóa ảnh đại diện',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserDetailResponseDto) },
          },
        },
      ],
    },
  })
  removeMyAvatar(
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
  ) {
    return this.userService.removeMyAvatar(currentUser.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions('SYSTEM_C_USER_VIEW')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Chi tiet nguoi dung cho man hinh quan ly' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng hoặc người dùng là ADMIN' })
  @ApiOkResponse({
    description: 'Chi tiet user de do vao form cap nhat',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserDetailResponseDto) },
          },
        },
      ],
    },
  })
  getUserDetail(
    @Param('id', ParseIntPipe) id: number,
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
  ) {
    return this.userService.getUserDetail(id, currentUser);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions('SYSTEM_C_USER_CREATE')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Thêm mới người dùng',
    description:
      'Chỉ ADMIN được tạo người dùng thường. Không cho gán role ADMIN tại màn quản lý người dùng. Dùng multipart/form-data nếu cần upload avatar.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password', 'fullName', 'email'],
      properties: {
        username: { type: 'string', example: 'user01' },
        password: { type: 'string', example: '123456' },
        fullName: { type: 'string', example: 'Nguyen Van A' },
        email: { type: 'string', example: 'user01@gmail.com' },
        gender: { type: 'string', example: 'Nam' },
        dateOfBirth: { type: 'string', example: '1995-06-01' },
        position: { type: 'string', example: 'Chuyen vien' },
        roleCode: { type: 'string', example: 'USER' },
        provinceCity: { type: 'string', example: 'Thanh pho Ho Chi Minh' },
        wardCommune: { type: 'string', example: 'Phuong Go Vap' },
        address: { type: 'string', example: '123 Le Loi' },
        isActive: { type: 'string', example: 'true' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Người dùng vừa tạo',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserDetailResponseDto) },
          },
        },
      ],
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new Error('File upload phai la anh'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  createUser(
    @Body() createUserDto: CreateUserDto,
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.createUser(createUserDto, currentUser, file);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions('SYSTEM_C_USER_UPDATE', 'SYSTEM_C_USER_RESET_PASSWORD')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Cập nhật người dùng',
    description:
      'Dùng multipart/form-data nếu cần upload avatar. Field file phải tên là avatar.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'user01' },
        password: { type: 'string', example: '123456' },
        fullName: { type: 'string', example: 'Nguyen Van A' },
        email: { type: 'string', example: 'user01@gmail.com' },
        gender: { type: 'string', example: 'Nam' },
        dateOfBirth: { type: 'string', example: '1995-06-01' },
        position: { type: 'string', example: 'Chuyen vien' },
        roleCode: { type: 'string', example: 'USER' },
        provinceCity: { type: 'string', example: 'Thanh pho Ho Chi Minh' },
        wardCommune: { type: 'string', example: 'Phuong Go Vap' },
        address: { type: 'string', example: '123 Le Loi' },
        isActive: { type: 'string', example: 'true' },
        removeAvatar: { type: 'string', example: 'false' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Người dùng sau khi cập nhật',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserDetailResponseDto) },
          },
        },
      ],
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new Error('File upload phai la anh'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.updateUser(id, updateUserDto, currentUser, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions('SYSTEM_C_USER_DELETE')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Xóa người dùng',
    description:
      'Chỉ ADMIN được xóa tài khoản người dùng thường. Không cho xóa tài khoản ADMIN.',
  })
  @ApiOkResponse({
    description: 'Xóa người dùng thành công',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 2 },
              },
            },
          },
        },
      ],
    },
  })
  deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
  ) {
    return this.userService.deleteUser(id, currentUser);
  }
}

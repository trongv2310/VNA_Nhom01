import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ListRolesQueryDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: 'MANAGER' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Quản lý' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'DEPARTMENT_MANAGER' })
  @IsNotEmpty({ message: 'Mã vai trò không được để trống' })
  @IsString()
  @MaxLength(50, { message: 'Mã vai trò không được vượt quá 50 ký tự' })
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/, {
    message: 'Mã vai trò chỉ gồm chữ cái, chữ số và dấu gạch dưới',
  })
  code!: string;

  @ApiProperty({ example: 'Quản lý phòng ban' })
  @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
  @IsString()
  @MaxLength(100, { message: 'Tên vai trò không được vượt quá 100 ký tự' })
  name!: string;

  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray({ message: 'Danh sách quyền không hợp lệ' })
  @ArrayMinSize(1, { message: 'Vai trò phải có ít nhất một quyền' })
  @ArrayUnique({ message: 'Danh sách quyền không được trùng lặp' })
  @IsInt({ each: true, message: 'Mã quyền phải là số nguyên' })
  permissionIds!: number[];
}

export class UpdateRoleDto {
  @ApiProperty({ example: 'Quản lý phòng ban' })
  @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
  @IsString()
  @MaxLength(100, { message: 'Tên vai trò không được vượt quá 100 ký tự' })
  name!: string;

  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray({ message: 'Danh sách quyền không hợp lệ' })
  @ArrayMinSize(1, { message: 'Vai trò phải có ít nhất một quyền' })
  @ArrayUnique({ message: 'Danh sách quyền không được trùng lặp' })
  @IsInt({ each: true, message: 'Mã quyền phải là số nguyên' })
  permissionIds!: number[];
}

export class BulkDeleteRolesDto {
  @ApiProperty({ type: [Number], example: [3, 4] })
  @IsArray({ message: 'Danh sách vai trò không hợp lệ' })
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất một vai trò' })
  @ArrayUnique({ message: 'Danh sách vai trò không được trùng lặp' })
  @IsInt({ each: true, message: 'Mã vai trò phải là số nguyên' })
  ids!: number[];
}

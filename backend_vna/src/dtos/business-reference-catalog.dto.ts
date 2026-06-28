import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListBusinessReferenceCatalogsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: string | number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: string | number;

  @ApiPropertyOptional({ example: 'TNHH' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ example: 'BT001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Công ty TNHH' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: string | boolean;
}

export class ListBusinessIndustriesQueryDto extends ListBusinessReferenceCatalogsQueryDto {
  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  level?: string | number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  parentId?: string | number;
}

export class CreateBusinessTypeDto {
  @ApiProperty({ example: 'BT009' })
  @IsNotEmpty({ message: 'Mã loại hình không được để trống' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Mã loại hình chỉ được gồm chữ, số, dấu gạch ngang hoặc gạch dưới',
  })
  code!: string;

  @ApiProperty({ example: 'Doanh nghiệp nhà nước' })
  @IsNotEmpty({ message: 'Tên loại hình kinh doanh không được để trống' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  sortOrder?: string | number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: string | boolean;
}

export class UpdateBusinessTypeDto {
  @ApiPropertyOptional({ example: 'Doanh nghiệp nhà nước' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  sortOrder?: string | number;
}

export class CreateBusinessIndustryDto {
  @ApiProperty({ example: '1222' })
  @IsNotEmpty({ message: 'Mã ngành không được để trống' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'Mã ngành chỉ được gồm chữ và số',
  })
  code!: string;

  @ApiProperty({ example: 'Khai thác đá tổ ong' })
  @IsNotEmpty({ message: 'Tên ngành không được để trống' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    example: 12,
    description: 'Bỏ trống khi tạo ngành cấp 1',
  })
  @IsOptional()
  parentId?: string | number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  sortOrder?: string | number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: string | boolean;
}

export class UpdateBusinessIndustryDto {
  @ApiPropertyOptional({ example: 'Khai thác đá tổ ong' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  parentId?: string | number | null;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  sortOrder?: string | number;
}

export class UpdateBusinessReferenceCatalogStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean({ message: 'Trạng thái phải là true hoặc false' })
  isActive!: boolean;
}

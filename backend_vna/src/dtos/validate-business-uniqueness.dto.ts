import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

export class ValidateBusinessUniquenessDto {
  @ApiProperty({
    example: '0312345678',
    description: 'Mã số thuế cần kiểm tra',
  })
  @IsNotEmpty({ message: 'Mã số thuế không được để trống' })
  @Matches(/^\d{10}(-\d{3})?$/, {
    message: 'Mã số thuế phải gồm 10 số hoặc dạng 10 số-3 số',
  })
  taxCode!: string;

  @ApiProperty({
    example: 'business@gmail.com',
    description: 'Email tài khoản doanh nghiệp cần kiểm tra',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'ID doanh nghiệp cần loại trừ khi kiểm tra trong luồng cập nhật',
  })
  @IsOptional()
  @IsInt({ message: 'Mã doanh nghiệp không hợp lệ' })
  @Min(1, { message: 'Mã doanh nghiệp không hợp lệ' })
  businessId?: number;
}

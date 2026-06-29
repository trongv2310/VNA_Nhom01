import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyForgotPasswordOtpDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsString({ message: 'Thông tin nhập vào phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên đăng nhập hoặc email không được để trống' })
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP gom dung 6 chu so',
  })
  @Matches(/^\d{6}$/, { message: 'OTP phải gồm 6 chữ số' })
  otp!: string;
}

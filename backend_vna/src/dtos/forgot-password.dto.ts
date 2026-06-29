import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@gmail.com',
    description: 'Email hoac Ten dang nhap nhan ma OTP khoi phuc mat khau',
  })
  @IsString({ message: 'Thông tin nhập vào phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên đăng nhập hoặc email không được để trống' })
  email!: string;
}

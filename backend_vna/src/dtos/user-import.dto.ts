import { ApiProperty } from '@nestjs/swagger';

export class UserImportResultDetailDto {
  @ApiProperty({ example: 2, description: 'Số thứ tự dòng trong file Excel' })
  rowNumber!: number;

  @ApiProperty({ example: 'nguyenvana', description: 'Tên đăng nhập' })
  username!: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên' })
  fullName!: string;

  @ApiProperty({
    example: ['Tên đăng nhập đã tồn tại', 'Email không hợp lệ'],
    description: 'Danh sách các lỗi kiểm tra',
  })
  errors!: string[];
}

export class UserImportSummaryResponseDto {
  @ApiProperty({ example: 10, description: 'Tổng số dòng được xử lý' })
  total!: number;

  @ApiProperty({ example: 8, description: 'Số dòng import thành công' })
  successCount!: number;

  @ApiProperty({ example: 2, description: 'Số dòng import thất bại' })
  failCount!: number;

  @ApiProperty({
    type: [UserImportResultDetailDto],
    description: 'Chi tiết kết quả các dòng thất bại hoặc lỗi',
  })
  details!: UserImportResultDetailDto[];
}

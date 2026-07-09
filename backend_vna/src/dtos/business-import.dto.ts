import { ApiProperty } from '@nestjs/swagger';

export class ImportResultDetailDto {
  @ApiProperty({ example: 2, description: 'Số thứ tự dòng trong file Excel' })
  rowNumber!: number;

  @ApiProperty({ example: '0312345678', description: 'Mã số thuế' })
  taxCode!: string;

  @ApiProperty({ example: 'Công ty TNHH VNA', description: 'Tên doanh nghiệp' })
  businessName!: string;

  @ApiProperty({
    example: ['Mã số thuế đã tồn tại', 'Email không hợp lệ'],
    description: 'Danh sách các lỗi kiểm tra',
  })
  errors!: string[];
}

export class ImportSummaryResponseDto {
  @ApiProperty({ example: 10, description: 'Tổng số dòng được xử lý' })
  total!: number;

  @ApiProperty({ example: 8, description: 'Số dòng import thành công' })
  successCount!: number;

  @ApiProperty({ example: 2, description: 'Số dòng import thất bại' })
  failCount!: number;

  @ApiProperty({
    type: [ImportResultDetailDto],
    description: 'Chi tiết kết quả các dòng thất bại hoặc lỗi',
  })
  details!: ImportResultDetailDto[];
}

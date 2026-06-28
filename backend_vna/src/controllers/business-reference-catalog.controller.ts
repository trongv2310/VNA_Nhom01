import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../decorators/permissions.decorator';
import { Roles } from '../decorators/roles.decorator';
import {
  CreateBusinessIndustryDto,
  CreateBusinessTypeDto,
  ListBusinessIndustriesQueryDto,
  ListBusinessReferenceCatalogsQueryDto,
  UpdateBusinessIndustryDto,
  UpdateBusinessReferenceCatalogStatusDto,
  UpdateBusinessTypeDto,
} from '../dtos/business-reference-catalog.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesGuard } from '../guards/roles.guard';
import { BusinessReferenceCatalogService } from '../services/business-reference-catalog.service';

@Controller('business-types')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN')
@ApiTags('Loại hình kinh doanh')
@ApiBearerAuth('access-token')
export class BusinessTypeController {
  constructor(
    private readonly catalogService: BusinessReferenceCatalogService,
  ) {}

  @Get()
  @Permissions('SYSTEM_C_BUSINESS_TYPE_VIEW')
  @ApiOperation({ summary: 'Danh sách loại hình kinh doanh' })
  getItems(@Query() query: ListBusinessReferenceCatalogsQueryDto) {
    return this.catalogService.getBusinessTypes(query);
  }

  @Get(':id')
  @Permissions('SYSTEM_C_BUSINESS_TYPE_VIEW')
  @ApiOperation({ summary: 'Chi tiết loại hình kinh doanh' })
  getItem(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.getBusinessTypeDetail(id);
  }

  @Post()
  @Permissions('SYSTEM_C_BUSINESS_TYPE_MANAGE')
  @ApiOperation({ summary: 'Thêm loại hình kinh doanh' })
  createItem(@Body() body: CreateBusinessTypeDto) {
    return this.catalogService.createBusinessType(body);
  }

  @Patch(':id')
  @Permissions('SYSTEM_C_BUSINESS_TYPE_MANAGE')
  @ApiOperation({ summary: 'Cập nhật loại hình kinh doanh' })
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBusinessTypeDto,
  ) {
    return this.catalogService.updateBusinessType(id, body);
  }

  @Patch(':id/status')
  @Permissions('SYSTEM_C_BUSINESS_TYPE_MANAGE')
  @ApiOperation({ summary: 'Cập nhật trạng thái loại hình kinh doanh' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBusinessReferenceCatalogStatusDto,
  ) {
    return this.catalogService.updateBusinessTypeStatus(id, body);
  }
}

@Controller('business-industries')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN')
@ApiTags('Ngành nghề kinh doanh')
@ApiBearerAuth('access-token')
export class BusinessIndustryController {
  constructor(
    private readonly catalogService: BusinessReferenceCatalogService,
  ) {}

  @Get()
  @Permissions('SYSTEM_C_INDUSTRY_VIEW')
  @ApiOperation({ summary: 'Danh sách ngành nghề kinh doanh' })
  getItems(@Query() query: ListBusinessIndustriesQueryDto) {
    return this.catalogService.getBusinessIndustries(query);
  }

  @Get(':id')
  @Permissions('SYSTEM_C_INDUSTRY_VIEW')
  @ApiOperation({ summary: 'Chi tiết ngành nghề kinh doanh' })
  getItem(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.getBusinessIndustryDetail(id);
  }

  @Post()
  @Permissions('SYSTEM_C_INDUSTRY_MANAGE')
  @ApiOperation({ summary: 'Thêm ngành nghề kinh doanh' })
  createItem(@Body() body: CreateBusinessIndustryDto) {
    return this.catalogService.createBusinessIndustry(body);
  }

  @Patch(':id')
  @Permissions('SYSTEM_C_INDUSTRY_MANAGE')
  @ApiOperation({ summary: 'Cập nhật ngành nghề kinh doanh' })
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBusinessIndustryDto,
  ) {
    return this.catalogService.updateBusinessIndustry(id, body);
  }

  @Patch(':id/status')
  @Permissions('SYSTEM_C_INDUSTRY_MANAGE')
  @ApiOperation({ summary: 'Cập nhật trạng thái ngành nghề kinh doanh' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBusinessReferenceCatalogStatusDto,
  ) {
    return this.catalogService.updateBusinessIndustryStatus(id, body);
  }
}

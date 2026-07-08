import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Business } from '../entities/business.entity';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import {
  CreateBusinessIndustryDto,
  CreateBusinessTypeDto,
  ListBusinessIndustriesQueryDto,
  ListBusinessReferenceCatalogsQueryDto,
  UpdateBusinessIndustryDto,
  UpdateBusinessReferenceCatalogStatusDto,
  UpdateBusinessTypeDto,
} from '../dtos/business-reference-catalog.dto';
import { BusinessIndustry } from '../entities/business-industry.entity';
import { BusinessType } from '../entities/business-type.entity';

@Injectable()
export class BusinessReferenceCatalogService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BusinessType)
    private readonly businessTypeRepository: Repository<BusinessType>,
    @InjectRepository(BusinessIndustry)
    private readonly businessIndustryRepository: Repository<BusinessIndustry>,
  ) {}

  async getActiveOptions() {
    const [businessTypes, industries] = await Promise.all([
      this.businessTypeRepository.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC', code: 'ASC' },
      }),
      this.businessIndustryRepository.find({
        where: { level: 4, isActive: true },
        relations: { parent: true },
        order: { sortOrder: 'ASC', code: 'ASC' },
      }),
    ]);

    return {
      businessTypes: businessTypes.map((item) => item.name),
      businessTypeOptions: businessTypes.map((item) =>
        this.mapBusinessType(item),
      ),
      industries: industries.map((item) => this.mapBusinessIndustry(item)),
    };
  }

  async getBusinessTypes(query: ListBusinessReferenceCatalogsQueryDto) {
    const { page, limit, skip } = this.getPagination(query.page, query.limit);
    const queryBuilder =
      this.businessTypeRepository.createQueryBuilder('business_type');

    this.applyCommonFilters(queryBuilder, 'business_type', query);

    const [items, totalItems] = await queryBuilder
      .orderBy('business_type.sortOrder', 'ASC')
      .addOrderBy('business_type.code', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      message: 'Lấy danh sách loại hình kinh doanh thành công',
      data: this.paginate(
        items.map((item) => this.mapBusinessType(item)),
        page,
        limit,
        totalItems,
      ),
    };
  }

  async getBusinessTypeDetail(id: number) {
    const item = await this.findBusinessType(id);
    return {
      message: 'Lấy chi tiết loại hình kinh doanh thành công',
      data: this.mapBusinessType(item),
    };
  }

  async createBusinessType(body: CreateBusinessTypeDto) {
    const code = this.requiredText(body.code, 'Mã loại hình').toUpperCase();
    const name = this.requiredText(body.name, 'Tên loại hình kinh doanh');
    await this.assertBusinessTypeUnique(code, name);

    const saved = await this.businessTypeRepository.save(
      this.businessTypeRepository.create({
        code,
        name,
        sortOrder: this.nonNegativeInteger(body.sortOrder, 0, 'Thứ tự'),
        isActive: this.toBoolean(body.isActive, true),
      }),
    );

    return {
      message: 'Thêm loại hình kinh doanh thành công',
      data: this.mapBusinessType(saved),
    };
  }

  async updateBusinessType(id: number, body: UpdateBusinessTypeDto) {
    const item = await this.findBusinessType(id);

    if (body.name !== undefined) {
      const name = this.requiredText(body.name, 'Tên loại hình kinh doanh');
      await this.assertBusinessTypeUnique(item.code, name, id);
      item.name = name;
    }
    if (body.sortOrder !== undefined) {
      item.sortOrder = this.nonNegativeInteger(
        body.sortOrder,
        item.sortOrder,
        'Thứ tự',
      );
    }

    const saved = await this.businessTypeRepository.save(item);
    return {
      message: 'Cập nhật loại hình kinh doanh thành công',
      data: this.mapBusinessType(saved),
    };
  }

  async updateBusinessTypeStatus(
    id: number,
    body: UpdateBusinessReferenceCatalogStatusDto,
  ) {
    const item = await this.findBusinessType(id);
    item.isActive = body.isActive;
    const saved = await this.businessTypeRepository.save(item);
    return {
      message: 'Cập nhật trạng thái loại hình kinh doanh thành công',
      data: this.mapBusinessType(saved),
    };
  }

  async deleteBusinessType(id: number) {
    const item = await this.findBusinessType(id);

    const inUseCount = await this.dataSource.getRepository(Business).count({
      where: { businessTypeCatalog: { id } },
    });
    if (inUseCount > 0) {
      throw new BadRequestException(
        'Không thể xóa loại hình kinh doanh này vì đang có doanh nghiệp sử dụng',
      );
    }

    await this.businessTypeRepository.remove(item);

    return {
      message: 'Xóa loại hình kinh doanh thành công',
      data: { id },
    };
  }

  async deleteBusinessIndustry(id: number) {
    const item = await this.findBusinessIndustry(id);

    const childCount = await this.businessIndustryRepository.count({
      where: { parent: { id } },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'Không thể xóa ngành nghề kinh doanh này vì đang là danh mục cha của danh mục khác',
      );
    }

    const inUseCount = await this.dataSource.getRepository(Business).count({
      where: { industryCatalog: { id } },
    });
    if (inUseCount > 0) {
      throw new BadRequestException(
        'Không thể xóa ngành nghề kinh doanh này vì đang có doanh nghiệp sử dụng',
      );
    }

    await this.businessIndustryRepository.remove(item);

    return {
      message: 'Xóa ngành nghề kinh doanh thành công',
      data: { id },
    };
  }

  async getBusinessIndustries(query: ListBusinessIndustriesQueryDto) {
    const { page, limit, skip } = this.getPagination(query.page, query.limit);
    const queryBuilder = this.businessIndustryRepository
      .createQueryBuilder('industry')
      .leftJoinAndSelect('industry.parent', 'parent');

    this.applyCommonFilters(queryBuilder, 'industry', query);

    if (query.level !== undefined && query.level !== '') {
      queryBuilder.andWhere('industry.level = :level', {
        level: this.level(query.level),
      });
    }
    if (query.parentId !== undefined && query.parentId !== '') {
      queryBuilder.andWhere('parent.id = :parentId', {
        parentId: this.positiveInteger(query.parentId, 'Ngành cha'),
      });
    }

    const [items, totalItems] = await queryBuilder
      .orderBy('industry.sortOrder', 'ASC')
      .addOrderBy('industry.code', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      message: 'Lấy danh sách ngành nghề kinh doanh thành công',
      data: this.paginate(
        items.map((item) => this.mapBusinessIndustry(item)),
        page,
        limit,
        totalItems,
      ),
    };
  }

  async getBusinessIndustryDetail(id: number) {
    const item = await this.findBusinessIndustry(id);
    return {
      message: 'Lấy chi tiết ngành nghề kinh doanh thành công',
      data: this.mapBusinessIndustry(item),
    };
  }

  async createBusinessIndustry(body: CreateBusinessIndustryDto) {
    const code = this.requiredText(body.code, 'Mã ngành').toUpperCase();
    const name = this.requiredText(body.name, 'Tên ngành');
    await this.assertIndustryCodeUnique(code);

    const parent = await this.resolveIndustryParent(body.parentId);
    
    let level = 1;
    if (/^\d{4}$/.test(code)) {
      level = 4;
    } else if (/^\d{3}$/.test(code)) {
      level = 3;
    } else if (/^\d{2}$/.test(code)) {
      level = 2;
    } else if (/^[A-Z]$/.test(code)) {
      level = 1;
    } else {
      throw new BadRequestException(
        'Mã ngành không hợp lệ (Cấp 1 phải gồm một chữ cái, cấp 2-4 phải gồm 2-4 chữ số)',
      );
    }

    if (parent) {
      if (level === 1) {
        throw new BadRequestException('Ngành cấp 1 không thể có ngành cha');
      }
      if (level <= parent.level) {
        throw new BadRequestException('Cấp của ngành con phải lớn hơn cấp của ngành cha');
      }
    }

    const saved = await this.businessIndustryRepository.save(
      this.businessIndustryRepository.create({
        code,
        name,
        level,
        parent,
        sortOrder: this.nonNegativeInteger(body.sortOrder, 0, 'Thứ tự'),
        isActive: this.toBoolean(body.isActive, true),
      }),
    );

    return {
      message: 'Thêm ngành nghề kinh doanh thành công',
      data: this.mapBusinessIndustry(await this.findBusinessIndustry(saved.id)),
    };
  }

  async updateBusinessIndustry(id: number, body: UpdateBusinessIndustryDto) {
    const item = await this.findBusinessIndustry(id);

    if (body.name !== undefined) {
      item.name = this.requiredText(body.name, 'Tên ngành');
    }
    if (body.sortOrder !== undefined) {
      item.sortOrder = this.nonNegativeInteger(
        body.sortOrder,
        item.sortOrder,
        'Thứ tự',
      );
    }
    if (body.parentId !== undefined) {
      const parent = await this.resolveIndustryParent(body.parentId);
      if (parent?.id === item.id) {
        throw new BadRequestException(
          'Ngành nghề không thể là cha của chính nó',
        );
      }
      if (parent && (await this.isIndustryDescendant(parent.id, item.id))) {
        throw new BadRequestException(
          'Không thể chọn một ngành con làm ngành cha',
        );
      }
      
      let nextLevel = 1;
      const code = item.code;
      if (/^\d{4}$/.test(code)) {
        nextLevel = 4;
      } else if (/^\d{3}$/.test(code)) {
        nextLevel = 3;
      } else if (/^\d{2}$/.test(code)) {
        nextLevel = 2;
      } else if (/^[A-Z]$/.test(code)) {
        nextLevel = 1;
      } else {
        throw new BadRequestException(
          'Mã ngành không hợp lệ (Cấp 1 phải gồm một chữ cái, cấp 2-4 phải gồm 2-4 chữ số)',
        );
      }

      if (parent) {
        if (nextLevel === 1) {
          throw new BadRequestException('Ngành cấp 1 không thể có ngành cha');
        }
        if (nextLevel <= parent.level) {
          throw new BadRequestException('Cấp của ngành con phải lớn hơn cấp của ngành cha');
        }
      }

      await this.assertDescendantDepthFits(item.id, nextLevel);
      const currentParentId = item.parent?.id ?? null;
      const nextParentId = parent?.id ?? null;
      if (currentParentId !== nextParentId) {
        await this.assertIndustryHasNoChildrenBeforeMoving(item.id);
      }
      item.parent = parent;
      item.level = nextLevel;
    }

    await this.businessIndustryRepository.save(item);
    return {
      message: 'Cập nhật ngành nghề kinh doanh thành công',
      data: this.mapBusinessIndustry(await this.findBusinessIndustry(id)),
    };
  }

  async updateBusinessIndustryStatus(
    id: number,
    body: UpdateBusinessReferenceCatalogStatusDto,
  ) {
    const item = await this.findBusinessIndustry(id);
    if (!body.isActive) {
      const activeChildren = await this.businessIndustryRepository.count({
        where: { parent: { id }, isActive: true },
      });
      if (activeChildren > 0) {
        throw new BadRequestException(
          'Không thể ngừng sử dụng ngành đang có ngành con hoạt động',
        );
      }
    }

    item.isActive = body.isActive;
    await this.businessIndustryRepository.save(item);
    return {
      message: 'Cập nhật trạng thái ngành nghề kinh doanh thành công',
      data: this.mapBusinessIndustry(await this.findBusinessIndustry(id)),
    };
  }

  private applyCommonFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    alias: string,
    query: ListBusinessReferenceCatalogsQueryDto,
  ) {
    if (query.keyword?.trim()) {
      queryBuilder.andWhere(
        `(LOWER(${alias}.code) LIKE :keyword OR LOWER(${alias}.name) LIKE :keyword)`,
        { keyword: `%${query.keyword.trim().toLowerCase()}%` },
      );
    }
    if (query.code?.trim()) {
      queryBuilder.andWhere(`LOWER(${alias}.code) LIKE :code`, {
        code: `%${query.code.trim().toLowerCase()}%`,
      });
    }
    if (query.name?.trim()) {
      queryBuilder.andWhere(`LOWER(${alias}.name) LIKE :name`, {
        name: `%${query.name.trim().toLowerCase()}%`,
      });
    }
    if (query.isActive !== undefined && query.isActive !== '') {
      queryBuilder.andWhere(`${alias}.isActive = :isActive`, {
        isActive: this.toBoolean(query.isActive),
      });
    }
  }

  private async findBusinessType(id: number) {
    const item = await this.businessTypeRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Không tìm thấy loại hình kinh doanh');
    }
    return item;
  }

  private async findBusinessIndustry(id: number) {
    const item = await this.businessIndustryRepository.findOne({
      where: { id },
      relations: { parent: true },
    });
    if (!item) {
      throw new NotFoundException('Không tìm thấy ngành nghề kinh doanh');
    }
    return item;
  }

  private async assertBusinessTypeUnique(
    code: string,
    name: string,
    ignoredId?: number,
  ) {
    const queryBuilder = this.businessTypeRepository
      .createQueryBuilder('item')
      .where(
        '(LOWER(item.code) = LOWER(:code) OR LOWER(item.name) = LOWER(:name))',
        { code, name },
      );
    if (ignoredId) {
      queryBuilder.andWhere('item.id != :ignoredId', { ignoredId });
    }
    const duplicate = await queryBuilder.getOne();
    if (duplicate) {
      throw new BadRequestException(
        duplicate.code.toLowerCase() === code.toLowerCase()
          ? 'Mã loại hình kinh doanh đã tồn tại'
          : 'Tên loại hình kinh doanh đã tồn tại',
      );
    }
  }

  private async assertIndustryCodeUnique(code: string) {
    const duplicate = await this.businessIndustryRepository
      .createQueryBuilder('item')
      .where('LOWER(item.code) = LOWER(:code)', { code })
      .getOne();
    if (duplicate) {
      throw new BadRequestException('Mã ngành nghề kinh doanh đã tồn tại');
    }
  }

  private async resolveIndustryParent(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parent = await this.businessIndustryRepository.findOne({
      where: {
        id: this.positiveInteger(value, 'Ngành cha'),
        isActive: true,
      },
      relations: { parent: true },
    });
    if (!parent) {
      throw new BadRequestException(
        'Ngành cha không tồn tại hoặc không còn sử dụng',
      );
    }
    return parent;
  }

  private async isIndustryDescendant(candidateId: number, ancestorId: number) {
    let currentId: number | null = candidateId;
    const visited = new Set<number>();
    while (currentId && !visited.has(currentId)) {
      if (currentId === ancestorId) {
        return true;
      }
      visited.add(currentId);
      const current = await this.businessIndustryRepository.findOne({
        where: { id: currentId },
        relations: { parent: true },
      });
      currentId = current?.parent?.id ?? null;
    }
    return false;
  }

  private async assertDescendantDepthFits(id: number, nextLevel: number) {
    const rows: Array<{ id: number; level: number }> =
      await this.businessIndustryRepository.query(
        `
          WITH RECURSIVE descendants AS (
            SELECT id, level FROM business_industries WHERE id = $1
            UNION ALL
            SELECT child.id, child.level
            FROM business_industries child
            INNER JOIN descendants parent ON child.parent_id = parent.id
          )
          SELECT id, level FROM descendants
        `,
        [id],
      );
    const current = rows.find((row) => Number(row.id) === id);
    const currentLevel = Number(current?.level ?? nextLevel);
    const maxRelativeDepth = Math.max(
      0,
      ...rows.map((row) => Number(row.level) - currentLevel),
    );
    if (nextLevel + maxRelativeDepth > 4) {
      throw new BadRequestException(
        'Không thể chuyển ngành vì cây ngành con sẽ vượt quá 4 cấp',
      );
    }
  }

  private async assertIndustryHasNoChildrenBeforeMoving(id: number) {
    const childCount = await this.businessIndustryRepository.count({
      where: { parent: { id } },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'Không thể đổi nhóm cha vì ngành đang có ngành con',
      );
    }
  }

  private getPagination(pageValue: unknown, limitValue: unknown) {
    const page = this.positiveInteger(pageValue ?? 1, 'Trang');
    const limit = Math.min(
      this.positiveInteger(limitValue ?? 10, 'Số dòng'),
      100,
    );
    return { page, limit, skip: (page - 1) * limit };
  }

  private paginate(
    items: unknown[],
    page: number,
    limit: number,
    totalItems: number,
  ) {
    const totalPages = Math.ceil(totalItems / limit);
    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  private requiredText(value: unknown, label: string) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) {
      throw new BadRequestException(`${label} không được để trống`);
    }
    return normalized;
  }

  private positiveInteger(value: unknown, label: string) {
    const normalized = Number(value);
    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }
    return normalized;
  }

  private nonNegativeInteger(value: unknown, fallback: number, label: string) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    const normalized = Number(value);
    if (!Number.isInteger(normalized) || normalized < 0) {
      throw new BadRequestException(`${label} phải là số nguyên không âm`);
    }
    return normalized;
  }

  private level(value: unknown) {
    const normalized = this.positiveInteger(value, 'Cấp ngành');
    if (normalized > 4) {
      throw new BadRequestException(
        'Cấp ngành phải nằm trong khoảng từ 1 đến 4',
      );
    }
    return normalized;
  }

  private validateIndustryCodeForLevel(code: string, level: number) {
    const patterns: Record<number, RegExp> = {
      1: /^[A-Z]$/,
      2: /^\d{2}$/,
      3: /^\d{3}$/,
      4: /^\d{4}$/,
    };
    if (!patterns[level]?.test(code)) {
      const expected = level === 1 ? 'một chữ cái' : `${level} chữ số`;
      throw new BadRequestException(
        `Mã ngành cấp ${level} phải gồm ${expected}`,
      );
    }
  }

  private toBoolean(value: unknown, fallback = false) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return true;
    }
    if (value === false || value === 'false' || value === 0 || value === '0') {
      return false;
    }
    throw new BadRequestException('Trạng thái phải là true hoặc false');
  }

  private mapBusinessType(item: BusinessType) {
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private mapBusinessIndustry(item: BusinessIndustry) {
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      level: item.level,
      parentId: item.parent?.id ?? null,
      parentCode: item.parent?.code ?? null,
      parentName: item.parent?.name ?? null,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

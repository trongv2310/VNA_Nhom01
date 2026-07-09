import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Repository, EntityManager } from 'typeorm';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import {
  UpdateBusinessProfileDto,
  VerifyBusinessProfileEmailOtpDto,
} from '../dtos/business-profile.dto';
import {
  RegisterBusinessDto,
  SendBusinessRegistrationOtpDto,
  VerifyBusinessRegistrationOtpDto,
} from '../dtos/business-registration.dto';
import { CreateBusinessDto } from '../dtos/create-business.dto';
import { ListBusinessesQueryDto } from '../dtos/list-businesses-query.dto';
import { UpdateBusinessDto } from '../dtos/update-business.dto';
import { ValidateBusinessUniquenessDto } from '../dtos/validate-business-uniqueness.dto';
import { ImportSummaryResponseDto, ImportResultDetailDto } from '../dtos/business-import.dto';
import { BusinessAttachment } from '../entities/business-attachment.entity';
import { BusinessIndustry } from '../entities/business-industry.entity';
import { BusinessType } from '../entities/business-type.entity';
import { Business } from '../entities/business.entity';
import { EmailOtp } from '../entities/email-otp.entity';
import { Role } from '../entities/role.entity';
import { User, UserAccountType } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { CloudinaryService } from './cloudinary.service';
import { BusinessReferenceCatalogService } from './business-reference-catalog.service';
import { MailService } from './mail.service';
import type { CurrentUserData } from '../decorators/current-user.decorator';

const DEFAULT_BUSINESS_ACCOUNT_PASSWORD = '12345678';
const BUSINESS_REGISTRATION_PURPOSE = 'BUSINESS_REGISTRATION';
const BUSINESS_PROFILE_EMAIL_CHANGE_PURPOSE = 'BUSINESS_PROFILE_EMAIL_CHANGE';
const BUSINESS_REGISTRATION_ATTACHMENT_NAMES = [
  'Giấy phép kinh doanh',
  'Giấy tờ khác',
];

type ResolvedBusinessReferenceSelection = {
  businessTypeCatalog?: BusinessType;
  industryCatalog?: BusinessIndustry;
};

@Injectable()
export class BusinessService {
  private provincesCache: any[] | null = null;
  private wardsCache: Record<number, any[]> = {};

  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,

    @InjectRepository(BusinessAttachment)
    private readonly attachmentRepository: Repository<BusinessAttachment>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,

    @InjectRepository(EmailOtp)
    private readonly emailOtpRepository: Repository<EmailOtp>,

    @InjectRepository(BusinessType)
    private readonly businessTypeRepository: Repository<BusinessType>,

    @InjectRepository(BusinessIndustry)
    private readonly businessIndustryRepository: Repository<BusinessIndustry>,

    private readonly businessReferenceCatalogService: BusinessReferenceCatalogService,

    private readonly cloudinaryService: CloudinaryService,

    private readonly configService: ConfigService,

    private readonly mailService: MailService,
  ) {}

  async getBusinessOptions() {
    const options =
      await this.businessReferenceCatalogService.getActiveOptions();

    return {
      message: 'Lấy danh mục doanh nghiệp thành công',
      data: {
        ...options,
        taxCodeRules: {
          format: '10 digits or 10 digits-3 digits',
          examples: ['910000888292'.slice(0, 10), '0100109106-001'],
        },
        industryLevel: 4,
        industryCodeRule: 'Mã ngành nghề cấp 4 gồm 4 chữ số theo VSIC',
      },
    };
  }

  async getBusinesses(query: ListBusinessesQueryDto) {
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.attachments', 'attachment')
      .leftJoinAndSelect('business.accountUser', 'accountUser')
      .leftJoinAndSelect('business.businessTypeCatalog', 'businessTypeCatalog')
      .leftJoinAndSelect('business.industryCatalog', 'industryCatalog')
      .distinct(true);

    if (query.keyword?.trim()) {
      const keyword = this.toLikeValue(query.keyword);

      queryBuilder.andWhere(
        '(LOWER(business.businessName) LIKE :keyword OR LOWER(business.taxCode) LIKE :keyword OR LOWER(business.businessType) LIKE :keyword OR LOWER(business.industryCode) LIKE :keyword OR LOWER(business.industryName) LIKE :keyword OR LOWER(business.wardCommune) LIKE :keyword)',
        { keyword },
      );
    }

    if (query.businessName?.trim()) {
      queryBuilder.andWhere('LOWER(business.businessName) LIKE :businessName', {
        businessName: this.toLikeValue(query.businessName),
      });
    }

    if (query.taxCode?.trim()) {
      queryBuilder.andWhere('LOWER(business.taxCode) LIKE :taxCode', {
        taxCode: this.toLikeValue(query.taxCode),
      });
    }

    if (query.businessType?.trim()) {
      queryBuilder.andWhere('LOWER(business.businessType) LIKE :businessType', {
        businessType: this.toLikeValue(query.businessType),
      });
    }

    if (query.industryCode?.trim()) {
      queryBuilder.andWhere('LOWER(business.industryCode) LIKE :industryCode', {
        industryCode: this.toLikeValue(query.industryCode),
      });
    }

    if (query.industryName?.trim()) {
      queryBuilder.andWhere('LOWER(business.industryName) LIKE :industryName', {
        industryName: this.toLikeValue(query.industryName),
      });
    }

    if (query.wardCommune?.trim()) {
      queryBuilder.andWhere('LOWER(business.wardCommune) LIKE :wardCommune', {
        wardCommune: this.toLikeValue(query.wardCommune),
      });
    }

    if (query.isActive !== undefined && query.isActive !== '') {
      queryBuilder.andWhere('business.isActive = :isActive', {
        isActive: this.toBoolean(query.isActive),
      });
    }

    const [businesses, totalItems] = await queryBuilder
      .orderBy('business.createdAt', 'DESC')
      .addOrderBy('business.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Lấy danh sách doanh nghiệp thành công',
      data: {
        items: businesses.map((business) => this.mapBusiness(business)),
        meta: {
          page,
          limit,
          totalItems,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      },
    };
  }

  async getBusinessDetail(id: number) {
    const business = await this.findBusiness(id);

    return {
      message: 'Lấy chi tiết doanh nghiệp thành công',
      data: this.mapBusiness(business),
    };
  }

  async validateBusinessUniqueness(body: ValidateBusinessUniquenessDto) {
    const taxCode = this.normalizeTaxCode(body.taxCode);
    const email = this.normalizeRequiredEmail(body.email);
    const currentBusiness = body.businessId
      ? await this.findBusiness(body.businessId)
      : null;
    const ignoredBusinessId = currentBusiness?.id;
    const ignoredUserId = currentBusiness?.accountUser?.id;

    await this.validateUniqueTaxCode(taxCode, ignoredBusinessId);
    await this.validateUniqueBusinessUsername(taxCode, ignoredUserId);
    await this.validateUniqueBusinessEmail(email, ignoredUserId);

    return {
      message: 'Mã số thuế và email có thể sử dụng',
      data: {
        available: true,
      },
    };
  }

  async getMyBusiness(userId: number) {
    const business = await this.findBusinessByAccountUserId(userId);

    return {
      message: 'Lấy thông tin doanh nghiệp thành công',
      data: this.mapBusiness(business),
    };
  }

  async sendBusinessProfileEmailOtp(userId: number) {
    const business = await this.findBusinessByAccountUserId(userId);
    const currentEmail = this.getCurrentBusinessAccountEmail(business);
    const otp = this.generateOtp();
    const expireMinutes = this.getOtpExpireMinutes();

    await this.emailOtpRepository
      .createQueryBuilder()
      .update(EmailOtp)
      .set({ isUsed: true })
      .where('user_id = :userId', { userId })
      .andWhere('purpose = :purpose', {
        purpose: BUSINESS_PROFILE_EMAIL_CHANGE_PURPOSE,
      })
      .andWhere('is_used = :isUsed', { isUsed: false })
      .execute();

    const emailOtp = this.emailOtpRepository.create({
      email: currentEmail,
      userId,
      pendingEmail: null,
      otpHash: await bcrypt.hash(otp, 10),
      purpose: BUSINESS_PROFILE_EMAIL_CHANGE_PURPOSE,
      attempts: 0,
      isUsed: false,
      verifiedAt: null,
      expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
    });

    const savedOtp = await this.emailOtpRepository.save(emailOtp);

    const sent = await this.mailService.sendOtpMail({
      to: currentEmail,
      subject: 'Xác thực đổi email doanh nghiệp',
      title: 'Xác thực đổi email doanh nghiệp',
      name: business.businessName,
      username: business.accountUser?.username ?? business.taxCode,
      otp,
      expireMinutes,
      description: `Bạn vừa yêu cầu đổi email cho doanh nghiệp ${business.businessName}.`,
      template: 'change-email',
    });

    if (!sent.success) {
      await this.emailOtpRepository.delete(savedOtp.id);
      throw new BadRequestException('Gửi OTP không thành công');
    }

    return {
      message:
        sent.mode === 'DEV_FALLBACK'
          ? 'DEV_FALLBACK: OTP đã được log ra console backend'
          : 'Mã OTP đã được gửi về email hiện tại',
      data: {
        email: currentEmail,
        expiresInSeconds: expireMinutes * 60,
        mailMode: sent.mode,
        messageId: sent.messageId || null,
      },
    };
  }

  async verifyBusinessProfileEmailOtp(
    userId: number,
    body: VerifyBusinessProfileEmailOtpDto,
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    const currentEmail = this.getCurrentBusinessAccountEmail(business);
    const emailOtp = await this.findLatestBusinessProfileEmailOtp(
      userId,
      currentEmail,
    );
    const validOtp = await this.assertValidOtp(emailOtp, body.otp);

    validOtp.verifiedAt = new Date();
    await this.emailOtpRepository.save(validOtp);

    return {
      message: 'Xác thực OTP đổi email doanh nghiệp thành công',
      data: {
        email: currentEmail,
        verified: true,
      },
    };
  }

  async updateMyBusiness(
    userId: number,
    updateBusinessDto: UpdateBusinessProfileDto,
    files: Express.Multer.File[] = [],
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    this.validateBusinessPayload(updateBusinessDto, false);
    const referenceSelection = await this.resolveBusinessReferenceSelection(
      updateBusinessDto,
      business,
      false,
    );
    await this.validateUniqueRepresentativePhone(
      updateBusinessDto.representativePhone,
      business.id,
    );

    const nextEmail = updateBusinessDto.email
      ? this.normalizeRequiredEmail(updateBusinessDto.email)
      : undefined;
    const currentEmail = this.getCurrentBusinessAccountEmail(business);
    const willChangeEmail = Boolean(nextEmail && nextEmail !== currentEmail);
    const verifiedOtp = willChangeEmail
      ? this.assertVerifiedBusinessProfileEmailOtp(
          await this.findLatestBusinessProfileEmailOtp(userId, currentEmail),
        )
      : null;

    if (willChangeEmail && nextEmail) {
      await this.assertBusinessProfileEmailCanBeUsed(userId, nextEmail);
    }

    await this.businessRepository.manager.transaction(
      async (tem: EntityManager) => {
        business.businessName =
          this.toTrimmedValue(updateBusinessDto.businessName) ??
          business.businessName;
        business.foreignName = this.toOptionalValue(
          updateBusinessDto.foreignName,
          business.foreignName,
        );
        business.businessType =
          referenceSelection.businessTypeCatalog?.name ?? business.businessType;
        business.businessTypeCatalog =
          referenceSelection.businessTypeCatalog ??
          business.businessTypeCatalog;
        business.industryCode =
          referenceSelection.industryCatalog?.code ?? business.industryCode;
        business.industryName =
          referenceSelection.industryCatalog?.name ?? business.industryName;
        business.industryCatalog =
          referenceSelection.industryCatalog ?? business.industryCatalog;
        business.licenseIssueDate =
          updateBusinessDto.licenseIssueDate === undefined
            ? business.licenseIssueDate
            : this.toDateValue(updateBusinessDto.licenseIssueDate);
        business.provinceCity =
          this.toTrimmedValue(updateBusinessDto.provinceCity) ??
          business.provinceCity;
        business.wardCommune =
          this.toTrimmedValue(updateBusinessDto.wardCommune) ??
          business.wardCommune;
        business.address = this.toOptionalValue(
          updateBusinessDto.address,
          business.address,
        );
        business.agencyPhone = this.toOptionalValue(
          updateBusinessDto.agencyPhone,
          business.agencyPhone,
        );
        business.operatingProvinceCity = this.toOptionalValue(
          updateBusinessDto.operatingProvinceCity,
          business.operatingProvinceCity,
        );
        business.operatingWardCommune = this.toOptionalValue(
          updateBusinessDto.operatingWardCommune,
          business.operatingWardCommune,
        );
        business.businessLocation = this.toOptionalValue(
          updateBusinessDto.businessLocation,
          business.businessLocation,
        );
        business.representativeName = this.toOptionalValue(
          updateBusinessDto.representativeName,
          business.representativeName,
        );
        business.representativePhone = this.toOptionalValue(
          updateBusinessDto.representativePhone,
          business.representativePhone,
        );

        if (nextEmail) {
          business.email = nextEmail;
        }

        const accountUser = business.accountUser;

        if (accountUser) {
          accountUser.fullName = business.businessName;
          accountUser.provinceCity = business.provinceCity;
          accountUser.wardCommune = business.wardCommune;
          accountUser.address = business.address;

          if (nextEmail) {
            accountUser.email = nextEmail;
          }

          await tem.save(User, accountUser);
        }

        const savedBusiness = await tem.save(Business, business);
        await this.saveAttachmentsTx(
          tem,
          savedBusiness,
          files,
          updateBusinessDto.attachmentNames,
        );

        if (verifiedOtp && nextEmail) {
          verifiedOtp.pendingEmail = nextEmail;
          verifiedOtp.isUsed = true;
          await tem.save(EmailOtp, verifiedOtp);
        }
      },
    );

    const updatedBusiness = await this.findBusinessByAccountUserId(userId);

    return {
      message: 'Cập nhật thông tin doanh nghiệp thành công',
      data: this.mapBusiness(updatedBusiness),
    };
  }

  async sendBusinessRegistrationOtp(body: SendBusinessRegistrationOtpDto) {
    const email = this.normalizeRequiredEmail(body.email);

    await this.assertRegistrationEmailCanBeUsed(email);

    if (body.taxCode) {
      const taxCode = this.normalizeTaxCode(body.taxCode);
      await this.validateUniqueTaxCode(taxCode);
      await this.validateUniqueBusinessAccount(taxCode);
    }

    const otp = this.generateOtp();
    const expireMinutes = this.getOtpExpireMinutes();

    await this.emailOtpRepository.update(
      {
        email,
        purpose: BUSINESS_REGISTRATION_PURPOSE,
        isUsed: false,
      },
      { isUsed: true },
    );

    const emailOtp = this.emailOtpRepository.create({
      email,
      userId: null,
      pendingEmail: null,
      otpHash: await bcrypt.hash(otp, 10),
      purpose: BUSINESS_REGISTRATION_PURPOSE,
      attempts: 0,
      isUsed: false,
      verifiedAt: null,
      expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
    });

    const savedOtp = await this.emailOtpRepository.save(emailOtp);

    const sent = await this.mailService.sendOtpMail({
      to: email,
      subject: 'Xác thực đăng ký tài khoản doanh nghiệp',
      title: 'Xác thực đăng ký tài khoản doanh nghiệp',
      name: 'Doanh nghiệp',
      username: email,
      otp,
      expireMinutes,
      description: `Bạn vừa yêu cầu đăng ký tài khoản doanh nghiệp cho email ${email}.`,
      template: 'business-registration',
    });

    if (!sent.success) {
      await this.emailOtpRepository.delete(savedOtp.id);
      throw new BadRequestException('Gửi OTP không thành công');
    }

    return {
      message:
        sent.mode === 'DEV_FALLBACK'
          ? 'DEV_FALLBACK: OTP đã được log ra console backend'
          : 'Mã OTP đã được gửi về email',
      data: {
        email,
        expiresInSeconds: expireMinutes * 60,
        mailMode: sent.mode,
        messageId: sent.messageId || null,
      },
    };
  }

  async verifyBusinessRegistrationOtp(body: VerifyBusinessRegistrationOtpDto) {
    const email = this.normalizeRequiredEmail(body.email);
    const emailOtp = await this.findLatestBusinessRegistrationOtp(email);
    const validOtp = await this.assertValidOtp(emailOtp, body.otp);

    validOtp.verifiedAt = new Date();
    await this.emailOtpRepository.save(validOtp);

    return {
      message: 'Xác thực OTP đăng ký doanh nghiệp thành công',
      data: {
        email,
        verified: true,
      },
    };
  }

  async confirmBusinessRegistration(
    registerBusinessDto: RegisterBusinessDto,
    files: Express.Multer.File[] = [],
  ) {
    const email = this.normalizeRequiredEmail(registerBusinessDto.email);
    const attachmentNames =
      this.toTrimmedValue(registerBusinessDto.attachmentNames) ||
      this.getDefaultRegistrationAttachmentNames(files);

    const taxCode = this.normalizeTaxCode(registerBusinessDto.taxCode);
    const createBusinessDto = {
      ...registerBusinessDto,
      email,
      taxCode,
      isActive: true,
      attachmentNames,
    } as CreateBusinessDto;

    this.validateBusinessPayload(createBusinessDto);
    await this.validateUniqueTaxCode(taxCode);
    await this.validateUniqueBusinessAccount(taxCode, email);
    await this.validateUniqueRepresentativePhone(
      createBusinessDto.representativePhone,
    );

    const emailOtp = await this.findLatestBusinessRegistrationOtp(email);
    const verifiedOtp = this.assertVerifiedBusinessRegistrationOtp(emailOtp);

    const createdBusiness = await this.createBusiness(createBusinessDto, files);

    verifiedOtp.isUsed = true;
    await this.emailOtpRepository.save(verifiedOtp);

    return {
      ...createdBusiness,
      message: 'Đăng ký tài khoản doanh nghiệp thành công',
    };
  }

  async createBusiness(
    createBusinessDto: CreateBusinessDto,
    files: Express.Multer.File[] = [],
  ) {
    const taxCode = this.normalizeTaxCode(createBusinessDto.taxCode);

    this.validateBusinessPayload(createBusinessDto);
    const referenceSelection = await this.resolveBusinessReferenceSelection(
      createBusinessDto,
      undefined,
      true,
    );
    await this.validateUniqueTaxCode(taxCode);
    await this.validateUniqueBusinessAccount(taxCode, createBusinessDto.email);
    await this.validateUniqueRepresentativePhone(
      createBusinessDto.representativePhone,
    );

    const createdBusiness = await this.businessRepository.manager.transaction(
      async (tem: EntityManager) => {
        // 1. Create default business user account
        const accountUser = await this.createBusinessAccountTx(
          tem,
          createBusinessDto,
          taxCode,
        );

        // 2. Instantiate and save business entity
        const business = tem.create(Business, {
          businessName: this.toRequiredValue(createBusinessDto.businessName),
          foreignName: this.toOptionalValue(createBusinessDto.foreignName),
          taxCode,
          businessType: referenceSelection.businessTypeCatalog!.name,
          businessTypeCatalog: referenceSelection.businessTypeCatalog!,
          industryCode: referenceSelection.industryCatalog!.code,
          industryName: referenceSelection.industryCatalog!.name,
          industryCatalog: referenceSelection.industryCatalog!,
          licenseIssueDate: this.toDateValue(
            createBusinessDto.licenseIssueDate,
          ),
          provinceCity: this.toRequiredValue(createBusinessDto.provinceCity),
          wardCommune: this.toRequiredValue(createBusinessDto.wardCommune),
          address: this.toOptionalValue(createBusinessDto.address),
          email: this.toOptionalValue(createBusinessDto.email),
          agencyPhone: this.toOptionalValue(createBusinessDto.agencyPhone),
          operatingProvinceCity: this.toOptionalValue(
            createBusinessDto.operatingProvinceCity,
          ),
          operatingWardCommune: this.toOptionalValue(
            createBusinessDto.operatingWardCommune,
          ),
          businessLocation: this.toOptionalValue(
            createBusinessDto.businessLocation,
          ),
          representativeName: this.toOptionalValue(
            createBusinessDto.representativeName,
          ),
          representativePhone: this.toOptionalValue(
            createBusinessDto.representativePhone,
          ),
          isActive: this.toBoolean(createBusinessDto.isActive, true),
          accountUser,
        });

        const savedBusiness = await tem.save(Business, business);

        // 3. Save attachments
        await this.saveAttachmentsTx(
          tem,
          savedBusiness,
          files,
          createBusinessDto.attachmentNames,
        );

        return savedBusiness;
      },
    );

    const createdBusinessWithRelations = await this.findBusiness(
      createdBusiness.id,
    );

    return {
      message: 'Thêm doanh nghiệp thành công',
      data: {
        ...this.mapBusiness(createdBusinessWithRelations),
        accountInfo: {
          username: taxCode,
          password: DEFAULT_BUSINESS_ACCOUNT_PASSWORD,
        },
      },
    };
  }

  private async createBusinessAccountTx(
    tem: EntityManager,
    createBusinessDto: CreateBusinessDto,
    taxCode: string,
  ) {
    const userRole = await tem.findOne(Role, {
      where: {
        code: 'USER',
      },
    });

    if (!userRole) {
      throw new BadRequestException('Chua cau hinh vai tro USER');
    }

    const email =
      this.toTrimmedValue(createBusinessDto.email) ||
      `${taxCode}@business.local`;

    const accountUser = await tem.save(
      User,
      tem.create(User, {
        username: taxCode,
        password: await bcrypt.hash(DEFAULT_BUSINESS_ACCOUNT_PASSWORD, 10),
        fullName: this.toRequiredValue(createBusinessDto.businessName),
        email,
        position: 'Doanh nghiệp',
        provinceCity: this.toOptionalValue(createBusinessDto.provinceCity),
        wardCommune: this.toOptionalValue(createBusinessDto.wardCommune),
        address: this.toOptionalValue(createBusinessDto.address),
        accountType: UserAccountType.BUSINESS,
        isActive: this.toBoolean(createBusinessDto.isActive, true),
      }),
    );

    await tem.save(
      UserRole,
      tem.create(UserRole, {
        user: accountUser,
        role: userRole,
      }),
    );

    return accountUser;
  }

  private async saveAttachmentsTx(
    tem: EntityManager,
    business: Business,
    files: Express.Multer.File[],
    attachmentNames?: string,
  ) {
    if (!files.length) {
      return;
    }

    const names = this.parseAttachmentNames(attachmentNames);
    const folder =
      this.configService.get<string>('CLOUDINARY_FOLDER_BUSINESSES') ||
      'businesses';

    for (const [index, file] of files.entries()) {
      const uploadResult = await this.cloudinaryService.uploadFile(
        file,
        folder,
      );
      const displayName = names[index] || file.originalname;

      // Find and remove existing attachment with same displayName for this business
      const existedAttachment = await tem.findOne(BusinessAttachment, {
        where: {
          business: { id: business.id },
          displayName,
        },
      });

      if (existedAttachment) {
        await tem.remove(BusinessAttachment, existedAttachment);
      }

      await tem.save(
        BusinessAttachment,
        tem.create(BusinessAttachment, {
          business,
          displayName,
          originalName: file.originalname,
          fileUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          mimetype: file.mimetype,
          size: file.size,
        }),
      );
    }
  }

  async updateBusiness(
    id: number,
    updateBusinessDto: UpdateBusinessDto,
    files: Express.Multer.File[] = [],
  ) {
    const business = await this.findBusiness(id);
    this.validateBusinessPayload(updateBusinessDto, false);
    const referenceSelection = await this.resolveBusinessReferenceSelection(
      updateBusinessDto,
      business,
      false,
    );
    const accountUserId = business.accountUser?.id;

    const nextTaxCode = updateBusinessDto.taxCode
      ? this.normalizeTaxCode(updateBusinessDto.taxCode)
      : undefined;
    const nextEmail = updateBusinessDto.email
      ? this.normalizeRequiredEmail(updateBusinessDto.email)
      : undefined;

    if (nextTaxCode && nextTaxCode !== business.taxCode) {
      await this.validateUniqueTaxCode(nextTaxCode, id);
      await this.validateUniqueBusinessUsername(nextTaxCode, accountUserId);
    }

    if (nextEmail) {
      await this.validateUniqueBusinessEmail(nextEmail, accountUserId);
    }

    await this.validateUniqueRepresentativePhone(
      updateBusinessDto.representativePhone,
      id,
    );

    const updatedBusiness = await this.businessRepository.manager.transaction(
      async (tem: EntityManager) => {
        if (nextTaxCode && nextTaxCode !== business.taxCode) {
          business.taxCode = nextTaxCode;
        }

        business.businessName =
          this.toTrimmedValue(updateBusinessDto.businessName) ??
          business.businessName;
        business.foreignName = this.toOptionalValue(
          updateBusinessDto.foreignName,
          business.foreignName,
        );
        business.businessType =
          referenceSelection.businessTypeCatalog?.name ?? business.businessType;
        business.businessTypeCatalog =
          referenceSelection.businessTypeCatalog ??
          business.businessTypeCatalog;
        business.industryCode =
          referenceSelection.industryCatalog?.code ?? business.industryCode;
        business.industryName =
          referenceSelection.industryCatalog?.name ?? business.industryName;
        business.industryCatalog =
          referenceSelection.industryCatalog ?? business.industryCatalog;
        business.licenseIssueDate =
          updateBusinessDto.licenseIssueDate === undefined
            ? business.licenseIssueDate
            : this.toDateValue(updateBusinessDto.licenseIssueDate);
        business.provinceCity =
          this.toTrimmedValue(updateBusinessDto.provinceCity) ??
          business.provinceCity;
        business.wardCommune =
          this.toTrimmedValue(updateBusinessDto.wardCommune) ??
          business.wardCommune;
        business.address = this.toOptionalValue(
          updateBusinessDto.address,
          business.address,
        );
        if (nextEmail) {
          business.email = nextEmail;
        }
        business.agencyPhone = this.toOptionalValue(
          updateBusinessDto.agencyPhone,
          business.agencyPhone,
        );
        business.operatingProvinceCity = this.toOptionalValue(
          updateBusinessDto.operatingProvinceCity,
          business.operatingProvinceCity,
        );
        business.operatingWardCommune = this.toOptionalValue(
          updateBusinessDto.operatingWardCommune,
          business.operatingWardCommune,
        );
        business.businessLocation = this.toOptionalValue(
          updateBusinessDto.businessLocation,
          business.businessLocation,
        );
        business.representativeName = this.toOptionalValue(
          updateBusinessDto.representativeName,
          business.representativeName,
        );
        business.representativePhone = this.toOptionalValue(
          updateBusinessDto.representativePhone,
          business.representativePhone,
        );

        if (updateBusinessDto.isActive !== undefined) {
          business.isActive = this.toBoolean(updateBusinessDto.isActive);
        }

        const accountUser = business.accountUser;

        if (accountUser) {
          accountUser.fullName = business.businessName;
          accountUser.email = business.email || accountUser.email;
          accountUser.provinceCity = business.provinceCity;
          accountUser.wardCommune = business.wardCommune;
          accountUser.address = business.address;
          accountUser.isActive = business.isActive;

          if (nextTaxCode && nextTaxCode !== accountUser.username) {
            accountUser.username = nextTaxCode;
          }

          await tem.update(User, accountUser.id, {
            fullName: accountUser.fullName,
            email: accountUser.email,
            provinceCity: accountUser.provinceCity,
            wardCommune: accountUser.wardCommune,
            address: accountUser.address,
            isActive: accountUser.isActive,
            username: accountUser.username,
            updatedAt: new Date(),
          });
        }

        const saved = await tem.save(Business, business);
        await this.saveAttachmentsTx(
          tem,
          saved,
          files,
          updateBusinessDto.attachmentNames,
        );

        return saved;
      },
    );

    const updatedBusinessWithRelations = await this.findBusiness(id);

    return {
      message: 'Cập nhật doanh nghiệp thành công',
      data: this.mapBusiness(updatedBusinessWithRelations),
    };
  }

  async updateBusinessStatus(id: number, isActive: string | boolean) {
    const business = await this.findBusiness(id);
    business.isActive = this.toBoolean(isActive);

    await this.businessRepository.manager.transaction(async (tem) => {
      await tem.save(Business, business);

      if (business.accountUser) {
        business.accountUser.isActive = business.isActive;
        await tem.update(User, business.accountUser.id, {
          isActive: business.accountUser.isActive,
          updatedAt: new Date(),
        });
      }
    });

    const savedBusiness = await this.findBusiness(id);

    return {
      message: 'Cập nhật trạng thái doanh nghiệp thành công',
      data: this.mapBusiness(savedBusiness),
    };
  }

  async deleteBusiness(id: number) {
    const business = await this.findBusiness(id);

    await this.businessRepository.manager.transaction(
      async (tem: EntityManager) => {
        // 1. Delete associated user role entries and the user account
        if (business.accountUser) {
          await tem
            .createQueryBuilder()
            .delete()
            .from(UserRole)
            .where('user_id = :userId', { userId: business.accountUser.id })
            .execute();

          await tem.remove(User, business.accountUser);
        }

        // 2. Delete attachments
        if (business.attachments && business.attachments.length > 0) {
          await tem.remove(business.attachments);
        }

        // 3. Delete the business itself
        await tem.remove(Business, business);
      },
    );

    return {
      message: 'Xóa doanh nghiệp thành công',
      data: { id },
    };
  }

  async deleteAttachment(
    businessId: number,
    attachmentId: number,
    currentUser: CurrentUserData,
  ) {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, business: { id: businessId } },
      relations: {
        business: {
          accountUser: true,
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Không tìm thấy file đính kèm');
    }

    // Ownership check: Business (USER role) accounts can only delete their own attachments
    const userRoles = currentUser.roles || [];
    const isAdmin = userRoles.includes('ADMIN');
    if (!isAdmin) {
      if (
        !attachment.business.accountUser ||
        attachment.business.accountUser.id !== currentUser.id
      ) {
        throw new ForbiddenException('Bạn không có quyền xóa file này');
      }
    }

    await this.attachmentRepository.remove(attachment);

    return {
      message: 'Xóa file đính kèm thành công',
      data: { id: attachmentId },
    };
  }

  private async findBusiness(id: number) {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: {
        attachments: true,
        accountUser: true,
        businessTypeCatalog: true,
        industryCatalog: true,
      },
      order: {
        attachments: {
          id: 'ASC',
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Không tìm thấy doanh nghiệp');
    }

    return business;
  }

  private async findBusinessByAccountUserId(userId: number) {
    const business = await this.businessRepository.findOne({
      where: {
        accountUser: { id: userId },
      },
      relations: {
        attachments: true,
        accountUser: true,
        businessTypeCatalog: true,
        industryCatalog: true,
      },
      order: {
        attachments: {
          id: 'ASC',
        },
      },
    });

    if (!business) {
      throw new NotFoundException(
        'Không tìm thấy doanh nghiệp của tài khoản đang đăng nhập',
      );
    }

    return business;
  }

  private getCurrentBusinessAccountEmail(business: Business) {
    return this.normalizeRequiredEmail(
      business.email || business.accountUser?.email || undefined,
    );
  }

  private async validateUniqueTaxCode(taxCode: string, ignoredId?: number) {
    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .where('business.taxCode = :taxCode', { taxCode });

    if (ignoredId) {
      queryBuilder.andWhere('business.id != :ignoredId', { ignoredId });
    }

    const existedBusiness = await queryBuilder.getOne();

    if (existedBusiness) {
      throw new BadRequestException('Mã số thuế đã tồn tại');
    }
  }

  private async validateUniqueRepresentativePhone(
    representativePhone: string | undefined,
    ignoredId?: number,
  ) {
    const phone = this.normalizePhoneNumber(representativePhone);

    if (!phone) {
      return;
    }

    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .where(
        "regexp_replace(COALESCE(business.representativePhone, ''), '[[:space:]]', '', 'g') = :phone",
        { phone },
      );

    if (ignoredId) {
      queryBuilder.andWhere('business.id != :ignoredId', { ignoredId });
    }

    const existedBusiness = await queryBuilder.getOne();

    if (existedBusiness) {
      throw new BadRequestException(
        'Số điện thoại người đại diện đã được đăng ký',
      );
    }
  }

  private async validateUniqueBusinessUsername(
    taxCode: string,
    ignoredUserId?: number,
  ) {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = :username', {
        username: taxCode.toLowerCase(),
      });

    if (ignoredUserId) {
      queryBuilder.andWhere('user.id != :ignoredUserId', { ignoredUserId });
    }

    const existedUsername = await queryBuilder.getOne();

    if (existedUsername) {
      throw new BadRequestException(
        'Mã số thuế đã được sử dụng làm tài khoản đăng nhập',
      );
    }
  }

  private async validateUniqueBusinessEmail(
    email: string,
    ignoredUserId?: number,
  ) {
    const normalizedEmail = this.toTrimmedValue(email)?.toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: normalizedEmail });

    if (ignoredUserId) {
      queryBuilder.andWhere('user.id != :ignoredUserId', { ignoredUserId });
    }

    const existedEmail = await queryBuilder.getOne();

    if (existedEmail) {
      throw new BadRequestException('Email đã được sử dụng bởi tài khoản khác');
    }
  }

  private async validateUniqueBusinessAccount(taxCode: string, email?: string) {
    await this.validateUniqueBusinessUsername(taxCode);

    if (email) {
      await this.validateUniqueBusinessEmail(email);
    }
  }

  private async assertRegistrationEmailCanBeUsed(email: string) {
    const existedUser = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email })
      .getOne();

    if (existedUser) {
      throw new BadRequestException('Email đã được sử dụng bởi tài khoản khác');
    }
  }

  private async assertBusinessProfileEmailCanBeUsed(
    userId: number,
    email: string,
  ) {
    const existedUser = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email })
      .andWhere('user.id != :userId', { userId })
      .getOne();

    if (existedUser) {
      throw new BadRequestException('Email mới đã được sử dụng');
    }
  }

  private findLatestBusinessProfileEmailOtp(userId: number, email: string) {
    return this.emailOtpRepository.findOne({
      where: {
        userId,
        email,
        purpose: BUSINESS_PROFILE_EMAIL_CHANGE_PURPOSE,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  private assertVerifiedBusinessProfileEmailOtp(
    emailOtp: EmailOtp | null,
  ): EmailOtp {
    if (!emailOtp || emailOtp.isUsed || !emailOtp.verifiedAt) {
      throw new BadRequestException(
        'Vui lòng xác thực OTP email hiện tại trước khi đổi email',
      );
    }

    if (emailOtp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP đã hết hạn');
    }

    return emailOtp;
  }

  private findLatestBusinessRegistrationOtp(email: string) {
    return this.emailOtpRepository.findOne({
      where: {
        email,
        purpose: BUSINESS_REGISTRATION_PURPOSE,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  private assertVerifiedBusinessRegistrationOtp(
    emailOtp: EmailOtp | null,
  ): EmailOtp {
    if (!emailOtp || emailOtp.isUsed || !emailOtp.verifiedAt) {
      throw new BadRequestException(
        'Vui lòng xác thực OTP email trước khi đăng ký',
      );
    }

    if (emailOtp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP đã hết hạn');
    }

    return emailOtp;
  }

  private async assertValidOtp(
    emailOtp: EmailOtp | null,
    otp: string,
  ): Promise<EmailOtp> {
    if (!emailOtp || emailOtp.isUsed) {
      throw new BadRequestException('OTP không tồn tại hoặc không hợp lệ');
    }

    if (emailOtp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP đã hết hạn');
    }

    if (emailOtp.attempts >= this.getOtpMaxAttempts()) {
      throw new BadRequestException('OTP đã vượt quá số lần thử');
    }

    const isOtpMatch = await bcrypt.compare(otp, emailOtp.otpHash);

    if (!isOtpMatch) {
      emailOtp.attempts += 1;
      await this.emailOtpRepository.save(emailOtp);

      if (emailOtp.attempts >= this.getOtpMaxAttempts()) {
        throw new BadRequestException('OTP đã vượt quá số lần thử');
      }

      throw new BadRequestException('Mã OTP không chính xác, vui lòng kiểm tra lại');
    }

    return emailOtp;
  }

  private getDefaultRegistrationAttachmentNames(files: Express.Multer.File[]) {
    if (!files.length) {
      return undefined;
    }

    return JSON.stringify(
      BUSINESS_REGISTRATION_ATTACHMENT_NAMES.slice(0, files.length),
    );
  }

  private async createBusinessAccount(
    createBusinessDto: CreateBusinessDto,
    taxCode: string,
  ) {
    const userRole = await this.roleRepository.findOne({
      where: {
        code: 'USER',
      },
    });

    if (!userRole) {
      throw new BadRequestException('Chưa cấu hình vai trò USER');
    }

    const email =
      this.toTrimmedValue(createBusinessDto.email) ||
      `${taxCode}@business.local`;

    const accountUser = await this.userRepository.save(
      this.userRepository.create({
        username: taxCode,
        password: await bcrypt.hash(DEFAULT_BUSINESS_ACCOUNT_PASSWORD, 10),
        fullName: this.toRequiredValue(createBusinessDto.businessName),
        email,
        position: 'Doanh nghiệp',
        provinceCity: this.toOptionalValue(createBusinessDto.provinceCity),
        wardCommune: this.toOptionalValue(createBusinessDto.wardCommune),
        address: this.toOptionalValue(createBusinessDto.address),
        accountType: UserAccountType.BUSINESS,
        isActive: true,
      }),
    );

    await this.userRoleRepository.save(
      this.userRoleRepository.create({
        user: accountUser,
        role: userRole,
      }),
    );

    return accountUser;
  }

  private validateBusinessPayload(
    payload: CreateBusinessDto | UpdateBusinessDto,
    requireAll = true,
  ) {
    const taxCode = this.toTrimmedValue(payload.taxCode);
    const industryCode = this.toTrimmedValue(payload.industryCode);
    const licenseIssueDate = this.toTrimmedValue(payload.licenseIssueDate);

    if (
      (requireAll || taxCode) &&
      taxCode &&
      !/^\d{10}(-\d{3})?$/.test(taxCode)
    ) {
      throw new BadRequestException(
        'Mã số thuế phải gồm 10 số hoặc dạng 10 số-3 số',
      );
    }

    if (
      (requireAll || industryCode) &&
      industryCode &&
      !/^\d{4}$/.test(industryCode)
    ) {
      throw new BadRequestException(
        'Mã ngành nghề kinh doanh cấp 4 phải gồm 4 chữ số',
      );
    }

    if (licenseIssueDate) {
      const date = this.toDateValue(licenseIssueDate);

      if (date && date.getTime() > Date.now()) {
        throw new BadRequestException(
          'Ngày cấp GPKD không được lớn hơn hiện tại',
        );
      }
    }

    this.validatePhone(payload.agencyPhone, 'Số điện thoại cơ quan');
    this.validatePhone(
      payload.representativePhone,
      'SĐT liên hệ người đứng đầu',
    );
  }

  private async resolveBusinessReferenceSelection(
    payload: CreateBusinessDto | UpdateBusinessDto,
    currentBusiness?: Business,
    requireAll = true,
  ): Promise<ResolvedBusinessReferenceSelection> {
    const selection: ResolvedBusinessReferenceSelection = {};
    const businessTypeId = this.toOptionalPositiveInteger(
      payload.businessTypeId,
      'Loại hình kinh doanh',
    );
    const businessTypeName = this.toTrimmedValue(payload.businessType);
    const hasBusinessTypeSelection =
      businessTypeId !== undefined || businessTypeName !== undefined;

    if (hasBusinessTypeSelection) {
      if (
        currentBusiness &&
        this.isCurrentBusinessTypeSelection(
          currentBusiness,
          businessTypeId,
          businessTypeName,
        )
      ) {
        if (!currentBusiness.businessTypeCatalog) {
          throw new BadRequestException(
            'Loại hình hiện tại chưa được liên kết danh mục, vui lòng chọn lại',
          );
        }
        selection.businessTypeCatalog = currentBusiness.businessTypeCatalog;
      } else {
        const businessType = businessTypeId
          ? await this.businessTypeRepository.findOne({
              where: { id: businessTypeId, isActive: true },
            })
          : await this.businessTypeRepository
              .createQueryBuilder('business_type')
              .where('LOWER(business_type.name) = LOWER(:name)', {
                name: businessTypeName,
              })
              .andWhere('business_type.isActive = true')
              .getOne();

        if (!businessType) {
          throw new BadRequestException(
            'Loại hình kinh doanh không tồn tại hoặc không còn sử dụng',
          );
        }
        if (
          businessTypeName &&
          businessType.name.localeCompare(businessTypeName, 'vi', {
            sensitivity: 'accent',
          }) !== 0
        ) {
          throw new BadRequestException(
            'ID và tên loại hình kinh doanh không khớp',
          );
        }
        selection.businessTypeCatalog = businessType;
      }
    } else if (requireAll) {
      throw new BadRequestException('Loại hình kinh doanh không được để trống');
    }

    const industryId = this.toOptionalPositiveInteger(
      payload.industryId,
      'Ngành nghề kinh doanh',
    );
    const industryCode = this.toTrimmedValue(payload.industryCode);
    const industryName = this.toTrimmedValue(payload.industryName);
    const hasIndustrySelection =
      industryId !== undefined ||
      industryCode !== undefined ||
      industryName !== undefined;

    if (hasIndustrySelection) {
      if (
        currentBusiness &&
        this.isCurrentIndustrySelection(
          currentBusiness,
          industryId,
          industryCode,
          industryName,
        )
      ) {
        if (!currentBusiness.industryCatalog) {
          throw new BadRequestException(
            'Ngành nghề hiện tại chưa được liên kết danh mục, vui lòng chọn lại',
          );
        }
        selection.industryCatalog = currentBusiness.industryCatalog;
      } else {
        if (!industryId && !industryCode) {
          throw new BadRequestException(
            'Vui lòng chọn ngành nghề kinh doanh từ danh mục',
          );
        }
        const industry = industryId
          ? await this.businessIndustryRepository.findOne({
              where: { id: industryId, level: 4, isActive: true },
            })
          : await this.businessIndustryRepository.findOne({
              where: {
                code: industryCode!,
                level: 4,
                isActive: true,
              },
            });

        if (!industry) {
          throw new BadRequestException(
            'Ngành nghề cấp 4 không tồn tại hoặc không còn sử dụng',
          );
        }
        if (industryCode && industry.code !== industryCode) {
          throw new BadRequestException('ID và mã ngành nghề không khớp');
        }
        if (
          industryName &&
          industry.name.localeCompare(industryName, 'vi', {
            sensitivity: 'accent',
          }) !== 0
        ) {
          throw new BadRequestException('Mã và tên ngành nghề không khớp');
        }
        selection.industryCatalog = industry;
      }
    } else if (requireAll) {
      throw new BadRequestException(
        'Ngành nghề kinh doanh không được để trống',
      );
    }

    return selection;
  }

  private isCurrentBusinessTypeSelection(
    business: Business,
    id?: number,
    name?: string,
  ) {
    if (id !== undefined && id !== business.businessTypeCatalog?.id) {
      return false;
    }
    if (name !== undefined && name !== business.businessType) {
      return false;
    }
    return id !== undefined || name !== undefined;
  }

  private isCurrentIndustrySelection(
    business: Business,
    id?: number,
    code?: string,
    name?: string,
  ) {
    if (id !== undefined && id !== business.industryCatalog?.id) {
      return false;
    }
    if (code !== undefined && code !== business.industryCode) {
      return false;
    }
    if (name !== undefined && name !== business.industryName) {
      return false;
    }
    return id !== undefined || code !== undefined || name !== undefined;
  }

  private toOptionalPositiveInteger(value: unknown, label: string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const normalized = Number(value);
    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }
    return normalized;
  }

  private validatePhone(value: string | undefined, label: string) {
    const phone = this.normalizePhoneNumber(value);

    if (!phone) {
      return;
    }

    if (!/^(0|\+84)(\d{9,10})$/.test(phone)) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }
  }

  private async saveAttachments(
    business: Business,
    files: Express.Multer.File[],
    attachmentNames?: string,
  ) {
    if (!files.length) {
      return;
    }

    const names = this.parseAttachmentNames(attachmentNames);
    const folder =
      this.configService.get<string>('CLOUDINARY_FOLDER_BUSINESSES') ||
      'businesses';

    for (const [index, file] of files.entries()) {
      const uploadResult = await this.cloudinaryService.uploadFile(
        file,
        folder,
      );
      const displayName = names[index] || file.originalname;

      await this.attachmentRepository.save(
        this.attachmentRepository.create({
          business,
          displayName,
          originalName: file.originalname,
          fileUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          mimetype: file.mimetype,
          size: file.size,
        }),
      );
    }
  }

  private parseAttachmentNames(value: string | undefined) {
    if (!value?.trim()) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(value);

      if (Array.isArray(parsedValue)) {
        return parsedValue.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Fallback to comma-separated values below.
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private normalizeTaxCode(value: string) {
    return this.toRequiredValue(value).replace(/\s/g, '');
  }

  private normalizePhoneNumber(value: string | undefined) {
    return this.toTrimmedValue(value)?.replace(/\s/g, '');
  }

  private toPositiveNumber(value: string | undefined, defaultValue: number) {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 1) {
      return defaultValue;
    }

    return numberValue;
  }

  private toLikeValue(value: string) {
    return `%${value.trim().toLowerCase()}%`;
  }

  private toTrimmedValue(value: string | undefined) {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : undefined;
  }

  private normalizeRequiredEmail(value: string | undefined) {
    const email = this.toRequiredValue(value).toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Email không hợp lệ');
    }

    return email;
  }

  private toRequiredValue(value: string | undefined) {
    const trimmedValue = value?.trim();

    if (!trimmedValue) {
      throw new BadRequestException('Dữ liệu bắt buộc không được để trống');
    }

    return trimmedValue;
  }

  private toOptionalValue(
    value: string | undefined,
    currentValue: string | null = null,
  ) {
    if (value === undefined) {
      return currentValue;
    }

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  private toDateValue(value: string | undefined) {
    const dateValue = this.toTrimmedValue(value);

    if (!dateValue) {
      return null;
    }

    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Ngày cấp GPKD không hợp lệ');
    }

    return parsedDate;
  }

  private toBoolean(value: string | boolean | undefined, defaultValue = false) {
    if (value === undefined) {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return value === 'true';
  }

  private generateOtp(): string {
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private getOtpExpireMinutes() {
    const value = Number(this.configService.get<string>('OTP_EXPIRE_MINUTES'));
    return Number.isFinite(value) && value > 0 ? value : 5;
  }

  private getOtpMaxAttempts() {
    const value = Number(this.configService.get<string>('OTP_MAX_ATTEMPTS'));
    return Number.isFinite(value) && value > 0 ? value : 5;
  }

  private formatDateInput(value: Date | string | null | undefined) {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.toISOString().slice(0, 10);
  }

  private mapBusiness(business: Business) {
    return {
      id: business.id,
      businessName: business.businessName,
      foreignName: business.foreignName,
      taxCode: business.taxCode,
      businessType: business.businessType,
      businessTypeId: business.businessTypeCatalog?.id ?? null,
      businessTypeCode: business.businessTypeCatalog?.code ?? null,
      industryCode: business.industryCode,
      industryName: business.industryName,
      industryId: business.industryCatalog?.id ?? null,
      industryDisplay: `${business.industryCode} - ${business.industryName}`,
      licenseIssueDate: this.formatDateInput(business.licenseIssueDate),
      provinceCity: business.provinceCity,
      wardCommune: business.wardCommune,
      address: business.address,
      email: business.email,
      agencyPhone: business.agencyPhone,
      operatingProvinceCity: business.operatingProvinceCity,
      operatingWardCommune: business.operatingWardCommune,
      businessLocation: business.businessLocation,
      representativeName: business.representativeName,
      representativePhone: business.representativePhone,
      isActive: business.accountUser ? Boolean(business.accountUser.isActive) : Boolean(business.isActive),
      statusLabel: (business.accountUser ? Boolean(business.accountUser.isActive) : Boolean(business.isActive)) ? 'Đang hoạt động' : 'Đã khóa',
      attachments:
        business.attachments?.map((attachment) => ({
          id: attachment.id,
          displayName: attachment.displayName,
          originalName: attachment.originalName,
          fileUrl: attachment.fileUrl,
          mimetype: attachment.mimetype,
          size: attachment.size,
          createdAt: attachment.createdAt,
        })) ?? [],
      accountUserId: business.accountUser?.id ?? null,
      accountUsername: business.accountUser?.username ?? business.taxCode,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }

  private cleanLocationName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^(tinh|thanh pho|tp\.|tp|district|quan|huyen|thi xa|phuong|xa|thi tran)\s+/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  private matchProvince(provinces: any[], input: string) {
    const normInput = input.trim().toLowerCase();
    let found = provinces.find((p) => p.name.trim().toLowerCase() === normInput);
    if (found) return found;

    const cleanInput = this.cleanLocationName(input);
    found = provinces.find((p) => this.cleanLocationName(p.name) === cleanInput);
    return found;
  }

  private matchWard(wards: any[], input: string) {
    const normInput = input.trim().toLowerCase();
    let found = wards.find((w) => w.name.trim().toLowerCase() === normInput);
    if (found) return found;

    const cleanInput = this.cleanLocationName(input);
    found = wards.find((w) => this.cleanLocationName(w.name) === cleanInput);
    return found;
  }

  private parseExcelDate(val: any): string | undefined {
    if (val === undefined || val === null || val === '') return undefined;
    if (val instanceof Date) {
      return val.toISOString().slice(0, 10);
    }
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString().slice(0, 10);
    }
    if (typeof val === 'string') {
      const cleanStr = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        return cleanStr;
      }
      const dmy = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dmy) {
        const day = dmy[1].padStart(2, '0');
        const month = dmy[2].padStart(2, '0');
        const year = dmy[3];
        return `${year}-${month}-${day}`;
      }
      const parsed = new Date(cleanStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
    }
    return String(val).trim();
  }

  private parseIndustryCode(val: any): string | undefined {
    if (val === undefined || val === null || val === '') return undefined;
    const str = String(val).trim();
    const match = str.match(/^(\d{4})/);
    if (match) {
      return match[1];
    }
    return str;
  }

  private formatValidationErrors(errors: any[]): string[] {
    const messages: string[] = [];
    for (const error of errors) {
      if (error.constraints) {
        messages.push(...(Object.values(error.constraints) as string[]));
      }
      if (error.children?.length) {
        messages.push(...this.formatValidationErrors(error.children));
      }
    }
    return messages;
  }

  private getErrorMessage(error: any): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const msg = (response as any).message;
        return Array.isArray(msg) ? msg.join(', ') : String(msg);
      }
      return typeof response === 'string' ? response : error.message;
    }
    return error.message || String(error);
  }

  private async fetchProvinces(): Promise<any[]> {
    if (this.provincesCache) return this.provincesCache;
    try {
      const res = await fetch('https://provinces.open-api.vn/api/v2/p/');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      this.provincesCache = data;
      return data;
    } catch (error) {
      throw new Error('Không thể kết nối đến máy chủ danh mục Tỉnh/Thành phố');
    }
  }

  private async fetchWards(provinceCode: number): Promise<any[]> {
    if (this.wardsCache[provinceCode]) return this.wardsCache[provinceCode];
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      const wards = data?.wards || [];
      this.wardsCache[provinceCode] = wards;
      return wards;
    } catch (error) {
      throw new Error(`Không thể tải danh sách Phường/Xã cho tỉnh có mã ${provinceCode}`);
    }
  }

  private async validateProvinceAndWard(provinceCity: string, wardCommune: string) {
    if (!provinceCity?.trim()) {
      throw new BadRequestException('Tỉnh/Thành phố ĐKKD không được để trống');
    }
    if (!wardCommune?.trim()) {
      throw new BadRequestException('Phường/Xã ĐKKD không được để trống');
    }

    const provinces = await this.fetchProvinces();
    const matchedProv = this.matchProvince(provinces, provinceCity);
    if (!matchedProv) {
      throw new BadRequestException(`Tỉnh/Thành phố ĐKKD "${provinceCity}" không tồn tại trong danh mục`);
    }

    const wards = await this.fetchWards(matchedProv.code);
    const matchedWd = this.matchWard(wards, wardCommune);
    if (!matchedWd) {
      throw new BadRequestException(`Phường/Xã ĐKKD "${wardCommune}" không thuộc Tỉnh/Thành phố "${matchedProv.name}"`);
    }
  }

  async importFromExcel(file: Express.Multer.File): Promise<ImportSummaryResponseDto> {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file upload');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      throw new BadRequestException('Chỉ chấp nhận file Excel (.xlsx hoặc .xls)');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch (e) {
      throw new BadRequestException('File Excel không hợp lệ hoặc bị hỏng');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new BadRequestException('File Excel không có sheet nào');
    }

    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (rows.length <= 1) {
      throw new BadRequestException('File Excel không có dữ liệu doanh nghiệp');
    }

    const dataRows = rows.slice(1);
    const results: ImportSummaryResponseDto = {
      total: 0,
      successCount: 0,
      failCount: 0,
      details: [],
    };

    // Pre-load all provinces to warm cache
    try {
      await this.fetchProvinces();
    } catch (e) {
      throw new BadRequestException('Không thể tải danh sách Tỉnh/Thành phố để xác thực địa chỉ');
    }

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0 || row.every((cell) => cell === null || cell === undefined || cell === '')) {
        continue; // Skip empty rows
      }

      results.total++;
      const rowNum = i + 2;

      const rawBusinessName = row[0];
      const rawTaxCode = row[1];
      const rawBusinessType = row[2];
      const rawIndustryCode = row[3];
      const rawLicenseIssueDate = row[4];
      const rawProvinceCity = row[5];
      const rawWardCommune = row[6];
      const rawEmail = row[7];
      const rawForeignName = row[8];
      const rawAddress = row[9];
      const rawBusinessLocation = row[10];
      const rawOperatingProvinceCity = row[11];
      const rawOperatingWardCommune = row[12];
      const rawAgencyPhone = row[13];
      const rawRepresentativeName = row[14];
      const rawRepresentativePhone = row[15];

      const taxCode = rawTaxCode ? String(rawTaxCode).trim() : '';
      const businessName = rawBusinessName ? String(rawBusinessName).trim() : '';

      const errors: string[] = [];

      const industryCodeParsed = this.parseIndustryCode(rawIndustryCode);
      const licenseIssueDateParsed = this.parseExcelDate(rawLicenseIssueDate);

      const createDto = plainToInstance(CreateBusinessDto, {
        businessName,
        taxCode,
        businessType: rawBusinessType ? String(rawBusinessType).trim() : undefined,
        industryCode: industryCodeParsed,
        licenseIssueDate: licenseIssueDateParsed,
        provinceCity: rawProvinceCity ? String(rawProvinceCity).trim() : '',
        wardCommune: rawWardCommune ? String(rawWardCommune).trim() : '',
        email: rawEmail ? String(rawEmail).trim() : undefined,
        foreignName: rawForeignName ? String(rawForeignName).trim() : undefined,
        address: rawAddress ? String(rawAddress).trim() : undefined,
        businessLocation: rawBusinessLocation ? String(rawBusinessLocation).trim() : undefined,
        operatingProvinceCity: rawOperatingProvinceCity ? String(rawOperatingProvinceCity).trim() : undefined,
        operatingWardCommune: rawOperatingWardCommune ? String(rawOperatingWardCommune).trim() : undefined,
        agencyPhone: rawAgencyPhone ? String(rawAgencyPhone).trim() : undefined,
        representativeName: rawRepresentativeName ? String(rawRepresentativeName).trim() : undefined,
        representativePhone: rawRepresentativePhone ? String(rawRepresentativePhone).trim() : undefined,
        isActive: true,
      });

      // 1. Validation using class-validator
      const classErrors = await validate(createDto);
      if (classErrors.length > 0) {
        errors.push(...this.formatValidationErrors(classErrors));
      }

      // Check mandatory columns required by import
      if (!createDto.businessType) {
        errors.push('Loại hình doanh nghiệp không được để trống');
      }
      if (!createDto.industryCode) {
        errors.push('Ngành nghề kinh doanh không được để trống');
      }
      if (!createDto.licenseIssueDate) {
        errors.push('Ngày cấp giấy phép kinh doanh không được để trống');
      }
      if (!createDto.email) {
        errors.push('Email không được để trống');
      }

      // 2. Validate using service logic if no structural errors so far
      let resolvedRef: ResolvedBusinessReferenceSelection | null = null;
      if (errors.length === 0) {
        try {
          this.validateBusinessPayload(createDto);
        } catch (e: any) {
          errors.push(this.getErrorMessage(e));
        }

        try {
          resolvedRef = await this.resolveBusinessReferenceSelection(createDto, undefined, true);
        } catch (e: any) {
          errors.push(this.getErrorMessage(e));
        }

        try {
          await this.validateProvinceAndWard(createDto.provinceCity, createDto.wardCommune);
        } catch (e: any) {
          errors.push(this.getErrorMessage(e));
        }

        if (createDto.operatingProvinceCity || createDto.operatingWardCommune) {
          try {
            if (createDto.operatingProvinceCity && createDto.operatingWardCommune) {
              const provinces = await this.fetchProvinces();
              const matchedProv = this.matchProvince(provinces, createDto.operatingProvinceCity);
              if (!matchedProv) {
                errors.push(`Tỉnh/Thành phố hoạt động "${createDto.operatingProvinceCity}" không tồn tại trong danh mục`);
              } else {
                const wards = await this.fetchWards(matchedProv.code);
                const matchedWd = this.matchWard(wards, createDto.operatingWardCommune);
                if (!matchedWd) {
                  errors.push(`Phường/Xã hoạt động "${createDto.operatingWardCommune}" không thuộc Tỉnh/Thành phố "${matchedProv.name}"`);
                }
              }
            } else {
              errors.push('Vui lòng điền đầy đủ cả Tỉnh/Thành phố và Phường/Xã hoạt động');
            }
          } catch (e: any) {
            errors.push(this.getErrorMessage(e));
          }
        }

        // Uniqueness checks
        try {
          await this.validateUniqueTaxCode(createDto.taxCode);
        } catch (e: any) {
          errors.push(this.getErrorMessage(e));
        }

        try {
          await this.validateUniqueBusinessAccount(createDto.taxCode, createDto.email);
        } catch (e: any) {
          errors.push(this.getErrorMessage(e));
        }

        if (createDto.representativePhone) {
          try {
            await this.validateUniqueRepresentativePhone(createDto.representativePhone);
          } catch (e: any) {
            errors.push(this.getErrorMessage(e));
          }
        }
      }

      if (errors.length > 0) {
        results.failCount++;
        results.details.push({
          rowNumber: rowNum,
          taxCode,
          businessName,
          errors,
        });
      } else {
        try {
          if (resolvedRef?.businessTypeCatalog) {
            createDto.businessType = resolvedRef.businessTypeCatalog.name;
            createDto.businessTypeId = resolvedRef.businessTypeCatalog.id;
          }
          if (resolvedRef?.industryCatalog) {
            createDto.industryCode = resolvedRef.industryCatalog.code;
            createDto.industryName = resolvedRef.industryCatalog.name;
            createDto.industryId = resolvedRef.industryCatalog.id;
          }

          createDto.email = createDto.email?.toLowerCase().trim();
          createDto.taxCode = createDto.taxCode.replace(/\s/g, '');

          await this.createBusiness(createDto, []);
          results.successCount++;
        } catch (e: any) {
          results.failCount++;
          results.details.push({
            rowNumber: rowNum,
            taxCode,
            businessName,
            errors: [this.getErrorMessage(e)],
          });
        }
      }
    }

    return results;
  }

  async generateImportTemplate(): Promise<Buffer> {
    const headers = [
      'Tên doanh nghiệp *',
      'Mã số thuế *',
      'Loại hình doanh nghiệp *',
      'Ngành nghề kinh doanh *',
      'Ngày cấp giấy phép kinh doanh *',
      'Tỉnh/Thành phố ĐKKD *',
      'Phường/Xã ĐKKD *',
      'Email *',
      'Tên doanh nghiệp nước ngoài',
      'Địa chỉ',
      'Địa điểm kinh doanh',
      'Tỉnh/Thành phố hoạt động',
      'Phường/Xã hoạt động',
      'Số điện thoại',
      'Người đại diện',
      'Số điện thoại người đại diện',
    ];

    const sampleRow = [
      'Công ty cổ phần công nghệ quốc tế VNA',
      '0312345678',
      'Công ty TNHH 1 thành viên',
      '4669',
      '2020-01-01',
      'Thành phố Hồ Chí Minh',
      'Phường Hiệp Bình Phước',
      'vna@gmail.com',
      'VNA International Technology Joint Stock Company',
      '162 đường số 2, khu đô thị Vạn Phúc',
      '162 đường số 2, khu đô thị Vạn Phúc',
      'Thành phố Hồ Chí Minh',
      'Phường Hiệp Bình Phước',
      '02812345678',
      'Nguyễn Văn A',
      '0909123456',
    ];

    const businessTypes = await this.businessTypeRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    const industries = await this.businessIndustryRepository.find({
      where: { level: 4, isActive: true },
      order: { code: 'ASC' },
      take: 50,
    });

    const docRows = [
      ['HƯỚNG DẪN NHẬP LIỆU DOANH NGHIỆP'],
      [''],
      ['1. Quy tắc chung:'],
      ['- Các trường có dấu * ở Sheet "Danh sách doanh nghiệp" là bắt buộc.'],
      ['- Cột "Loại hình doanh nghiệp" phải khớp chính xác với danh sách ở dưới (không phân biệt hoa thường).'],
      ['- Cột "Ngành nghề kinh doanh" phải là Mã ngành cấp 4 (gồm 4 chữ số), ví dụ: 4669.'],
      ['- Cột "Ngày cấp giấy phép kinh doanh" định dạng YYYY-MM-DD (ví dụ: 2023-05-15) hoặc DD/MM/YYYY.'],
      ['- Cột "Tỉnh/Thành phố ĐKKD" và "Phường/Xã ĐKKD" phải đúng chính tả theo danh mục hành chính Việt Nam.'],
      ['- Mã số thuế phải gồm 10 chữ số hoặc dạng 10 số - 3 số (ví dụ: 0100109106-001) và phải là duy nhất.'],
      ['- Email phải đúng định dạng và chưa tồn tại trong hệ thống.'],
      [''],
      ['2. Danh sách Loại hình doanh nghiệp hợp lệ:'],
      ...businessTypes.map((t) => [`- ${t.name}`]),
      [''],
      ['3. Ví dụ một số Mã ngành nghề cấp 4 hợp lệ (tổng hợp 50 ngành đầu tiên):'],
      ...industries.map((i) => [`- ${i.code}: ${i.name}`]),
    ];

    const wb = XLSX.utils.book_new();

    const wsData = [headers, sampleRow];
    const ws1 = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Danh sách doanh nghiệp');

    const ws2 = XLSX.utils.aoa_to_sheet(docRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Hướng dẫn & Danh mục');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportBusinessesToExcel(query: ListBusinessesQueryDto): Promise<Buffer> {
    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.attachments', 'attachment')
      .leftJoinAndSelect('business.accountUser', 'accountUser')
      .leftJoinAndSelect('business.businessTypeCatalog', 'businessTypeCatalog')
      .leftJoinAndSelect('business.industryCatalog', 'industryCatalog')
      .distinct(true);

    if (query.keyword?.trim()) {
      const keyword = this.toLikeValue(query.keyword);
      queryBuilder.andWhere(
        '(LOWER(business.businessName) LIKE :keyword OR LOWER(business.taxCode) LIKE :keyword OR LOWER(business.businessType) LIKE :keyword OR LOWER(business.industryCode) LIKE :keyword OR LOWER(business.industryName) LIKE :keyword OR LOWER(business.wardCommune) LIKE :keyword)',
        { keyword },
      );
    }

    if (query.businessName?.trim()) {
      queryBuilder.andWhere('LOWER(business.businessName) LIKE :businessName', {
        businessName: this.toLikeValue(query.businessName),
      });
    }

    if (query.taxCode?.trim()) {
      queryBuilder.andWhere('LOWER(business.taxCode) LIKE :taxCode', {
        taxCode: this.toLikeValue(query.taxCode),
      });
    }

    if (query.businessType?.trim()) {
      queryBuilder.andWhere('LOWER(business.businessType) LIKE :businessType', {
        businessType: this.toLikeValue(query.businessType),
      });
    }

    if (query.industryCode?.trim()) {
      queryBuilder.andWhere('LOWER(business.industryCode) LIKE :industryCode', {
        industryCode: this.toLikeValue(query.industryCode),
      });
    }

    if (query.industryName?.trim()) {
      queryBuilder.andWhere('LOWER(business.industryName) LIKE :industryName', {
        industryName: this.toLikeValue(query.industryName),
      });
    }

    if (query.wardCommune?.trim()) {
      queryBuilder.andWhere('LOWER(business.wardCommune) LIKE :wardCommune', {
        wardCommune: this.toLikeValue(query.wardCommune),
      });
    }

    if (query.isActive !== undefined && query.isActive !== '') {
      queryBuilder.andWhere('business.isActive = :isActive', {
        isActive: this.toBoolean(query.isActive),
      });
    }

    const businesses = await queryBuilder
      .orderBy('business.createdAt', 'DESC')
      .addOrderBy('business.id', 'DESC')
      .getMany();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách doanh nghiệp');

    // Excel headers
    const columns = [
      { header: 'Tên doanh nghiệp', key: 'businessName' },
      { header: 'Mã số thuế', key: 'taxCode' },
      { header: 'Loại hình kinh doanh', key: 'businessType' },
      { header: 'Ngành nghề kinh doanh', key: 'industry' },
      { header: 'Phường/Xã', key: 'wardCommune' },
    ];

    worksheet.columns = columns;

    // Add rows
    for (const b of businesses) {
      const mapped = this.mapBusiness(b);
      worksheet.addRow({
        businessName: mapped.businessName,
        taxCode: mapped.taxCode,
        businessType: mapped.businessType || '',
        industry: mapped.industryDisplay || '',
        wardCommune: mapped.wardCommune || '',
      });
    }

    // Styling
    // 1. Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FF1F2937' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEBF2FE' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    // 2. Data styling
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.height = 20;
      row.eachCell((cell) => {
        cell.font = {
          name: 'Arial',
          size: 10,
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // 3. Auto Fit Columns
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      if (column.header) {
        maxLen = Math.max(maxLen, column.header.toString().length);
      }
      column.eachCell && column.eachCell((cell, rowNumber) => {
        if (rowNumber === 1) return;
        const val = cell.value;
        if (val) {
          maxLen = Math.max(maxLen, val.toString().length);
        }
      });
      column.width = Math.min(Math.max(maxLen + 4, 15), 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

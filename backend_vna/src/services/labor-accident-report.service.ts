import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { MODULE_METADATA } from '@nestjs/common/constants';
import type {} from 'multer';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import {
  LaborAccidentReportDashboardQueryDto,
  LaborAccidentReportSummaryQueryDto,
  ListLaborAccidentReportsQueryDto,
  ListMyLaborAccidentReportsQueryDto,
  PreSubmitLaborAccidentReportCheckDto,
  SaveLaborAccidentReportDraftDto,
  SubmitLaborAccidentReportDto,
} from '../dtos/labor-accident-report.dto';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
  LaborAccidentReportListResponseDto,
  LaborAccidentReportResponseDto,
} from '../dtos/swagger-response.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserData } from '../decorators/current-user.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { Roles } from '../decorators/roles.decorator';
import { Business } from '../entities/business.entity';
import { BusinessType } from '../entities/business-type.entity';
import {
  LaborAccidentCatalog,
  LaborAccidentCatalogType,
} from '../entities/labor-accident-catalog.entity';
import {
  LaborAccidentReportAuditAction,
  LaborAccidentReportAuditLog,
} from '../entities/labor-accident-report-audit-log.entity';
import {
  LaborAccidentReportAttachment,
  LaborAccidentReportAttachmentType,
} from '../entities/labor-accident-report-attachment.entity';
import {
  LaborAccidentReportDetail,
  LaborAccidentReportDetailSection,
} from '../entities/labor-accident-report-detail.entity';
import {
  LaborAccidentReport,
  LaborAccidentReportStatus,
} from '../entities/labor-accident-report.entity';
import {
  LaborAccidentReportPeriod,
  LaborAccidentReportPeriodType,
} from '../entities/labor-accident-report-period.entity';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesGuard } from '../guards/roles.guard';
import { CloudinaryService } from './cloudinary.service';

const PERIOD_TYPE_LABELS: Record<LaborAccidentReportPeriodType, string> = {
  [LaborAccidentReportPeriodType.FULL_YEAR]: 'Cả năm',
  [LaborAccidentReportPeriodType.SIX_MONTHS]: '6 tháng',
};

const REPORT_STATUS_LABELS: Record<LaborAccidentReportStatus, string> = {
  [LaborAccidentReportStatus.DRAFT]: 'Đang báo cáo',
  [LaborAccidentReportStatus.SUBMITTED]: 'Đang chờ duyệt',
  [LaborAccidentReportStatus.RECEIVED]: 'Đã tiếp nhận',
  [LaborAccidentReportStatus.REJECTED]: 'Từ chối phê duyệt',
};

const REPORT_AUDIT_ACTION_LABELS: Record<
  LaborAccidentReportAuditAction,
  string
> = {
  [LaborAccidentReportAuditAction.CREATE_DRAFT]: 'Tạo nháp báo cáo',
  [LaborAccidentReportAuditAction.UPDATE_DRAFT]: 'Cập nhật nháp báo cáo',
  [LaborAccidentReportAuditAction.SUBMIT]: 'Gửi báo cáo',
  [LaborAccidentReportAuditAction.RESUBMIT]: 'Gửi lại báo cáo',
  [LaborAccidentReportAuditAction.RECEIVE]: 'Tiếp nhận báo cáo',
  [LaborAccidentReportAuditAction.REJECT]: 'Từ chối báo cáo',
  [LaborAccidentReportAuditAction.BACKFILL]: 'Khởi tạo lịch sử',
};

type DetailPayload = {
  section?: unknown;
  orderNo?: unknown;
  accidentCauseCatalogId?: unknown;
  injuryFactorCatalogId?: unknown;
  occupationCatalogId?: unknown;
  note?: unknown;
  totalAccidents?: unknown;
  fatalAccidents?: unknown;
  accidentsWithTwoOrMoreVictims?: unknown;
  totalVictims?: unknown;
  femaleVictims?: unknown;
  deathVictims?: unknown;
  severeInjuryVictims?: unknown;
  victimsNotUnderManagement?: unknown;
  femaleVictimsNotUnderManagement?: unknown;
  deathVictimsNotUnderManagement?: unknown;
  severeInjuryVictimsNotUnderManagement?: unknown;
  medicalCost?: unknown;
  salaryPaymentCost?: unknown;
  allowanceCost?: unknown;
  totalCost?: unknown;
  daysOff?: unknown;
  propertyDamage?: unknown;
};

type NormalizedDetailPayload = Omit<
  Partial<LaborAccidentReportDetail>,
  'id' | 'report' | 'createdAt' | 'updatedAt'
>;

type ReportMetricTotals = {
  totalAccidents: number;
  fatalAccidents: number;
  accidentsWithTwoOrMoreVictims: number;
  totalVictims: number;
  femaleVictims: number;
  deathVictims: number;
  severeInjuryVictims: number;
  victimsNotUnderManagement: number;
  femaleVictimsNotUnderManagement: number;
  deathVictimsNotUnderManagement: number;
  severeInjuryVictimsNotUnderManagement: number;
  medicalCost: number;
  salaryPaymentCost: number;
  allowanceCost: number;
  totalCost: number;
  totalDaysOff: number;
  propertyDamage: number;
};

type SummaryCatalogRow = {
  catalog: {
    id: number;
    type: LaborAccidentCatalogType;
    code: string;
    name: string;
    level: number;
  };
  totals: ReportMetricTotals;
};

type OfficeExportFormat = 'excel' | 'word';

type OfficeExportFile = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

type ReportPeriodWindowStatus = 'INACTIVE' | 'UPCOMING' | 'OPEN' | 'CLOSED';

type ReportPeriodAccess = {
  isEligible: boolean;
  windowStatus: ReportPeriodWindowStatus;
  canEdit: boolean;
  canSubmit: boolean;
  unavailableReason: string | null;
};

type DashboardReportStatus = LaborAccidentReportStatus | 'NOT_STARTED';

type DashboardWarningType =
  | 'OVERDUE_NOT_SUBMITTED'
  | 'NEARING_DEADLINE'
  | 'REJECTED_NOT_RESUBMITTED'
  | 'PENDING_RECEIVE';

type DashboardWarningSeverity = 'danger' | 'warning' | 'info';

type PreparedReportAttachment = {
  displayName: string;
  originalName: string;
  fileUrl: string;
  publicId: string;
  mimetype: string;
  size: number;
  resourceType: 'image' | 'raw' | 'video';
};

type CreateReportAuditLogInput = {
  report: LaborAccidentReport;
  action: LaborAccidentReportAuditAction;
  oldStatus?: LaborAccidentReportStatus | null;
  newStatus?: LaborAccidentReportStatus | null;
  actorUser?: User | null;
  actorNameSnapshot?: string | null;
  actorRoleSnapshot?: string | null;
  message?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

type PreSubmitCheckSeverity = 'success' | 'info' | 'warning' | 'danger';

type PreSubmitCheckLevel =
  | 'READY'
  | 'REVIEW_RECOMMENDED'
  | 'NEEDS_ATTENTION'
  | 'NEEDS_FIX';

type PreSubmitCheckCategory =
  | 'HARD_VALIDATION'
  | 'REJECTION_HISTORY'
  | 'ATTACHMENT'
  | 'METRIC_CONSISTENCY'
  | 'PREVIOUS_PERIOD'
  | 'COMPLETENESS';

type PreSubmitCheckTargetSection =
  | 'GENERAL'
  | 'SUMMARY'
  | 'DETAILS'
  | 'ATTACHMENT'
  | 'REVIEW';

type PreSubmitCheckItem = {
  code: string;
  severity: PreSubmitCheckSeverity;
  category: PreSubmitCheckCategory;
  title: string;
  message: string;
  suggestion?: string;
  targetStep?: number;
  targetSection?: PreSubmitCheckTargetSection;
  blocking: boolean;
  metadata?: Record<string, unknown>;
};

type RejectionReasonTopic =
  | 'FILE'
  | 'METRIC'
  | 'PERIOD'
  | 'SIGNATURE'
  | 'UNCLEAR'
  | 'GENERAL';

type RejectionReasonAnalysis = {
  topic: RejectionReasonTopic;
  isClear: boolean;
  suggestion: string;
};

const DASHBOARD_STATUS_LABELS: Record<DashboardReportStatus, string> = {
  NOT_STARTED: 'Chưa tạo báo cáo',
  [LaborAccidentReportStatus.DRAFT]: 'Đang báo cáo',
  [LaborAccidentReportStatus.SUBMITTED]: 'Đang chờ duyệt',
  [LaborAccidentReportStatus.RECEIVED]: 'Đã tiếp nhận',
  [LaborAccidentReportStatus.REJECTED]: 'Từ chối phê duyệt',
};

const DASHBOARD_WARNING_DEFINITIONS: Record<
  DashboardWarningType,
  {
    label: string;
    severity: DashboardWarningSeverity;
    sortOrder: number;
  }
> = {
  OVERDUE_NOT_SUBMITTED: {
    label: 'Quá hạn chưa gửi báo cáo',
    severity: 'danger',
    sortOrder: 1,
  },
  REJECTED_NOT_RESUBMITTED: {
    label: 'Bị từ chối nhưng chưa gửi lại',
    severity: 'danger',
    sortOrder: 2,
  },
  NEARING_DEADLINE: {
    label: 'Sắp hết hạn gửi báo cáo',
    severity: 'warning',
    sortOrder: 3,
  },
  PENDING_RECEIVE: {
    label: 'Đang chờ Sở tiếp nhận',
    severity: 'info',
    sortOrder: 4,
  },
};

function sendOfficeExport(response: any, file: OfficeExportFile) {
  const asciiFilename = file.filename.replace(/[^\x20-\x7E]/g, '_');
  const encodedFilename = encodeURIComponent(file.filename);

  response.setHeader('Content-Type', file.contentType);
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
  );
  response.setHeader('Content-Length', file.buffer.length);
  response.send(file.buffer);
}

@Injectable()
export class LaborAccidentReportService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,

    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(LaborAccidentCatalog)
    private readonly catalogRepository: Repository<LaborAccidentCatalog>,

    @InjectRepository(LaborAccidentReportAuditLog)
    private readonly reportAuditLogRepository: Repository<LaborAccidentReportAuditLog>,

    @InjectRepository(LaborAccidentReport)
    private readonly reportRepository: Repository<LaborAccidentReport>,

    @InjectRepository(LaborAccidentReportPeriod)
    private readonly reportPeriodRepository: Repository<LaborAccidentReportPeriod>,
  ) {}

  async getMyReports(
    userId: number,
    query: ListMyLaborAccidentReportsQueryDto,
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.business', 'business')
      .leftJoinAndSelect('report.reportPeriod', 'reportPeriod')
      .leftJoinAndSelect('report.attachments', 'attachment')
      .where('business.id = :businessId', { businessId: business.id });

    if (query.year?.trim()) {
      queryBuilder.andWhere('reportPeriod.year = :year', {
        year: this.normalizeYear(query.year),
      });
    }

    if (query.periodType) {
      queryBuilder.andWhere('reportPeriod.periodType = :periodType', {
        periodType: query.periodType,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('report.status = :status', {
        status: query.status,
      });
    }

    const [reports, totalItems] = await queryBuilder
      .orderBy('reportPeriod.year', 'DESC')
      .addOrderBy('reportPeriod.startDate', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      message: 'Lấy danh sách báo cáo tai nạn lao động thành công',
      data: {
        items: reports.map((report) => this.mapReport(report, false)),
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

  async getMyReportDetail(userId: number, reportId: number) {
    const business = await this.findBusinessByAccountUserId(userId);
    const report = await this.findReportByIdForBusiness(reportId, business.id);

    return {
      message: 'Lấy chi tiết báo cáo tai nạn lao động thành công',
      data: this.mapReport(report, true),
    };
  }

  async getMyReportAuditLogs(userId: number, reportId: number) {
    const business = await this.findBusinessByAccountUserId(userId);
    const report = await this.findReportByIdForBusiness(reportId, business.id);

    return this.getReportAuditLogsResponse(report.id);
  }

  async getMyAvailableReportPeriods(userId: number) {
    const business = await this.findBusinessByAccountUserId(userId);
    const reportPeriods = await this.reportPeriodRepository.find({
      where: {
        isActive: true,
      },
      order: {
        year: 'DESC',
        startDate: 'DESC',
        id: 'DESC',
      },
    });

    const items = reportPeriods
      .filter((reportPeriod) =>
        this.isBusinessEligibleForReportPeriod(business, reportPeriod),
      )
      .map((reportPeriod) => ({
        id: reportPeriod.id,
        reportName: reportPeriod.reportName,
        year: reportPeriod.year,
        periodType: reportPeriod.periodType,
        periodTypeLabel: PERIOD_TYPE_LABELS[reportPeriod.periodType],
        startDate: this.formatDateInput(reportPeriod.startDate),
        endDate: this.formatDateInput(reportPeriod.endDate),
        isActive: reportPeriod.isActive,
        ...this.getReportPeriodAccess(business, reportPeriod),
      }));

    return {
      message: 'Lấy danh sách kỳ báo cáo dành cho doanh nghiệp thành công',
      data: {
        items,
      },
    };
  }

  async saveDraft(
    userId: number,
    body: SaveLaborAccidentReportDraftDto,
    files: Express.Multer.File[] = [],
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    const user = await this.findUser(userId);
    const reportPeriod = await this.findReportPeriod(body.reportPeriodId);
    this.assertBusinessCanWriteReport(business, reportPeriod);
    const existingReport = await this.findReportByBusinessAndPeriod(
      business.id,
      reportPeriod.id,
    );

    if (
      existingReport &&
      existingReport.status !== LaborAccidentReportStatus.DRAFT &&
      existingReport.status !== LaborAccidentReportStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Chỉ được cập nhật báo cáo đang trong trạng thái nháp hoặc bị từ chối phê duyệt',
      );
    }

    const normalizedDetails = await this.normalizeDetails(body.details);
    const preparedAttachments = await this.prepareAttachments(
      files,
      body.attachmentNames,
    );

    let savedReport: LaborAccidentReport;
    try {
      savedReport = await this.dataSource.transaction(async (manager) => {
        const lockedExistingReport = existingReport
          ? await manager
              .getRepository(LaborAccidentReport)
              .createQueryBuilder('draft_report')
              .setLock('pessimistic_write')
              .where('draft_report.id = :reportId', {
                reportId: existingReport.id,
              })
              .andWhere('draft_report.business_id = :businessId', {
                businessId: business.id,
              })
              .getOne()
          : null;

        if (
          lockedExistingReport &&
          lockedExistingReport.status !== LaborAccidentReportStatus.DRAFT &&
          lockedExistingReport.status !== LaborAccidentReportStatus.REJECTED
        ) {
          throw new BadRequestException(
            'Chá»‰ Ä‘Æ°á»£c cáº­p nháº­t bÃ¡o cÃ¡o Ä‘ang trong tráº¡ng thÃ¡i nhÃ¡p hoáº·c bá»‹ tá»« chá»‘i phÃª duyá»‡t',
          );
        }

        const report = this.createPersistableReport(
          lockedExistingReport ?? existingReport,
          manager,
        );

        this.assignReportPayload(report, body, business, reportPeriod, user);
        this.validateReportAgainstDetails(
          report,
          normalizedDetails ?? existingReport?.details ?? [],
        );

        const persistedReport = await manager.save(LaborAccidentReport, report);

        if (normalizedDetails) {
          await manager.delete(LaborAccidentReportDetail, {
            report: { id: persistedReport.id },
          });

          for (const detail of normalizedDetails) {
            await manager.save(
              LaborAccidentReportDetail,
              manager.create(LaborAccidentReportDetail, {
                ...detail,
                report: persistedReport,
              }),
            );
          }
        }

        await this.persistPreparedAttachments(
          persistedReport,
          user,
          preparedAttachments,
          manager,
        );

        await this.createReportAuditLog(
          {
            report: persistedReport,
            action: lockedExistingReport || existingReport
              ? LaborAccidentReportAuditAction.UPDATE_DRAFT
              : LaborAccidentReportAuditAction.CREATE_DRAFT,
            oldStatus:
              lockedExistingReport?.status ?? existingReport?.status ?? null,
            newStatus:
              persistedReport.status ?? LaborAccidentReportStatus.DRAFT,
            actorUser: user,
            metadata: {
              reportPeriodId: reportPeriod.id,
              reportPeriodYear: reportPeriod.year,
              reportPeriodType: reportPeriod.periodType,
              attachmentUploadCount: preparedAttachments.length,
            },
          },
          manager,
        );

        return persistedReport;
      });
    } catch (error) {
      await this.cleanupPreparedAttachments(preparedAttachments);
      throw error;
    }

    const reportWithRelations = await this.findReportByIdForBusiness(
      savedReport.id,
      business.id,
    );

    return {
      message: 'Lưu nháp báo cáo tai nạn lao động thành công',
      data: this.mapReport(reportWithRelations, true),
    };
  }

  async submitReport(
    userId: number,
    reportId: number,
    body: SubmitLaborAccidentReportDto,
    files: Express.Multer.File[] = [],
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    const user = await this.findUser(userId);
    const report = await this.findReportByIdForBusiness(reportId, business.id);

    if (report.status === LaborAccidentReportStatus.RECEIVED) {
      throw new BadRequestException('Báo cáo đã được Sở tiếp nhận');
    }

    if (report.status === LaborAccidentReportStatus.SUBMITTED) {
      throw new BadRequestException('Báo cáo đã được gửi');
    }

    const submittedPeriodId = this.normalizePositiveInteger(
      body.reportPeriodId,
      'Kỳ báo cáo',
    );
    if (submittedPeriodId !== report.reportPeriod.id) {
      throw new BadRequestException(
        'Không được thay đổi kỳ báo cáo khi gửi lại',
      );
    }

    this.assertBusinessCanWriteReport(business, report.reportPeriod);
    const normalizedDetails = await this.normalizeDetails(body.details);
    if (
      !normalizedDetails?.some(
        (detail) =>
          detail.section ===
          LaborAccidentReportDetailSection.ARTICLE_39_ALLOWANCE,
      )
    ) {
      throw new BadRequestException(
        'Dữ liệu chi tiết báo cáo không đầy đủ, vui lòng tải lại trang và gửi lại',
      );
    }
    const detailsToPersist = normalizedDetails;

    this.assignReportPayload(report, body, business, report.reportPeriod, user);
    this.validateReportAgainstDetails(report, detailsToPersist);
    report.details = detailsToPersist as LaborAccidentReportDetail[];
    this.validateReportReadyToLock(report);
    const preparedAttachments = await this.prepareAttachments(
      files,
      body.attachmentNames,
    );

    let savedReport: LaborAccidentReport;
    try {
      savedReport = await this.dataSource.transaction(async (manager) => {
        const lockedReport = await manager
          .getRepository(LaborAccidentReport)
          .createQueryBuilder('locked_report')
          .setLock('pessimistic_write')
          .where('locked_report.id = :reportId', { reportId })
          .andWhere('locked_report.business_id = :businessId', {
            businessId: business.id,
          })
          .getOne();

        if (!lockedReport) {
          throw new NotFoundException(
            'Không tìm thấy báo cáo tai nạn lao động',
          );
        }

        if (
          lockedReport.status !== LaborAccidentReportStatus.DRAFT &&
          lockedReport.status !== LaborAccidentReportStatus.REJECTED
        ) {
          throw new BadRequestException(
            lockedReport.status === LaborAccidentReportStatus.RECEIVED
              ? 'Báo cáo đã được Sở tiếp nhận'
              : 'Báo cáo đã được gửi',
          );
        }

        const oldStatus = lockedReport.status;
        const reportToSave = this.createPersistableReport(
          lockedReport,
          manager,
        );

        this.assignReportPayload(
          reportToSave,
          body,
          business,
          report.reportPeriod,
          user,
        );

        const persistedReport = await manager.save(
          LaborAccidentReport,
          reportToSave,
        );

        await manager.delete(LaborAccidentReportDetail, {
          report: { id: persistedReport.id },
        });

        for (const detail of detailsToPersist) {
          await manager.save(
            LaborAccidentReportDetail,
            manager.create(LaborAccidentReportDetail, {
              ...detail,
              report: persistedReport,
            }),
          );
        }

        await this.persistPreparedAttachments(
          persistedReport,
          user,
          preparedAttachments,
          manager,
        );

        const attachmentCount = await manager
          .createQueryBuilder(LaborAccidentReportAttachment, 'attachment')
          .where('attachment.report_id = :reportId', {
            reportId: persistedReport.id,
          })
          .andWhere('attachment.type = :type', {
            type: LaborAccidentReportAttachmentType.STAMPED_REPORT,
          })
          .andWhere('attachment.is_current = true')
          .getCount();

        if (attachmentCount !== 1) {
          throw new BadRequestException(
            'Báo cáo phải có đúng một file dấu mộc hiện hành trước khi gửi',
          );
        }

        persistedReport.status = LaborAccidentReportStatus.SUBMITTED;
        persistedReport.submittedAt = new Date();
        persistedReport.submittedByUser = user;
        persistedReport.rejectReason = null;

        const submittedReport = await manager.save(
          LaborAccidentReport,
          persistedReport,
        );

        await this.createReportAuditLog(
          {
            report: submittedReport,
            action:
              oldStatus === LaborAccidentReportStatus.REJECTED
                ? LaborAccidentReportAuditAction.RESUBMIT
                : LaborAccidentReportAuditAction.SUBMIT,
            oldStatus,
            newStatus: LaborAccidentReportStatus.SUBMITTED,
            actorUser: user,
            metadata: {
              reportPeriodId: report.reportPeriod.id,
              reportPeriodYear: report.reportPeriod.year,
              reportPeriodType: report.reportPeriod.periodType,
              attachmentUploadCount: preparedAttachments.length,
              isResubmission: oldStatus === LaborAccidentReportStatus.REJECTED,
            },
          },
          manager,
        );

        return submittedReport;
      });
    } catch (error) {
      await this.cleanupPreparedAttachments(preparedAttachments);
      throw error;
    }

    const reportWithRelations = await this.findReportByIdForBusiness(
      savedReport.id,
      business.id,
    );

    return {
      message: 'Gửi báo cáo tai nạn lao động thành công',
      data: this.mapReport(reportWithRelations, true),
    };
  }

  async checkReportBeforeSubmit(
    userId: number,
    reportId: number,
    body: PreSubmitLaborAccidentReportCheckDto,
    files: Express.Multer.File[] = [],
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    const user = await this.findUser(userId);
    const report = await this.findReportByIdForBusiness(reportId, business.id);
    const checkItems: PreSubmitCheckItem[] = [];

    if (report.status === LaborAccidentReportStatus.RECEIVED) {
      this.addPreSubmitIssue(checkItems, {
        code: 'REPORT_ALREADY_RECEIVED',
        severity: 'danger',
        category: 'HARD_VALIDATION',
        title: 'Báo cáo đã được Sở tiếp nhận',
        message:
          'Báo cáo này đã được tiếp nhận nên không thể chỉnh sửa hoặc gửi lại.',
        suggestion:
          'Nếu cần điều chỉnh, vui lòng liên hệ cán bộ phụ trách để được hướng dẫn.',
        targetStep: 4,
        targetSection: 'REVIEW',
        blocking: true,
      });
    } else if (report.status === LaborAccidentReportStatus.SUBMITTED) {
      this.addPreSubmitIssue(checkItems, {
        code: 'REPORT_ALREADY_SUBMITTED',
        severity: 'danger',
        category: 'HARD_VALIDATION',
        title: 'Báo cáo đã được gửi',
        message:
          'Báo cáo này đang chờ Sở xử lý nên không thể gửi thêm một lần nữa.',
        suggestion:
          'Vui lòng chờ Sở tiếp nhận hoặc từ chối trước khi thực hiện thao tác tiếp theo.',
        targetStep: 4,
        targetSection: 'REVIEW',
        blocking: true,
      });
    }

    try {
      const submittedPeriodId = this.normalizePositiveInteger(
        body.reportPeriodId,
        'Kỳ báo cáo',
      );

      if (submittedPeriodId !== report.reportPeriod.id) {
        this.addPreSubmitIssue(checkItems, {
          code: 'REPORT_PERIOD_CHANGED',
          severity: 'danger',
          category: 'HARD_VALIDATION',
          title: 'Kỳ báo cáo không khớp',
          message:
            'Dữ liệu gửi lên đang thuộc kỳ báo cáo khác với báo cáo hiện tại.',
          suggestion:
            'Vui lòng tải lại trang hoặc chọn đúng báo cáo trước khi gửi.',
          targetStep: 1,
          targetSection: 'GENERAL',
          blocking: true,
        });
      }
    } catch (error) {
      this.addBadRequestIssues(
        checkItems,
        error,
        'INVALID_REPORT_PERIOD',
        'Kỳ báo cáo không hợp lệ',
        1,
        'GENERAL',
      );
    }

    const access = this.getReportPeriodAccess(
      business,
      report.reportPeriod,
      report.status,
    );

    if (!access.canSubmit) {
      this.addPreSubmitIssue(checkItems, {
        code: 'REPORT_PERIOD_NOT_SUBMITTABLE',
        severity: 'danger',
        category: 'HARD_VALIDATION',
        title: 'Chưa đủ điều kiện gửi báo cáo',
        message:
          access.unavailableReason ||
          'Kỳ báo cáo hiện không cho phép chỉnh sửa hoặc gửi báo cáo.',
        suggestion:
          'Vui lòng kiểm tra trạng thái kỳ báo cáo hoặc liên hệ cán bộ phụ trách.',
        targetStep: 1,
        targetSection: 'GENERAL',
        blocking: true,
        metadata: {
          windowStatus: access.windowStatus,
          isEligible: access.isEligible,
        },
      });
    }

    const checkReport = this.createPersistableReport(report);
    let normalizedDetails: NormalizedDetailPayload[] = [];
    let canRunPayloadRules = true;

    try {
      const details = await this.normalizeDetails(body.details);

      if (
        !details?.some(
          (detail) =>
            detail.section ===
            LaborAccidentReportDetailSection.ARTICLE_39_ALLOWANCE,
        )
      ) {
        this.addPreSubmitIssue(checkItems, {
          code: 'REPORT_DETAILS_INCOMPLETE',
          severity: 'danger',
          category: 'HARD_VALIDATION',
          title: 'Dữ liệu chi tiết báo cáo chưa đầy đủ',
          message:
            'Báo cáo cần có đầy đủ dữ liệu chi tiết trước khi gửi cho Sở.',
          suggestion:
            'Vui lòng tải lại trang, kiểm tra các bước nhập liệu và thử gửi lại.',
          targetStep: 2,
          targetSection: 'DETAILS',
          blocking: true,
        });
      }

      normalizedDetails = details ?? [];
    } catch (error) {
      canRunPayloadRules = false;
      this.addBadRequestIssues(
        checkItems,
        error,
        'INVALID_REPORT_DETAILS',
        'Dữ liệu chi tiết báo cáo không hợp lệ',
        2,
        'DETAILS',
      );
    }

    if (canRunPayloadRules) {
      try {
        this.assignReportPayload(
          checkReport,
          body,
          business,
          report.reportPeriod,
          user,
        );
        this.validateReportAgainstDetails(checkReport, normalizedDetails);
        checkReport.details =
          normalizedDetails as unknown as LaborAccidentReportDetail[];
        this.validateReportReadyToLock(checkReport);
      } catch (error) {
        this.addBadRequestIssues(
          checkItems,
          error,
          'REPORT_HARD_VALIDATION_FAILED',
          'Báo cáo chưa đạt điều kiện gửi',
          2,
          'SUMMARY',
        );
      }
    }

    const currentAttachment = this.getCurrentStampedAttachment(report);
    const hasProspectiveAttachment = files.length > 0 || !!currentAttachment;

    if (!hasProspectiveAttachment) {
      this.addPreSubmitIssue(checkItems, {
        code: 'STAMPED_REPORT_ATTACHMENT_MISSING',
        severity: 'danger',
        category: 'HARD_VALIDATION',
        title: 'Thiếu file báo cáo có dấu mộc',
        message:
          'Báo cáo cần có một file đính kèm hiện hành trước khi gửi cho Sở.',
        suggestion:
          'Vui lòng tải lên file báo cáo đã kiểm tra đầy đủ trước khi gửi.',
        targetStep: 4,
        targetSection: 'ATTACHMENT',
        blocking: true,
      });
    }

    const lastRejectLog = await this.findLastRejectAuditLog(report.id);
    const rejectionAnalysis = this.analyzeRejectReason(
      lastRejectLog?.reason ?? report.rejectReason,
    );
    const previousReport = await this.findPreviousReportForBusiness(
      business.id,
      report,
    );

    this.collectAttachmentPreSubmitIssues(
      checkItems,
      report,
      files,
      currentAttachment,
      lastRejectLog,
      rejectionAnalysis,
    );
    this.collectRejectionHistoryPreSubmitIssues(
      checkItems,
      report,
      checkReport,
      lastRejectLog,
      rejectionAnalysis,
    );

    if (canRunPayloadRules) {
      this.collectSoftMetricPreSubmitIssues(
        checkItems,
        checkReport,
        normalizedDetails,
      );
      this.collectPreviousReportPreSubmitIssues(
        checkItems,
        checkReport,
        previousReport,
      );
    }

    if (!checkItems.length) {
      this.addPreSubmitIssue(checkItems, {
        code: 'REPORT_READY',
        severity: 'success',
        category: 'COMPLETENESS',
        title: 'Báo cáo đã sẵn sàng gửi',
        message:
          'Hệ thống chưa phát hiện điểm bất thường đáng chú ý trong dữ liệu hiện tại.',
        suggestion:
          'Bạn vẫn nên rà soát nhanh file đính kèm và số liệu trước khi xác nhận gửi.',
        targetStep: 4,
        targetSection: 'REVIEW',
        blocking: false,
      });
    }

    const readinessScore = this.calculatePreSubmitReadinessScore(checkItems);
    const level = this.getPreSubmitReadinessLevel(
      readinessScore,
      checkItems,
    );
    const blockingCount = checkItems.filter((item) => item.blocking).length;
    const warningCount = checkItems.filter(
      (item) => item.severity === 'warning',
    ).length;
    const dangerSoftCount = checkItems.filter(
      (item) => item.severity === 'danger' && !item.blocking,
    ).length;
    const infoCount = checkItems.filter((item) => item.severity === 'info')
      .length;

    return {
      message: 'Kiểm tra mềm trước khi gửi báo cáo thành công',
      data: {
        readinessScore,
        level,
        canSubmit: blockingCount === 0,
        requireConfirmation:
          blockingCount === 0 && (warningCount > 0 || dangerSoftCount > 0),
        checkedAt: new Date().toISOString(),
        summary: {
          totalItems: checkItems.length,
          blockingCount,
          dangerSoftCount,
          warningCount,
          infoCount,
          successCount: checkItems.filter((item) => item.severity === 'success')
            .length,
        },
        rejectionContext: lastRejectLog
          ? {
              rejectedAt: lastRejectLog.createdAt,
              reason: lastRejectLog.reason ?? report.rejectReason ?? null,
              actorName: lastRejectLog.actorNameSnapshot ?? null,
              topic: rejectionAnalysis.topic,
              isClear: rejectionAnalysis.isClear,
              suggestion: rejectionAnalysis.suggestion,
            }
          : null,
        previousReport: previousReport
          ? {
              id: previousReport.id,
              year: previousReport.reportPeriod.year,
              periodType: previousReport.reportPeriod.periodType,
              periodTypeLabel:
                PERIOD_TYPE_LABELS[previousReport.reportPeriod.periodType],
              status: previousReport.status,
              statusLabel: REPORT_STATUS_LABELS[previousReport.status],
              totalAccidents: Number(previousReport.totalAccidents) || 0,
              totalVictims: Number(previousReport.totalVictims) || 0,
              totalCost: Number(previousReport.totalCost) || 0,
              submittedAt: previousReport.submittedAt,
              receivedAt: previousReport.receivedAt,
            }
          : null,
        items: checkItems,
      },
    };
  }

  async receiveDepartmentReport(userId: number, reportId: number) {
    const user = await this.findUser(userId);
    const report = await this.findReportByIdForDepartment(reportId);

    if (report.status === LaborAccidentReportStatus.DRAFT) {
      throw new BadRequestException('Chỉ được tiếp nhận báo cáo đã được gửi');
    }

    if (report.status === LaborAccidentReportStatus.RECEIVED) {
      throw new BadRequestException('Báo cáo đã được Sở tiếp nhận');
    }

    if (report.status === LaborAccidentReportStatus.REJECTED) {
      throw new BadRequestException('Báo cáo đã bị từ chối phê duyệt');
    }

    this.validateReportReadyToLock(report);

    const oldStatus = report.status;
    const savedReport = await this.dataSource.transaction(async (manager) => {
      report.status = LaborAccidentReportStatus.RECEIVED;
      report.receivedAt = new Date();
      report.receivedByUser = user;

      const receivedReport = await manager.save(LaborAccidentReport, report);

      await this.createReportAuditLog(
        {
          report: receivedReport,
          action: LaborAccidentReportAuditAction.RECEIVE,
          oldStatus,
          newStatus: LaborAccidentReportStatus.RECEIVED,
          actorUser: user,
          metadata: {
            reportPeriodId: report.reportPeriod.id,
            reportPeriodYear: report.reportPeriod.year,
            reportPeriodType: report.reportPeriod.periodType,
          },
        },
        manager,
      );

      return receivedReport;
    });
    const reportWithRelations = await this.findReportByIdForDepartment(
      savedReport.id,
    );

    return {
      message: 'Tiếp nhận báo cáo tai nạn lao động thành công',
      data: this.mapReport(reportWithRelations, true),
    };
  }

  async getDepartmentReports(query: ListLaborAccidentReportsQueryDto) {
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.business', 'business')
      .leftJoinAndSelect('report.reportPeriod', 'reportPeriod')
      .leftJoinAndSelect('report.attachments', 'attachment')
      .where('1 = 1');

    this.applyDepartmentReportFilters(queryBuilder, query);

    const [reports, totalItems] = await queryBuilder
      .orderBy('reportPeriod.year', 'DESC')
      .addOrderBy('reportPeriod.startDate', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      message: 'Lấy danh sách báo cáo tai nạn lao động thành công',
      data: {
        items: reports.map((report) => this.mapReport(report, false)),
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

  async getDepartmentReportDetail(reportId: number) {
    const report = await this.findReportByIdForDepartment(reportId);

    return {
      message: 'Lấy chi tiết báo cáo tai nạn lao động thành công',
      data: this.mapReport(report, true),
    };
  }

  async getDepartmentReportAuditLogs(reportId: number) {
    const report = await this.findReportByIdForDepartment(reportId);

    return this.getReportAuditLogsResponse(report.id);
  }

  async getDepartmentReportDashboard(
    query: LaborAccidentReportDashboardQueryDto,
  ) {
    const reportPeriods = await this.findDashboardReportPeriods(query);
    const statusCounts = this.createDashboardStatusCounts();
    const warningCounts = this.createDashboardWarningCounts();
    const urgentBusinesses: Array<Record<string, unknown>> = [];
    const filters = this.mapDashboardFilters(query);

    if (!reportPeriods.length) {
      return {
        message: 'Lấy dashboard điều hành báo cáo TNLĐ thành công',
        data: {
          filters,
          generatedAt: new Date().toISOString(),
          reportPeriods: [],
          progress: this.mapDashboardProgress(statusCounts, 0, 0),
          byStatus: this.mapDashboardStatusCounts(statusCounts, 0),
          warningSummary: warningCounts,
          warnings: this.mapDashboardWarningCards(warningCounts),
          urgentBusinesses,
        },
      };
    }

    const reportPeriodIds = reportPeriods.map((reportPeriod) => reportPeriod.id);
    const businessQuery = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.businessTypeCatalog', 'businessTypeCatalog')
      .where('business.isActive = :isActive', { isActive: true });

    this.applyDashboardLocationFilters(businessQuery, query);

    const businesses = await businessQuery
      .orderBy('business.businessName', 'ASC')
      .getMany();

    const reportQuery = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.business', 'business')
      .leftJoinAndSelect('report.reportPeriod', 'reportPeriod')
      .where('reportPeriod.id IN (:...reportPeriodIds)', {
        reportPeriodIds,
      });

    this.applyDashboardLocationFilters(reportQuery, query);

    const reports = await reportQuery.getMany();
    const reportsByBusinessAndPeriod = new Map<string, LaborAccidentReport>();

    for (const report of reports) {
      if (!report.business?.id || !report.reportPeriod?.id) {
        continue;
      }

      reportsByBusinessAndPeriod.set(
        this.createDashboardReportKey(report.business.id, report.reportPeriod.id),
        report,
      );
    }

    let totalEligibleReportObligations = 0;
    let totalExistingReports = 0;

    const dashboardReportPeriods = reportPeriods.map((reportPeriod) => {
      const periodStatusCounts = this.createDashboardStatusCounts();
      const periodWarningCounts = this.createDashboardWarningCounts();
      let periodEligibleReportObligations = 0;
      let periodExistingReports = 0;

      for (const business of businesses) {
        if (!this.isBusinessEligibleForReportPeriod(business, reportPeriod)) {
          continue;
        }

        periodEligibleReportObligations++;
        totalEligibleReportObligations++;

        const report = reportsByBusinessAndPeriod.get(
          this.createDashboardReportKey(business.id, reportPeriod.id),
        );
        const dashboardStatus: DashboardReportStatus =
          report?.status ?? 'NOT_STARTED';

        if (report) {
          periodExistingReports++;
          totalExistingReports++;
        }

        statusCounts[dashboardStatus]++;
        periodStatusCounts[dashboardStatus]++;

        const warning = this.mapDashboardWarningBusiness(
          business,
          reportPeriod,
          report,
        );

        if (warning) {
          const warningType = warning.type as DashboardWarningType;
          warningCounts[warningType]++;
          periodWarningCounts[warningType]++;
          urgentBusinesses.push(warning);
        }
      }

      return {
        ...this.mapDashboardReportPeriod(reportPeriod),
        progress: this.mapDashboardProgress(
          periodStatusCounts,
          periodEligibleReportObligations,
          periodExistingReports,
        ),
        byStatus: this.mapDashboardStatusCounts(
          periodStatusCounts,
          periodEligibleReportObligations,
        ),
        warningSummary: periodWarningCounts,
        warnings: this.mapDashboardWarningCards(periodWarningCounts),
      };
    });

    return {
      message: 'Lấy dashboard điều hành báo cáo TNLĐ thành công',
      data: {
        filters,
        generatedAt: new Date().toISOString(),
        totalActiveBusinesses: businesses.length,
        reportPeriods: dashboardReportPeriods,
        progress: this.mapDashboardProgress(
          statusCounts,
          totalEligibleReportObligations,
          totalExistingReports,
        ),
        byStatus: this.mapDashboardStatusCounts(
          statusCounts,
          totalEligibleReportObligations,
        ),
        warningSummary: warningCounts,
        warnings: this.mapDashboardWarningCards(warningCounts),
        urgentBusinesses: this.sortDashboardWarnings(urgentBusinesses).slice(
          0,
          20,
        ),
      },
    };
  }

  async getDepartmentReportSummary(query: LaborAccidentReportSummaryQueryDto) {
    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.business', 'business')
      .leftJoinAndSelect('business.businessTypeCatalog', 'businessTypeCatalog')
      .leftJoinAndSelect('report.reportPeriod', 'reportPeriod')
      .leftJoinAndSelect('report.details', 'detail')
      .leftJoinAndSelect('detail.accidentCauseCatalog', 'accidentCauseCatalog')
      .leftJoinAndSelect('detail.injuryFactorCatalog', 'injuryFactorCatalog')
      .leftJoinAndSelect('detail.occupationCatalog', 'occupationCatalog')
      .where('1 = 1');

    this.applyDepartmentReportFilters(queryBuilder, query);

    const reports = await queryBuilder
      .orderBy('reportPeriod.year', 'DESC')
      .addOrderBy('reportPeriod.startDate', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .getMany();

    // Query active businesses count by type under the province/ward filters
    const businessQuery = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.businessTypeCatalog', 'businessTypeCatalog')
      .where('business.isActive = :isActive', { isActive: true });

    if (query.provinceCity?.trim()) {
      businessQuery.andWhere('LOWER(business.provinceCity) LIKE :provinceCity', {
        provinceCity: `%${query.provinceCity.toLowerCase()}%`,
      });
    }
    if (query.wardCommune?.trim()) {
      businessQuery.andWhere('LOWER(business.wardCommune) LIKE :wardCommune', {
        wardCommune: `%${query.wardCommune.toLowerCase()}%`,
      });
    }

    const businesses = await businessQuery.getMany();

    const businessCounts = {
      'Doanh nghiệp nhà nước': 0,
      'Công ty trách nhiệm hữu hạn': 0,
      'Công ty cổ phần': 0,
      'Công ty hợp danh': 0,
      'Doanh nghiệp tư nhân': 0,
      'Doanh nghiệp có vốn đầu tư nước ngoài': 0,
      'Đơn vị kinh tế tập thể': 0,
      'Đơn vị kinh tế cá thể': 0,
      'Đơn vị hành chính sự nghiệp, đảng, đoàn thể, hiệp hội': 0,
    };

    for (const b of businesses) {
      const typeName = b.businessTypeCatalog?.name || b.businessType || '';
      const category = this.classifyBusinessType(typeName);
      if (category in businessCounts) {
        businessCounts[category]++;
      }
    }

    const categoryMetrics = {
      'Doanh nghiệp nhà nước': this.createEmptyCategoryMetrics(),
      'Công ty trách nhiệm hữu hạn': this.createEmptyCategoryMetrics(),
      'Công ty cổ phần': this.createEmptyCategoryMetrics(),
      'Công ty hợp danh': this.createEmptyCategoryMetrics(),
      'Doanh nghiệp tư nhân': this.createEmptyCategoryMetrics(),
      'Doanh nghiệp có vốn đầu tư nước ngoài': this.createEmptyCategoryMetrics(),
      'Đơn vị kinh tế tập thể': this.createEmptyCategoryMetrics(),
      'Đơn vị kinh tế cá thể': this.createEmptyCategoryMetrics(),
      'Đơn vị hành chính sự nghiệp, đảng, đoàn thể, hiệp hội': this.createEmptyCategoryMetrics(),
    };

    const totals = this.createEmptyMetricTotals();
    const byAccidentCause = new Map<string, SummaryCatalogRow>();
    const byInjuryFactor = new Map<string, SummaryCatalogRow>();
    const byOccupation = new Map<string, SummaryCatalogRow>();
    const article39Allowance = this.createEmptyMetricTotals();

    for (const report of reports) {
      const typeName = report.business?.businessTypeCatalog?.name || report.business?.businessType || report.businessType || '';
      const category = this.classifyBusinessType(typeName);
      if (category in categoryMetrics) {
        const metrics = categoryMetrics[category];
        metrics.participatingBusinesses++;
        metrics.totalEmployees += Number(report.totalEmployees) || 0;
        metrics.participatingEmployees += Number(report.totalEmployees) || 0;
        metrics.femaleEmployees += Number(report.femaleEmployees) || 0;
        metrics.totalVictims += Number(report.totalVictims) || 0;
        metrics.deathVictims += Number(report.deathVictims) || 0;
        metrics.severeInjuryVictims += Number(report.severeInjuryVictims) || 0;
      }

      this.addReportTotals(totals, report);

      for (const detail of report.details ?? []) {
        if (detail.section === LaborAccidentReportDetailSection.ACCIDENT) {
          this.addCatalogSummaryRow(
            byAccidentCause,
            detail.accidentCauseCatalog,
            detail.accidentCauseCodeSnapshot,
            detail.accidentCauseNameSnapshot,
            detail,
          );
          this.addCatalogSummaryRow(
            byInjuryFactor,
            detail.injuryFactorCatalog,
            detail.injuryFactorCodeSnapshot,
            detail.injuryFactorNameSnapshot,
            detail,
          );
          this.addCatalogSummaryRow(
            byOccupation,
            detail.occupationCatalog,
            detail.occupationCodeSnapshot,
            detail.occupationNameSnapshot,
            detail,
          );
        }

        if (
          detail.section ===
          LaborAccidentReportDetailSection.ARTICLE_39_ALLOWANCE
        ) {
          this.addDetailTotals(article39Allowance, detail);
        }
      }
    }

    // Post-process category metrics
    for (const category of Object.keys(categoryMetrics)) {
      const metrics = categoryMetrics[category];
      metrics.totalBusinesses = businessCounts[category] || 0;
      if (metrics.participatingEmployees > 0) {
        metrics.ktnld = Math.round((metrics.totalVictims / metrics.participatingEmployees) * 1000 * 100) / 100;
        metrics.kchet = Math.round((metrics.deathVictims / metrics.participatingEmployees) * 1000 * 100) / 100;
      } else {
        metrics.ktnld = 0;
        metrics.kchet = 0;
      }
    }

    return {
      message: 'Lấy báo cáo tổng hợp tai nạn lao động thành công',
      data: {
        filters: this.mapSummaryFilters(query),
        reportCount: reports.length,
        totals,
        byBusinessType: categoryMetrics,
        byAccidentCause: this.mapSummaryCatalogRows(byAccidentCause),
        byInjuryFactor: this.mapSummaryCatalogRows(byInjuryFactor),
        byOccupation: this.mapSummaryCatalogRows(byOccupation),
        article39Allowance,
        damage: {
          totalDaysOff: totals.totalDaysOff,
          medicalCost: totals.medicalCost,
          salaryPaymentCost: totals.salaryPaymentCost,
          allowanceCost: totals.allowanceCost,
          totalCost: totals.totalCost,
          propertyDamage: totals.propertyDamage,
        },
      },
    };
  }

  private classifyBusinessType(name: string): string {
    const norm = (name || '').toLowerCase().trim();
    if (!norm) return 'Doanh nghiệp tư nhân';

    if (norm.includes('nhà nước') || norm.includes('nha nuoc') || norm.includes('quốc doanh')) {
      return 'Doanh nghiệp nhà nước';
    }
    if (norm.includes('nước ngoài') || norm.includes('nuoc ngoai') || norm.includes('fdi') || norm.includes('liên doanh')) {
      return 'Doanh nghiệp có vốn đầu tư nước ngoài';
    }
    if (norm.includes('tập thể') || norm.includes('tap the') || norm.includes('hợp tác xã') || norm.includes('htx')) {
      return 'Đơn vị kinh tế tập thể';
    }
    if (norm.includes('cá thể') || norm.includes('ca the') || norm.includes('hộ kinh doanh') || norm.includes('ho kinh doanh') || norm.includes('cá nhân') || norm.includes('hộ gia đình')) {
      return 'Đơn vị kinh tế cá thể';
    }
    if (
      norm.includes('hành chính') ||
      norm.includes('hanh chinh') ||
      norm.includes('sự nghiệp') ||
      norm.includes('su nghiep') ||
      norm.includes('đảng') ||
      norm.includes('dang') ||
      norm.includes('đoàn thể') ||
      norm.includes('doan the') ||
      norm.includes('hiệp hội') ||
      norm.includes('hiep hoi') ||
      norm.includes('ủy ban') ||
      norm.includes('uy ban') ||
      norm.includes('cơ quan') ||
      norm.includes('sở') ||
      norm.includes('phòng') ||
      norm.includes('ban') ||
      norm.includes('bệnh viện') ||
      norm.includes('trường')
    ) {
      return 'Đơn vị hành chính sự nghiệp, đảng, đoàn thể, hiệp hội';
    }
    if (norm.includes('cổ phần') || norm.includes('co phan')) {
      return 'Công ty cổ phần';
    }
    if (norm.includes('trách nhiệm hữu hạn') || norm.includes('trach nhiem huu han') || norm.includes('tnhh')) {
      return 'Công ty trách nhiệm hữu hạn';
    }
    if (norm.includes('hợp danh') || norm.includes('hop danh')) {
      return 'Công ty hợp danh';
    }
    if (norm.includes('tư nhân') || norm.includes('tu nhan') || norm.includes('dntn')) {
      return 'Doanh nghiệp tư nhân';
    }
    return 'Doanh nghiệp tư nhân';
  }

  private createEmptyCategoryMetrics() {
    return {
      totalBusinesses: 0,
      participatingBusinesses: 0,
      totalEmployees: 0,
      participatingEmployees: 0,
      femaleEmployees: 0,
      totalVictims: 0,
      deathVictims: 0,
      severeInjuryVictims: 0,
      ktnld: 0,
      kchet: 0,
    };
  }

  async exportMyReport(
    userId: number,
    reportId: number,
    format: OfficeExportFormat,
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    const report = await this.findReportByIdForBusiness(reportId, business.id);

    return this.createOfficeFile(
      this.buildReportOfficeHtml(this.mapReport(report, true)),
      this.createReportFilename(report, format),
      format,
    );
  }

  async exportDepartmentReport(reportId: number, format: OfficeExportFormat) {
    const report = await this.findReportByIdForDepartment(reportId);

    return this.createOfficeFile(
      this.buildReportOfficeHtml(this.mapReport(report, true)),
      this.createReportFilename(report, format),
      format,
    );
  }

  async exportDepartmentSummary(
    query: LaborAccidentReportSummaryQueryDto,
    format: OfficeExportFormat,
  ) {
    const summaryResponse = await this.getDepartmentReportSummary(query);

    return this.createOfficeFile(
      this.buildSummaryOfficeHtml(summaryResponse.data),
      `bao-cao-tong-hop-tnld.${format === 'excel' ? 'xls' : 'doc'}`,
      format,
    );
  }

  private async findBusinessByAccountUserId(userId: number) {
    const business = await this.businessRepository.findOne({
      where: {
        accountUser: { id: userId },
      },
      relations: {
        accountUser: true,
      },
    });

    if (!business) {
      throw new NotFoundException(
        'Không tìm thấy doanh nghiệp của tài khoản đang đăng nhập',
      );
    }

    return business;
  }

  private async findUser(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản đang đăng nhập');
    }

    return user;
  }

  private async getReportAuditLogsResponse(reportId: number) {
    const logs = await this.reportAuditLogRepository.find({
      where: {
        report: { id: reportId },
      },
      relations: {
        actorUser: true,
      },
      order: {
        createdAt: 'ASC',
        id: 'ASC',
      },
    });

    return {
      message: 'Lấy lịch sử xử lý báo cáo thành công',
      data: {
        reportId,
        items: logs.map((log) => this.mapReportAuditLog(log)),
      },
    };
  }

  private async createReportAuditLog(
    input: CreateReportAuditLogInput,
    manager?: EntityManager,
  ) {
    const repository =
      manager?.getRepository(LaborAccidentReportAuditLog) ??
      this.reportAuditLogRepository;
    const actorName =
      input.actorNameSnapshot ??
      this.getAuditActorName(input.actorUser) ??
      'Hệ thống';
    const actorRole =
      input.actorRoleSnapshot ?? this.getAuditActorRole(input.actorUser);
    const log = repository.create({
      report: { id: input.report.id } as LaborAccidentReport,
      action: input.action,
      oldStatus: input.oldStatus ?? null,
      newStatus: input.newStatus ?? null,
      actorUser: input.actorUser
        ? ({ id: input.actorUser.id } as User)
        : null,
      actorNameSnapshot: actorName,
      actorRoleSnapshot: actorRole,
      message:
        input.message ??
        this.buildReportAuditMessage(input.action, actorName),
      reason: input.reason ?? null,
      metadata: input.metadata ?? {},
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    });

    return repository.save(log);
  }

  private getAuditActorName(user: User | null | undefined) {
    if (!user) {
      return null;
    }

    return user.fullName || user.username || null;
  }

  private getAuditActorRole(user: User | null | undefined) {
    const roles = user?.userRoles
      ?.map((userRole) => userRole.role?.name || userRole.role?.code)
      .filter(Boolean);

    if (roles?.length) {
      return roles.join(', ');
    }

    if (user?.accountType === 'BUSINESS') {
      return 'Doanh nghiệp';
    }

    if (user?.accountType === 'DEPARTMENT') {
      return 'Sở';
    }

    return 'Hệ thống';
  }

  private buildReportAuditMessage(
    action: LaborAccidentReportAuditAction,
    actorName: string,
  ) {
    if (action === LaborAccidentReportAuditAction.CREATE_DRAFT) {
      return `${actorName} đã tạo nháp báo cáo`;
    }

    if (action === LaborAccidentReportAuditAction.UPDATE_DRAFT) {
      return `${actorName} đã cập nhật nháp báo cáo`;
    }

    if (action === LaborAccidentReportAuditAction.SUBMIT) {
      return `${actorName} đã gửi báo cáo`;
    }

    if (action === LaborAccidentReportAuditAction.RESUBMIT) {
      return `${actorName} đã gửi lại báo cáo`;
    }

    if (action === LaborAccidentReportAuditAction.RECEIVE) {
      return `${actorName} đã tiếp nhận báo cáo`;
    }

    if (action === LaborAccidentReportAuditAction.REJECT) {
      return `${actorName} đã từ chối báo cáo`;
    }

    return 'Hệ thống đã khởi tạo lịch sử xử lý báo cáo';
  }

  private mapReportAuditLog(log: LaborAccidentReportAuditLog) {
    return {
      id: log.id,
      action: log.action,
      actionLabel: REPORT_AUDIT_ACTION_LABELS[log.action],
      oldStatus: log.oldStatus,
      oldStatusLabel: log.oldStatus
        ? REPORT_STATUS_LABELS[log.oldStatus]
        : null,
      newStatus: log.newStatus,
      newStatusLabel: log.newStatus
        ? REPORT_STATUS_LABELS[log.newStatus]
        : null,
      actorUserId: log.actorUser?.id ?? null,
      actorName: log.actorNameSnapshot || log.actorUser?.fullName || null,
      actorRole: log.actorRoleSnapshot,
      message: log.message,
      reason: log.reason,
      metadata: log.metadata ?? {},
      createdAt: log.createdAt,
    };
  }

  private async findReportPeriod(value: string | number) {
    const reportPeriodId = this.normalizePositiveInteger(value, 'Kỳ báo cáo');
    const reportPeriod = await this.reportPeriodRepository.findOne({
      where: {
        id: reportPeriodId,
      },
    });

    if (!reportPeriod) {
      throw new BadRequestException('Kỳ báo cáo không tồn tại');
    }

    return reportPeriod;
  }

  private async findDashboardReportPeriods(
    query: LaborAccidentReportDashboardQueryDto,
  ) {
    const queryBuilder = this.reportPeriodRepository
      .createQueryBuilder('reportPeriod')
      .where('1 = 1');

    if (query.reportPeriodId?.trim()) {
      queryBuilder.andWhere('reportPeriod.id = :reportPeriodId', {
        reportPeriodId: this.normalizePositiveInteger(
          query.reportPeriodId,
          'Kỳ báo cáo',
        ),
      });
    } else {
      const year = query.year?.trim()
        ? this.normalizeYear(query.year)
        : Number(this.getVietnamTodayKey().slice(0, 4));

      queryBuilder
        .andWhere('reportPeriod.year = :year', { year })
        .andWhere('reportPeriod.isActive = :isActive', { isActive: true });

      if (query.periodType) {
        queryBuilder.andWhere('reportPeriod.periodType = :periodType', {
          periodType: query.periodType,
        });
      }
    }

    return queryBuilder
      .orderBy('reportPeriod.year', 'DESC')
      .addOrderBy('reportPeriod.startDate', 'DESC')
      .addOrderBy('reportPeriod.id', 'DESC')
      .getMany();
  }

  private mapDashboardFilters(query: LaborAccidentReportDashboardQueryDto) {
    const reportPeriodId = query.reportPeriodId?.trim()
      ? this.normalizePositiveInteger(query.reportPeriodId, 'Kỳ báo cáo')
      : null;

    return {
      reportPeriodId,
      year: query.year?.trim()
        ? this.normalizeYear(query.year)
        : reportPeriodId
          ? null
          : Number(this.getVietnamTodayKey().slice(0, 4)),
      periodType: query.periodType ?? null,
      periodTypeLabel: query.periodType
        ? PERIOD_TYPE_LABELS[query.periodType]
        : null,
      provinceCity: this.toTrimmedValue(query.provinceCity) ?? null,
      wardCommune: this.toTrimmedValue(query.wardCommune) ?? null,
    };
  }

  private applyDashboardLocationFilters(
    queryBuilder: SelectQueryBuilder<any>,
    query: LaborAccidentReportDashboardQueryDto,
  ) {
    if (query.provinceCity?.trim()) {
      queryBuilder.andWhere('LOWER(business.provinceCity) LIKE :provinceCity', {
        provinceCity: this.toLikeValue(query.provinceCity),
      });
    }

    if (query.wardCommune?.trim()) {
      queryBuilder.andWhere('LOWER(business.wardCommune) LIKE :wardCommune', {
        wardCommune: this.toLikeValue(query.wardCommune),
      });
    }
  }

  private createDashboardReportKey(businessId: number, reportPeriodId: number) {
    return `${businessId}:${reportPeriodId}`;
  }

  private createDashboardStatusCounts(): Record<DashboardReportStatus, number> {
    return {
      NOT_STARTED: 0,
      [LaborAccidentReportStatus.DRAFT]: 0,
      [LaborAccidentReportStatus.SUBMITTED]: 0,
      [LaborAccidentReportStatus.RECEIVED]: 0,
      [LaborAccidentReportStatus.REJECTED]: 0,
    };
  }

  private createDashboardWarningCounts(): Record<DashboardWarningType, number> {
    return {
      OVERDUE_NOT_SUBMITTED: 0,
      NEARING_DEADLINE: 0,
      REJECTED_NOT_RESUBMITTED: 0,
      PENDING_RECEIVE: 0,
    };
  }

  private mapDashboardReportPeriod(reportPeriod: LaborAccidentReportPeriod) {
    const today = this.getVietnamTodayKey();
    const startDate = this.toDateKey(reportPeriod.startDate);
    const endDate = this.toDateKey(reportPeriod.endDate);

    return {
      id: reportPeriod.id,
      reportName: reportPeriod.reportName,
      year: reportPeriod.year,
      periodType: reportPeriod.periodType,
      periodTypeLabel: PERIOD_TYPE_LABELS[reportPeriod.periodType],
      startDate,
      endDate,
      isActive: reportPeriod.isActive,
      windowStatus: this.getReportPeriodWindowStatus(reportPeriod),
      daysToStart: this.diffDateKeysInDays(today, startDate),
      daysToDeadline: this.diffDateKeysInDays(today, endDate),
    };
  }

  private mapDashboardProgress(
    statusCounts: Record<DashboardReportStatus, number>,
    totalEligibleReportObligations: number,
    totalExistingReports: number,
  ) {
    const submittedCount = statusCounts[LaborAccidentReportStatus.SUBMITTED];
    const receivedCount = statusCounts[LaborAccidentReportStatus.RECEIVED];
    const submittedOrReceivedCount = submittedCount + receivedCount;

    return {
      totalEligibleReportObligations,
      totalExistingReports,
      notStartedCount: statusCounts.NOT_STARTED,
      draftCount: statusCounts[LaborAccidentReportStatus.DRAFT],
      submittedCount,
      receivedCount,
      rejectedCount: statusCounts[LaborAccidentReportStatus.REJECTED],
      submittedOrReceivedCount,
      submittedRate: this.toDashboardPercent(
        submittedOrReceivedCount,
        totalEligibleReportObligations,
      ),
      receivedRate: this.toDashboardPercent(
        receivedCount,
        totalEligibleReportObligations,
      ),
      completionRate: this.toDashboardPercent(
        receivedCount,
        totalEligibleReportObligations,
      ),
    };
  }

  private mapDashboardStatusCounts(
    statusCounts: Record<DashboardReportStatus, number>,
    totalEligibleReportObligations: number,
  ) {
    const statuses: DashboardReportStatus[] = [
      'NOT_STARTED',
      LaborAccidentReportStatus.DRAFT,
      LaborAccidentReportStatus.SUBMITTED,
      LaborAccidentReportStatus.RECEIVED,
      LaborAccidentReportStatus.REJECTED,
    ];

    return statuses.map((status) => ({
      status,
      label: DASHBOARD_STATUS_LABELS[status],
      count: statusCounts[status],
      percentage: this.toDashboardPercent(
        statusCounts[status],
        totalEligibleReportObligations,
      ),
    }));
  }

  private mapDashboardWarningCards(
    warningCounts: Record<DashboardWarningType, number>,
  ) {
    return (Object.keys(DASHBOARD_WARNING_DEFINITIONS) as DashboardWarningType[])
      .sort(
        (first, second) =>
          DASHBOARD_WARNING_DEFINITIONS[first].sortOrder -
          DASHBOARD_WARNING_DEFINITIONS[second].sortOrder,
      )
      .map((type) => ({
        type,
        label: DASHBOARD_WARNING_DEFINITIONS[type].label,
        severity: DASHBOARD_WARNING_DEFINITIONS[type].severity,
        count: warningCounts[type],
      }));
  }

  private mapDashboardWarningBusiness(
    business: Business,
    reportPeriod: LaborAccidentReportPeriod,
    report?: LaborAccidentReport,
  ) {
    const status: DashboardReportStatus = report?.status ?? 'NOT_STARTED';
    const daysToDeadline = this.diffDateKeysInDays(
      this.getVietnamTodayKey(),
      this.toDateKey(reportPeriod.endDate),
    );
    const warningType = this.getDashboardPrimaryWarningType(
      reportPeriod,
      status,
      daysToDeadline,
    );

    if (!warningType) {
      return null;
    }

    const warningDefinition = DASHBOARD_WARNING_DEFINITIONS[warningType];

    return {
      type: warningType,
      label: warningDefinition.label,
      severity: warningDefinition.severity,
      sortOrder: warningDefinition.sortOrder,
      businessId: business.id,
      businessName: business.businessName,
      taxCode: business.taxCode,
      businessType:
        business.businessTypeCatalog?.name ?? business.businessType ?? null,
      provinceCity: business.provinceCity,
      wardCommune: business.wardCommune,
      reportId: report?.id ?? null,
      reportPeriodId: reportPeriod.id,
      reportName: reportPeriod.reportName,
      year: reportPeriod.year,
      periodType: reportPeriod.periodType,
      periodTypeLabel: PERIOD_TYPE_LABELS[reportPeriod.periodType],
      status,
      statusLabel: DASHBOARD_STATUS_LABELS[status],
      windowStatus: this.getReportPeriodWindowStatus(reportPeriod),
      daysToDeadline,
      submittedAt: report?.submittedAt ?? null,
      receivedAt: report?.receivedAt ?? null,
      rejectReason: report?.rejectReason ?? null,
    };
  }

  private getDashboardPrimaryWarningType(
    reportPeriod: LaborAccidentReportPeriod,
    status: DashboardReportStatus,
    daysToDeadline: number,
  ): DashboardWarningType | null {
    const windowStatus = this.getReportPeriodWindowStatus(reportPeriod);
    const isWaitingForBusinessAction =
      status === 'NOT_STARTED' ||
      status === LaborAccidentReportStatus.DRAFT ||
      status === LaborAccidentReportStatus.REJECTED;

    if (windowStatus === 'CLOSED' && isWaitingForBusinessAction) {
      return 'OVERDUE_NOT_SUBMITTED';
    }

    if (
      status === LaborAccidentReportStatus.REJECTED &&
      windowStatus === 'OPEN'
    ) {
      return 'REJECTED_NOT_RESUBMITTED';
    }

    if (
      windowStatus === 'OPEN' &&
      isWaitingForBusinessAction &&
      daysToDeadline >= 0 &&
      daysToDeadline <= 7
    ) {
      return 'NEARING_DEADLINE';
    }

    if (status === LaborAccidentReportStatus.SUBMITTED) {
      return 'PENDING_RECEIVE';
    }

    return null;
  }

  private sortDashboardWarnings(items: Array<Record<string, unknown>>) {
    return [...items].sort((first, second) => {
      const firstSortOrder =
        typeof first.sortOrder === 'number' ? first.sortOrder : 999;
      const secondSortOrder =
        typeof second.sortOrder === 'number' ? second.sortOrder : 999;

      if (firstSortOrder !== secondSortOrder) {
        return firstSortOrder - secondSortOrder;
      }

      const firstDaysToDeadline =
        typeof first.daysToDeadline === 'number'
          ? first.daysToDeadline
          : Number.MAX_SAFE_INTEGER;
      const secondDaysToDeadline =
        typeof second.daysToDeadline === 'number'
          ? second.daysToDeadline
          : Number.MAX_SAFE_INTEGER;

      if (firstDaysToDeadline !== secondDaysToDeadline) {
        return firstDaysToDeadline - secondDaysToDeadline;
      }

      return String(first.businessName ?? '').localeCompare(
        String(second.businessName ?? ''),
        'vi',
        { numeric: true },
      );
    });
  }

  private toDashboardPercent(value: number, total: number) {
    if (!total) {
      return 0;
    }

    return Math.round((value / total) * 10000) / 100;
  }

  private diffDateKeysInDays(fromDateKey: string, toDateKey: string) {
    const diff =
      this.toDateKeyTimestamp(toDateKey) - this.toDateKeyTimestamp(fromDateKey);

    return Math.round(diff / 86_400_000);
  }

  private toDateKeyTimestamp(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map(Number);

    return Date.UTC(year, month - 1, day);
  }

  private assertBusinessCanWriteReport(
    business: Business,
    reportPeriod: LaborAccidentReportPeriod,
  ) {
    const access = this.getReportPeriodAccess(business, reportPeriod);

    if (!access.canEdit) {
      throw new BadRequestException(
        access.unavailableReason ||
          'Kỳ báo cáo hiện không cho phép chỉnh sửa hoặc gửi báo cáo',
      );
    }
  }

  private getReportPeriodAccess(
    business: Business,
    reportPeriod: LaborAccidentReportPeriod,
    reportStatus?: LaborAccidentReportStatus,
  ): ReportPeriodAccess {
    const isEligible = this.isBusinessEligibleForReportPeriod(
      business,
      reportPeriod,
    );
    const windowStatus = this.getReportPeriodWindowStatus(reportPeriod);
    const statusAllowsWrite =
      !reportStatus ||
      reportStatus === LaborAccidentReportStatus.DRAFT ||
      reportStatus === LaborAccidentReportStatus.REJECTED;

    let unavailableReason: string | null = null;

    if (!isEligible) {
      unavailableReason =
        'Doanh nghiệp chưa hoạt động trong thời gian được tính cho kỳ báo cáo này';
    } else if (windowStatus === 'INACTIVE') {
      unavailableReason = 'Kỳ báo cáo hiện không hoạt động';
    } else if (windowStatus === 'UPCOMING') {
      unavailableReason = 'Chưa đến thời gian chỉnh sửa và gửi báo cáo';
    } else if (windowStatus === 'CLOSED') {
      unavailableReason = 'Đã hết thời gian chỉnh sửa và gửi báo cáo';
    } else if (!statusAllowsWrite) {
      unavailableReason =
        reportStatus === LaborAccidentReportStatus.SUBMITTED
          ? 'Báo cáo đã được gửi'
          : 'Báo cáo đã được Sở tiếp nhận';
    }

    const canWrite = isEligible && windowStatus === 'OPEN' && statusAllowsWrite;

    return {
      isEligible,
      windowStatus,
      canEdit: canWrite,
      canSubmit: canWrite,
      unavailableReason,
    };
  }

  private isBusinessEligibleForReportPeriod(
    business: Business,
    reportPeriod: LaborAccidentReportPeriod,
  ) {
    const businessStartDate = this.getBusinessStartDateKey(business);
    const coverageEndDate =
      reportPeriod.periodType === LaborAccidentReportPeriodType.SIX_MONTHS
        ? `${reportPeriod.year}-06-30`
        : `${reportPeriod.year}-12-31`;

    return businessStartDate <= coverageEndDate;
  }

  private getBusinessStartDateKey(business: Business) {
    if (business.licenseIssueDate) {
      return this.toDateKey(business.licenseIssueDate);
    }

    return this.toVietnamDateKey(business.createdAt);
  }

  private getReportPeriodWindowStatus(
    reportPeriod: LaborAccidentReportPeriod,
  ): ReportPeriodWindowStatus {
    if (!reportPeriod.isActive) {
      return 'INACTIVE';
    }

    const today = this.getVietnamTodayKey();
    const startDate = this.toDateKey(reportPeriod.startDate);
    const endDate = this.toDateKey(reportPeriod.endDate);

    if (today < startDate) {
      return 'UPCOMING';
    }

    if (today > endDate) {
      return 'CLOSED';
    }

    return 'OPEN';
  }

  private getVietnamTodayKey() {
    return this.toVietnamDateKey(new Date());
  }

  private toVietnamDateKey(value: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
    const partMap = new Map(parts.map((part) => [part.type, part.value]));

    return `${partMap.get('year')}-${partMap.get('month')}-${partMap.get('day')}`;
  }

  private toDateKey(value: Date | string) {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    return [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, '0'),
      String(value.getUTCDate()).padStart(2, '0'),
    ].join('-');
  }

  private createPersistableReport(
    source: LaborAccidentReport | null | undefined,
    manager?: EntityManager,
  ) {
    const repository =
      manager?.getRepository(LaborAccidentReport) ?? this.reportRepository;

    if (!source) {
      return repository.create();
    }

    const reportData: Partial<LaborAccidentReport> = { ...source };
    delete reportData.details;
    delete reportData.attachments;

    return repository.create(reportData);
  }

  private findReportByBusinessAndPeriod(businessId: number, periodId: number) {
    return this.reportRepository.findOne({
      where: {
        business: { id: businessId },
        reportPeriod: { id: periodId },
      },
      relations: {
        reportPeriod: true,
        business: true,
        details: {
          accidentCauseCatalog: true,
          injuryFactorCatalog: true,
          occupationCatalog: true,
        },
        attachments: true,
      },
      order: {
        details: {
          section: 'ASC',
          orderNo: 'ASC',
        },
        attachments: {
          isCurrent: 'DESC',
          version: 'DESC',
          id: 'DESC',
        },
      },
    });
  }

  private async findReportByIdForBusiness(
    reportId: number,
    businessId: number,
  ) {
    const report = await this.reportRepository.findOne({
      where: {
        id: reportId,
        business: { id: businessId },
      },
      relations: {
        business: true,
        reportPeriod: true,
        details: {
          accidentCauseCatalog: true,
          injuryFactorCatalog: true,
          occupationCatalog: true,
        },
        attachments: {
          uploadedByUser: true,
        },
        createdByUser: true,
        submittedByUser: true,
        receivedByUser: true,
      },
      order: {
        details: {
          section: 'ASC',
          orderNo: 'ASC',
        },
        attachments: {
          isCurrent: 'DESC',
          version: 'DESC',
          id: 'DESC',
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo tai nạn lao động');
    }

    return report;
  }

  private async findReportByIdForDepartment(reportId: number) {
    const report = await this.reportRepository.findOne({
      where: {
        id: reportId,
      },
      relations: {
        business: true,
        reportPeriod: true,
        details: {
          accidentCauseCatalog: true,
          injuryFactorCatalog: true,
          occupationCatalog: true,
        },
        attachments: {
          uploadedByUser: true,
        },
        createdByUser: true,
        submittedByUser: true,
        receivedByUser: true,
      },
      order: {
        details: {
          section: 'ASC',
          orderNo: 'ASC',
        },
        attachments: {
          isCurrent: 'DESC',
          version: 'DESC',
          id: 'DESC',
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo tai nạn lao động');
    }

    return report;
  }

  private applyDepartmentReportFilters(
    queryBuilder: SelectQueryBuilder<LaborAccidentReport>,
    query:
      | ListLaborAccidentReportsQueryDto
      | LaborAccidentReportSummaryQueryDto,
  ) {
    if (query.reportPeriodId?.trim()) {
      queryBuilder.andWhere('reportPeriod.id = :reportPeriodId', {
        reportPeriodId: this.normalizePositiveInteger(
          query.reportPeriodId,
          'Kỳ báo cáo',
        ),
      });
    }

    if (query.year?.trim()) {
      queryBuilder.andWhere('reportPeriod.year = :year', {
        year: this.normalizeYear(query.year),
      });
    }

    if (query.periodType) {
      queryBuilder.andWhere('reportPeriod.periodType = :periodType', {
        periodType: query.periodType,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('report.status = :status', {
        status: query.status,
      });
    } else {
      queryBuilder.andWhere('report.status != :draftStatus', {
        draftStatus: LaborAccidentReportStatus.DRAFT,
      });
    }

    if ('businessName' in query && query.businessName?.trim()) {
      queryBuilder.andWhere('LOWER(report.businessName) LIKE :businessName', {
        businessName: this.toLikeValue(query.businessName),
      });
    }

    if ('taxCode' in query && query.taxCode?.trim()) {
      queryBuilder.andWhere('LOWER(report.taxCode) LIKE :taxCode', {
        taxCode: this.toLikeValue(query.taxCode),
      });
    }

    if (query.provinceCity?.trim()) {
      queryBuilder.andWhere('LOWER(business.provinceCity) LIKE :provinceCity', {
        provinceCity: this.toLikeValue(query.provinceCity),
      });
    }

    if (query.wardCommune?.trim()) {
      queryBuilder.andWhere('LOWER(business.wardCommune) LIKE :wardCommune', {
        wardCommune: this.toLikeValue(query.wardCommune),
      });
    }
  }

  private assignReportPayload(
    report: LaborAccidentReport,
    body: SaveLaborAccidentReportDraftDto,
    business: Business,
    reportPeriod: LaborAccidentReportPeriod,
    user: User,
  ) {
    const medicalCost = this.normalizeMoney(
      body.medicalCost,
      report.medicalCost ?? 0,
      'Chi phí y tế',
    );
    const salaryPaymentCost = this.normalizeMoney(
      body.salaryPaymentCost,
      report.salaryPaymentCost ?? 0,
      'Chi phí trả lương trong thời gian điều trị',
    );
    const allowanceCost = this.normalizeMoney(
      body.allowanceCost,
      report.allowanceCost ?? 0,
      'Chi phí bồi thường trợ cấp',
    );

    report.business = business;
    report.reportPeriod = reportPeriod;
    report.rejectReason = null;
    report.businessName = business.businessName;
    report.taxCode = business.taxCode;
    report.businessType = business.businessType;
    report.industryCode = business.industryCode;
    report.industryName = business.industryName;
    report.totalEmployees = this.normalizeInteger(
      body.totalEmployees,
      report.totalEmployees ?? 0,
      'Tổng số lao động của cơ sở',
    );
    report.femaleEmployees = this.normalizeInteger(
      body.femaleEmployees,
      report.femaleEmployees ?? 0,
      'Tổng số lao động nữ',
    );
    report.totalPayroll = this.normalizeMoney(
      body.totalPayroll,
      report.totalPayroll ?? 0,
      'Tổng quỹ lương',
    );
    report.totalAccidents = this.normalizeInteger(
      body.totalAccidents,
      report.totalAccidents ?? 0,
      'Tổng số vụ tai nạn lao động',
    );
    report.fatalAccidents = this.normalizeInteger(
      body.fatalAccidents,
      report.fatalAccidents ?? 0,
      'Tổng số vụ có người chết',
    );
    report.accidentsWithTwoOrMoreVictims = this.normalizeInteger(
      body.accidentsWithTwoOrMoreVictims,
      report.accidentsWithTwoOrMoreVictims ?? 0,
      'Tổng số vụ có 2 người bị nạn trở lên',
    );
    report.totalVictims = this.normalizeInteger(
      body.totalVictims,
      report.totalVictims ?? 0,
      'Tổng số người bị nạn',
    );
    report.femaleVictims = this.normalizeInteger(
      body.femaleVictims,
      report.femaleVictims ?? 0,
      'Tổng số lao động nữ bị nạn',
    );
    report.deathVictims = this.normalizeInteger(
      body.deathVictims,
      report.deathVictims ?? 0,
      'Tổng số người bị chết',
    );
    report.severeInjuryVictims = this.normalizeInteger(
      body.severeInjuryVictims,
      report.severeInjuryVictims ?? 0,
      'Tổng số người bị thương nặng',
    );
    report.victimsNotUnderManagement = this.normalizeInteger(
      body.victimsNotUnderManagement,
      report.victimsNotUnderManagement ?? 0,
      'Số người bị nạn không thuộc quyền quản lý',
    );
    report.femaleVictimsNotUnderManagement = this.normalizeInteger(
      body.femaleVictimsNotUnderManagement,
      report.femaleVictimsNotUnderManagement ?? 0,
      'Lao động nữ bị nạn không thuộc quyền quản lý',
    );
    report.deathVictimsNotUnderManagement = this.normalizeInteger(
      body.deathVictimsNotUnderManagement,
      report.deathVictimsNotUnderManagement ?? 0,
      'Số người chết không thuộc quyền quản lý',
    );
    report.severeInjuryVictimsNotUnderManagement = this.normalizeInteger(
      body.severeInjuryVictimsNotUnderManagement,
      report.severeInjuryVictimsNotUnderManagement ?? 0,
      'Người bị thương nặng không thuộc quyền quản lý',
    );
    report.medicalCost = medicalCost;
    report.salaryPaymentCost = salaryPaymentCost;
    report.allowanceCost = allowanceCost;
    report.totalCost =
      body.totalCost === undefined
        ? medicalCost + salaryPaymentCost + allowanceCost
        : this.normalizeMoney(
            body.totalCost,
            report.totalCost ?? 0,
            'Tổng số tiền chi phí',
          );
    report.totalDaysOff = this.normalizeInteger(
      body.totalDaysOff,
      report.totalDaysOff ?? 0,
      'Tổng số ngày nghỉ vì TNLĐ',
    );
    report.propertyDamage = this.normalizeMoney(
      body.propertyDamage,
      report.propertyDamage ?? 0,
      'Thiệt hại tài sản',
    );
    this.validateReportMetrics(report);
    report.status = LaborAccidentReportStatus.DRAFT;
    report.createdByUser = report.createdByUser ?? user;
  }

  private async normalizeDetails(value: string | unknown[] | undefined) {
    if (value === undefined || value === '') {
      return undefined;
    }

    const parsedValue = this.parseDetails(value);
    const normalizedDetails: NormalizedDetailPayload[] = [];
    const detailKeys = new Set<string>();

    for (const [index, item] of parsedValue.entries()) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new BadRequestException(
          `Chi tiết báo cáo dòng ${index + 1} không hợp lệ`,
        );
      }

      const payload = item as DetailPayload;
      const section = this.normalizeDetailSection(payload.section, index);
      const orderNo = this.normalizePositiveInteger(
        payload.orderNo ?? index + 1,
        `Số thứ tự chi tiết dòng ${index + 1}`,
      );
      const key = `${section}:${orderNo}`;

      if (detailKeys.has(key)) {
        throw new BadRequestException(
          `Chi tiết báo cáo dòng ${index + 1} bị trùng mục và số thứ tự`,
        );
      }

      detailKeys.add(key);

      const accidentCauseCatalog = await this.findCatalogByType(
        payload.accidentCauseCatalogId,
        LaborAccidentCatalogType.ACCIDENT_CAUSE,
        'Nguyên nhân xảy ra TNLĐ',
      );
      const injuryFactorCatalog = await this.findCatalogByType(
        payload.injuryFactorCatalogId,
        LaborAccidentCatalogType.INJURY_FACTOR,
        'Yếu tố gây chấn thương',
      );
      const occupationCatalog = await this.findCatalogByType(
        payload.occupationCatalogId,
        LaborAccidentCatalogType.OCCUPATION,
        'Nghề nghiệp',
      );
      const medicalCost = this.normalizeMoney(
        payload.medicalCost,
        0,
        'Chi phí y tế',
      );
      const salaryPaymentCost = this.normalizeMoney(
        payload.salaryPaymentCost,
        0,
        'Chi phí trả lương trong thời gian điều trị',
      );
      const allowanceCost = this.normalizeMoney(
        payload.allowanceCost,
        0,
        'Chi phí bồi thường trợ cấp',
      );

      normalizedDetails.push({
        section,
        orderNo,
        accidentCauseCatalog,
        accidentCauseCodeSnapshot: accidentCauseCatalog?.code ?? null,
        accidentCauseNameSnapshot: accidentCauseCatalog?.name ?? null,
        injuryFactorCatalog,
        injuryFactorCodeSnapshot: injuryFactorCatalog?.code ?? null,
        injuryFactorNameSnapshot: injuryFactorCatalog?.name ?? null,
        occupationCatalog,
        occupationCodeSnapshot: occupationCatalog?.code ?? null,
        occupationNameSnapshot: occupationCatalog?.name ?? null,
        note: this.toTrimmedValue(payload.note) ?? null,
        totalAccidents: this.normalizeInteger(
          payload.totalAccidents,
          0,
          'Tổng số vụ',
        ),
        fatalAccidents: this.normalizeInteger(
          payload.fatalAccidents,
          0,
          'Số vụ có người chết',
        ),
        accidentsWithTwoOrMoreVictims: this.normalizeInteger(
          payload.accidentsWithTwoOrMoreVictims,
          0,
          'Số vụ có từ 2 người bị nạn trở lên',
        ),
        totalVictims: this.normalizeInteger(
          payload.totalVictims,
          0,
          'Tổng số người bị nạn',
        ),
        femaleVictims: this.normalizeInteger(
          payload.femaleVictims,
          0,
          'Số lao động nữ',
        ),
        deathVictims: this.normalizeInteger(
          payload.deathVictims,
          0,
          'Số người bị chết',
        ),
        severeInjuryVictims: this.normalizeInteger(
          payload.severeInjuryVictims,
          0,
          'Số người bị thương nặng',
        ),
        victimsNotUnderManagement: this.normalizeInteger(
          payload.victimsNotUnderManagement,
          0,
          'Người bị nạn không thuộc quyền quản lý',
        ),
        femaleVictimsNotUnderManagement: this.normalizeInteger(
          payload.femaleVictimsNotUnderManagement,
          0,
          'Lao động nữ bị nạn không thuộc quyền quản lý',
        ),
        deathVictimsNotUnderManagement: this.normalizeInteger(
          payload.deathVictimsNotUnderManagement,
          0,
          'Người chết không thuộc quyền quản lý',
        ),
        severeInjuryVictimsNotUnderManagement: this.normalizeInteger(
          payload.severeInjuryVictimsNotUnderManagement,
          0,
          'Người bị thương nặng không thuộc quyền quản lý',
        ),
        medicalCost,
        salaryPaymentCost,
        allowanceCost,
        totalCost:
          payload.totalCost === undefined
            ? medicalCost + salaryPaymentCost + allowanceCost
            : this.normalizeMoney(payload.totalCost, 0, 'Tổng số tiền chi phí'),
        daysOff: this.normalizeInteger(
          payload.daysOff,
          0,
          'Số ngày nghỉ vì TNLĐ',
        ),
        propertyDamage: this.normalizeMoney(
          payload.propertyDamage,
          0,
          'Thiệt hại tài sản',
        ),
      });

      this.validateMetricPayload(
        normalizedDetails[normalizedDetails.length - 1],
        `Chi tiết báo cáo dòng ${index + 1}`,
      );
    }

    return normalizedDetails;
  }

  private parseDetails(value: string | unknown[]) {
    if (Array.isArray(value)) {
      return value;
    }

    try {
      const parsedValue = JSON.parse(value);

      if (Array.isArray(parsedValue)) {
        return parsedValue;
      }
    } catch {
      throw new BadRequestException(
        'Chi tiết báo cáo không đúng định dạng JSON array',
      );
    }

    throw new BadRequestException('Chi tiết báo cáo phải là JSON array');
  }

  private normalizeDetailSection(value: unknown, index: number) {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException(
        `Mục chi tiết báo cáo dòng ${index + 1} không được để trống`,
      );
    }

    if (
      !Object.values(LaborAccidentReportDetailSection).includes(
        value as LaborAccidentReportDetailSection,
      )
    ) {
      throw new BadRequestException(
        `Mục chi tiết báo cáo dòng ${index + 1} không hợp lệ`,
      );
    }

    return value as LaborAccidentReportDetailSection;
  }

  private async findCatalogByType(
    value: unknown,
    type: LaborAccidentCatalogType,
    label: string,
  ) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const id = this.normalizePositiveInteger(value, label);
    const catalog = await this.catalogRepository.findOne({
      where: {
        id,
        type,
        isActive: true,
      },
    });

    if (!catalog) {
      throw new BadRequestException(
        `${label} không tồn tại hoặc không còn sử dụng`,
      );
    }

    return catalog;
  }

  private async prepareAttachments(
    files: Express.Multer.File[],
    attachmentNames: string | undefined,
  ): Promise<PreparedReportAttachment[]> {
    if (!files.length) {
      return [];
    }

    const names = this.parseAttachmentNames(attachmentNames);
    const folder =
      this.configService.get<string>(
        'CLOUDINARY_FOLDER_LABOR_ACCIDENT_REPORTS',
      ) || 'labor-accident-reports';
    const preparedAttachments: PreparedReportAttachment[] = [];

    try {
      for (const [index, file] of files.entries()) {
        const uploadResult = await this.cloudinaryService.uploadFile(
          file,
          folder,
        );
        const resourceType = ['image', 'raw', 'video'].includes(
          uploadResult.resource_type,
        )
          ? (uploadResult.resource_type as 'image' | 'raw' | 'video')
          : 'image';

        preparedAttachments.push({
          displayName: names[index] || file.originalname,
          originalName: file.originalname,
          fileUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          mimetype: file.mimetype,
          size: file.size,
          resourceType,
        });
      }
    } catch (error) {
      await this.cleanupPreparedAttachments(preparedAttachments);
      throw error;
    }

    return preparedAttachments;
  }

  private async persistPreparedAttachments(
    report: LaborAccidentReport,
    user: User,
    preparedAttachments: PreparedReportAttachment[],
    manager: EntityManager,
  ) {
    const attachmentType = LaborAccidentReportAttachmentType.STAMPED_REPORT;
    const reportRef = manager.create(LaborAccidentReport, { id: report.id });
    const userRef = manager.create(User, { id: user.id });

    for (const preparedAttachment of preparedAttachments) {
      const latestAttachment = await manager.findOne(
        LaborAccidentReportAttachment,
        {
          where: {
            report: { id: report.id },
            type: attachmentType,
          },
          order: {
            version: 'DESC',
            id: 'DESC',
          },
        },
      );

      const newAttachment = await manager.save(
        LaborAccidentReportAttachment,
        manager.create(LaborAccidentReportAttachment, {
          report: reportRef,
          type: attachmentType,
          displayName: preparedAttachment.displayName,
          originalName: preparedAttachment.originalName,
          fileUrl: preparedAttachment.fileUrl,
          publicId: preparedAttachment.publicId,
          mimetype: preparedAttachment.mimetype,
          size: preparedAttachment.size,
          version: (latestAttachment?.version ?? 0) + 1,
          isCurrent: false,
          supersededAt: null,
          uploadedByUser: userRef,
        }),
      );

      await manager
        .createQueryBuilder()
        .update(LaborAccidentReportAttachment)
        .set({
          isCurrent: false,
          supersededAt: new Date(),
        })
        .where('report_id = :reportId', { reportId: report.id })
        .andWhere('type = :type', { type: attachmentType })
        .andWhere('is_current = true')
        .andWhere('id <> :newAttachmentId', {
          newAttachmentId: newAttachment.id,
        })
        .execute();

      await manager
        .createQueryBuilder()
        .update(LaborAccidentReportAttachment)
        .set({
          isCurrent: true,
          supersededAt: null,
        })
        .where('id = :newAttachmentId', {
          newAttachmentId: newAttachment.id,
        })
        .execute();
    }
  }

  private async cleanupPreparedAttachments(
    preparedAttachments: PreparedReportAttachment[],
  ) {
    await Promise.all(
      preparedAttachments.map((preparedAttachment) =>
        this.cloudinaryService
          .deleteFile(
            preparedAttachment.publicId,
            preparedAttachment.resourceType,
          )
          .catch(() => undefined),
      ),
    );
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

  private normalizeYear(value: string | number) {
    const year = Number(value);

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new BadRequestException('Năm báo cáo không hợp lệ');
    }

    return year;
  }

  private normalizePositiveInteger(value: unknown, label: string) {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 1) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }

    return numberValue;
  }

  private normalizeInteger(
    value: unknown,
    currentValue: number,
    label: string,
  ) {
    if (value === undefined || value === null || value === '') {
      return Number(currentValue) || 0;
    }

    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 0) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }

    return numberValue;
  }

  private normalizeMoney(value: unknown, currentValue: number, label: string) {
    if (value === undefined || value === null || value === '') {
      return Number(currentValue) || 0;
    }

    const normalizedValue =
      typeof value === 'string' ? this.normalizeMoneyString(value) : value;
    const numberValue = Number(normalizedValue);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }

    return numberValue;
  }

  private normalizeMoneyString(value: string) {
    const trimmedValue = value.trim().replace(/\s/g, '');

    if (!trimmedValue) {
      return '';
    }

    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(trimmedValue)) {
      return trimmedValue.replace(/\./g, '').replace(',', '.');
    }

    return trimmedValue.replace(/,/g, '');
  }

  private addPreSubmitIssue(
    items: PreSubmitCheckItem[],
    item: PreSubmitCheckItem,
  ) {
    if (items.some((existingItem) => existingItem.code === item.code)) {
      return;
    }

    items.push(item);
  }

  private addBadRequestIssues(
    items: PreSubmitCheckItem[],
    error: unknown,
    baseCode: string,
    title: string,
    targetStep: number,
    targetSection: PreSubmitCheckTargetSection,
  ) {
    if (!(error instanceof BadRequestException)) {
      throw error;
    }

    const messages = this.extractBadRequestMessages(error);

    for (const [index, message] of messages.entries()) {
      this.addPreSubmitIssue(items, {
        code: `${baseCode}_${index + 1}`,
        severity: 'danger',
        category: 'HARD_VALIDATION',
        title,
        message,
        suggestion:
          'Vui lòng quay lại kiểm tra dữ liệu nhập liệu trước khi gửi báo cáo.',
        targetStep,
        targetSection,
        blocking: true,
      });
    }
  }

  private extractBadRequestMessages(error: BadRequestException) {
    const response = error.getResponse();

    if (typeof response === 'string') {
      return [response];
    }

    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: unknown }).message;

      if (Array.isArray(message)) {
        return message.map((item) => String(item));
      }

      if (message !== undefined && message !== null) {
        return [String(message)];
      }
    }

    return [error.message || 'Dữ liệu báo cáo không hợp lệ'];
  }

  private getCurrentStampedAttachment(report: LaborAccidentReport) {
    return (
      report.attachments?.find(
        (attachment) =>
          attachment.type === LaborAccidentReportAttachmentType.STAMPED_REPORT &&
          attachment.isCurrent,
      ) ?? null
    );
  }

  private async findLastRejectAuditLog(reportId: number) {
    return this.reportAuditLogRepository.findOne({
      where: {
        report: { id: reportId },
        action: LaborAccidentReportAuditAction.REJECT,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
    });
  }

  private analyzeRejectReason(
    reason: string | null | undefined,
  ): RejectionReasonAnalysis {
    const trimmedReason = reason?.trim() ?? '';
    const normalizedReason = this.normalizeTextForRuleMatching(trimmedReason);

    if (
      !trimmedReason ||
      normalizedReason.replace(/[^a-z0-9]/g, '').length < 4
    ) {
      return {
        topic: 'UNCLEAR',
        isClear: false,
        suggestion:
          'Lý do từ chối chưa đủ rõ để xác định chính xác hạng mục cần sửa. Vui lòng kiểm tra lại file đính kèm, số liệu tổng hợp, chi tiết tai nạn và kỳ báo cáo trước khi gửi lại.',
      };
    }

    if (
      this.containsAnyRuleKeyword(normalizedReason, [
        'dau moc',
        'chu ky',
        'ky ten',
        'dong dau',
        'xac nhan',
      ])
    ) {
      return {
        topic: 'SIGNATURE',
        isClear: true,
        suggestion:
          'Vui lòng kiểm tra file đính kèm đã có dấu mộc/chữ ký xác nhận phù hợp trước khi gửi lại.',
      };
    }

    if (
      this.containsAnyRuleKeyword(normalizedReason, [
        'file',
        'tep',
        'dinh kem',
        'pdf',
        'word',
        'khong mo duoc',
        'khong hop le',
        'loi file',
      ])
    ) {
      return {
        topic: 'FILE',
        isClear: true,
        suggestion:
          'Vui lòng thay hoặc kiểm tra lại file đính kèm, bảo đảm file mở được, đúng định dạng và đúng nội dung báo cáo.',
      };
    }

    if (
      this.containsAnyRuleKeyword(normalizedReason, [
        'so lieu',
        'tong',
        'khop',
        'chi tiet',
        'sai so',
        'vu tai nan',
        'nguoi bi nan',
        'chi phi',
        'thiet hai',
      ])
    ) {
      return {
        topic: 'METRIC',
        isClear: true,
        suggestion:
          'Vui lòng đối chiếu lại số liệu tổng hợp, chi tiết từng vụ tai nạn, số người bị nạn và các khoản chi phí.',
      };
    }

    if (
      this.containsAnyRuleKeyword(normalizedReason, [
        'ky bao cao',
        'nam bao cao',
        'nham ky',
        'nham nam',
        'thoi gian',
      ])
    ) {
      return {
        topic: 'PERIOD',
        isClear: true,
        suggestion:
          'Vui lòng kiểm tra đúng năm, kỳ báo cáo và khoảng thời gian được phép gửi báo cáo.',
      };
    }

    return {
      topic: 'GENERAL',
      isClear: trimmedReason.length >= 10,
      suggestion:
        'Vui lòng đọc lại lý do từ chối và rà soát toàn bộ dữ liệu, file đính kèm trước khi gửi lại.',
    };
  }

  private normalizeTextForRuleMatching(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private containsAnyRuleKeyword(value: string, keywords: string[]) {
    return keywords.some((keyword) => value.includes(keyword));
  }

  private collectAttachmentPreSubmitIssues(
    items: PreSubmitCheckItem[],
    report: LaborAccidentReport,
    files: Express.Multer.File[],
    currentAttachment: LaborAccidentReportAttachment | null,
    lastRejectLog: LaborAccidentReportAuditLog | null,
    rejectionAnalysis: RejectionReasonAnalysis,
  ) {
    if (files.length > 1) {
      this.addPreSubmitIssue(items, {
        code: 'MULTIPLE_STAMPED_FILES_SELECTED',
        severity: 'warning',
        category: 'ATTACHMENT',
        title: 'Đang chọn nhiều file đính kèm',
        message:
          'Hệ thống chỉ giữ một file báo cáo có dấu mộc hiện hành sau khi gửi.',
        suggestion:
          'Nên chỉ chọn file cuối cùng, đầy đủ và đúng nhất để tránh nhầm lẫn khi Sở kiểm tra.',
        targetStep: 4,
        targetSection: 'ATTACHMENT',
        blocking: false,
        metadata: {
          selectedFileCount: files.length,
        },
      });
    }

    for (const file of files) {
      if (!this.isLikelyReportDocument(file.originalname, file.mimetype)) {
        this.addPreSubmitIssue(items, {
          code: `ATTACHMENT_FORMAT_REVIEW_${this.normalizeTextForRuleMatching(
            file.originalname,
          ).slice(0, 30)}`,
          severity: 'warning',
          category: 'ATTACHMENT',
          title: 'Định dạng file cần kiểm tra lại',
          message: `File "${file.originalname}" không giống định dạng PDF/Word thường dùng cho báo cáo.`,
          suggestion:
            'Vui lòng bảo đảm file có thể mở được và đúng định dạng mà đơn vị tiếp nhận yêu cầu.',
          targetStep: 4,
          targetSection: 'ATTACHMENT',
          blocking: false,
          metadata: {
            fileName: file.originalname,
            mimetype: file.mimetype,
          },
        });
      }
    }

    if (!lastRejectLog) {
      return;
    }

    const attachmentChangedAfterReject = this.hasAttachmentChangedAfterReject(
      files,
      currentAttachment,
      lastRejectLog,
    );
    const isFileRelatedReject =
      rejectionAnalysis.topic === 'FILE' ||
      rejectionAnalysis.topic === 'SIGNATURE';

    if (isFileRelatedReject && !attachmentChangedAfterReject) {
      this.addPreSubmitIssue(items, {
        code: 'REJECTED_FILE_NOT_CHANGED',
        severity: 'danger',
        category: 'REJECTION_HISTORY',
        title: 'File chưa thay đổi sau lần bị từ chối',
        message:
          'Lý do từ chối gần nhất có liên quan đến file/dấu mộc, nhưng hệ thống chưa thấy file mới sau thời điểm bị từ chối.',
        suggestion: rejectionAnalysis.suggestion,
        targetStep: 4,
        targetSection: 'ATTACHMENT',
        blocking: false,
        metadata: {
          rejectedAt: lastRejectLog.createdAt,
          currentAttachmentName: currentAttachment?.originalName ?? null,
        },
      });
    } else if (isFileRelatedReject && attachmentChangedAfterReject) {
      this.addPreSubmitIssue(items, {
        code: 'REJECTED_FILE_CHANGED',
        severity: 'info',
        category: 'REJECTION_HISTORY',
        title: 'File đã được thay đổi sau lần bị từ chối',
        message:
          'Báo cáo từng bị từ chối vì nội dung liên quan đến file và hiện đã có file mới hoặc file hiện hành được cập nhật sau lần từ chối.',
        suggestion:
          'Bạn vẫn nên mở lại file để kiểm tra dấu mộc/chữ ký và nội dung trước khi gửi.',
        targetStep: 4,
        targetSection: 'ATTACHMENT',
        blocking: false,
      });
    }

    if (!files.length && currentAttachment) {
      this.addPreSubmitIssue(items, {
        code: 'USING_EXISTING_STAMPED_FILE',
        severity: 'info',
        category: 'ATTACHMENT',
        title: 'Đang sử dụng file đính kèm hiện hành',
        message: `Hệ thống sẽ gửi lại file hiện hành "${currentAttachment.originalName}".`,
        suggestion:
          'Nếu bạn đã chỉnh sửa file trên máy, hãy tải file mới lên trước khi xác nhận gửi.',
        targetStep: 4,
        targetSection: 'ATTACHMENT',
        blocking: false,
        metadata: {
          reportId: report.id,
          attachmentId: currentAttachment.id,
        },
      });
    }
  }

  private collectRejectionHistoryPreSubmitIssues(
    items: PreSubmitCheckItem[],
    originalReport: LaborAccidentReport,
    checkReport: LaborAccidentReport,
    lastRejectLog: LaborAccidentReportAuditLog | null,
    rejectionAnalysis: RejectionReasonAnalysis,
  ) {
    if (!lastRejectLog) {
      return;
    }

    if (!rejectionAnalysis.isClear) {
      this.addPreSubmitIssue(items, {
        code: 'REJECT_REASON_UNCLEAR',
        severity: 'warning',
        category: 'REJECTION_HISTORY',
        title: 'Lý do từ chối chưa đủ rõ',
        message:
          'Hệ thống không xác định được chính xác hạng mục cần sửa từ lý do từ chối gần nhất.',
        suggestion: rejectionAnalysis.suggestion,
        targetStep: 4,
        targetSection: 'REVIEW',
        blocking: false,
      });
    } else {
      this.addPreSubmitIssue(items, {
        code: `REJECT_REASON_${rejectionAnalysis.topic}`,
        severity: 'info',
        category: 'REJECTION_HISTORY',
        title: 'Có lịch sử từ chối cần đối chiếu',
        message: `Lý do từ chối gần nhất: "${lastRejectLog.reason ?? originalReport.rejectReason ?? 'Không có nội dung'}".`,
        suggestion: rejectionAnalysis.suggestion,
        targetStep: 4,
        targetSection: 'REVIEW',
        blocking: false,
        metadata: {
          rejectedAt: lastRejectLog.createdAt,
          topic: rejectionAnalysis.topic,
        },
      });
    }

    if (
      originalReport.updatedAt <= lastRejectLog.createdAt &&
      !this.hasReportMetricDifference(originalReport, checkReport)
    ) {
      this.addPreSubmitIssue(items, {
        code: 'REJECTED_REPORT_NO_VISIBLE_DATA_CHANGE',
        severity: 'warning',
        category: 'REJECTION_HISTORY',
        title: 'Chưa thấy thay đổi dữ liệu sau lần bị từ chối',
        message:
          'Báo cáo từng bị từ chối nhưng hệ thống chưa thấy số liệu chính thay đổi so với dữ liệu đang lưu.',
        suggestion:
          'Nếu bạn đã sửa ở file đính kèm, hãy kiểm tra lại file; nếu lý do liên quan đến số liệu, vui lòng rà soát các trường tổng hợp và chi tiết.',
        targetStep: 2,
        targetSection: 'SUMMARY',
        blocking: false,
      });
    }
  }

  private collectSoftMetricPreSubmitIssues(
    items: PreSubmitCheckItem[],
    report: LaborAccidentReport,
    details: NormalizedDetailPayload[],
  ) {
    const totalAccidents = this.metricValue(report, 'totalAccidents');
    const totalVictims = this.metricValue(report, 'totalVictims');
    const totalEmployees = this.metricValue(report, 'totalEmployees');
    const femaleEmployees = this.metricValue(report, 'femaleEmployees');
    const femaleVictims = this.metricValue(report, 'femaleVictims');
    const totalCost = this.metricValue(report, 'totalCost');
    const totalDaysOff = this.metricValue(report, 'totalDaysOff');
    const propertyDamage = this.metricValue(report, 'propertyDamage');
    const accidentDetails = details.filter(
      (detail) => detail.section === LaborAccidentReportDetailSection.ACCIDENT,
    );

    if (
      totalAccidents === 0 &&
      (totalCost > 0 || totalDaysOff > 0 || propertyDamage > 0)
    ) {
      this.addPreSubmitIssue(items, {
        code: 'NO_ACCIDENT_BUT_HAS_DAMAGE',
        severity: 'warning',
        category: 'METRIC_CONSISTENCY',
        title: 'Có chi phí/thiệt hại nhưng tổng số vụ bằng 0',
        message:
          'Báo cáo đang ghi nhận chi phí, ngày nghỉ hoặc thiệt hại tài sản trong khi tổng số vụ tai nạn bằng 0.',
        suggestion:
          'Vui lòng kiểm tra lại phần tổng số vụ tai nạn và các khoản chi phí/thiệt hại.',
        targetStep: 2,
        targetSection: 'SUMMARY',
        blocking: false,
      });
    }

    if (totalVictims === 0 && totalCost > 0) {
      this.addPreSubmitIssue(items, {
        code: 'NO_VICTIM_BUT_HAS_COST',
        severity: 'warning',
        category: 'METRIC_CONSISTENCY',
        title: 'Có chi phí nhưng tổng số người bị nạn bằng 0',
        message:
          'Tổng chi phí đang lớn hơn 0 nhưng báo cáo chưa ghi nhận người bị nạn.',
        suggestion:
          'Vui lòng đối chiếu lại tổng số người bị nạn và các khoản chi phí liên quan.',
        targetStep: 2,
        targetSection: 'SUMMARY',
        blocking: false,
      });
    }

    if (femaleEmployees === 0 && femaleVictims > 0) {
      this.addPreSubmitIssue(items, {
        code: 'FEMALE_VICTIMS_WITHOUT_FEMALE_EMPLOYEES',
        severity: 'warning',
        category: 'METRIC_CONSISTENCY',
        title: 'Có lao động nữ bị nạn nhưng tổng lao động nữ bằng 0',
        message:
          'Báo cáo ghi nhận lao động nữ bị nạn trong khi tổng số lao động nữ của cơ sở đang bằng 0.',
        suggestion:
          'Vui lòng kiểm tra lại tổng số lao động nữ và số lao động nữ bị nạn.',
        targetStep: 2,
        targetSection: 'SUMMARY',
        blocking: false,
      });
    }

    if (
      totalEmployees > 0 &&
      totalVictims > 0 &&
      totalVictims / totalEmployees >= 0.3
    ) {
      this.addPreSubmitIssue(items, {
        code: 'HIGH_VICTIM_RATE',
        severity: 'warning',
        category: 'METRIC_CONSISTENCY',
        title: 'Tỷ lệ người bị nạn cao bất thường',
        message:
          'Tổng số người bị nạn chiếm từ 30% tổng số lao động trở lên.',
        suggestion:
          'Đây không chắc chắn là lỗi, nhưng bạn nên kiểm tra lại số lao động và số người bị nạn trước khi gửi.',
        targetStep: 2,
        targetSection: 'SUMMARY',
        blocking: false,
        metadata: {
          totalEmployees,
          totalVictims,
          victimRate: Number((totalVictims / totalEmployees).toFixed(4)),
        },
      });
    }

    for (const detail of accidentDetails) {
      const detailHasAccidentData =
        this.metricValue(detail, 'totalAccidents') > 0 ||
        this.metricValue(detail, 'totalVictims') > 0 ||
        this.metricValue(detail, 'totalCost') > 0;

      if (
        detailHasAccidentData &&
        (!detail.accidentCauseCodeSnapshot ||
          !detail.injuryFactorCodeSnapshot ||
          !detail.occupationCodeSnapshot)
      ) {
        this.addPreSubmitIssue(items, {
          code: `DETAIL_${detail.orderNo ?? 'UNKNOWN'}_CATALOG_INCOMPLETE`,
          severity: 'warning',
          category: 'METRIC_CONSISTENCY',
          title: 'Chi tiết tai nạn chưa đủ phân loại',
          message: `Chi tiết vụ tai nạn số ${detail.orderNo ?? '?'} có số liệu nhưng chưa đủ nguyên nhân, yếu tố chấn thương hoặc nghề nghiệp.`,
          suggestion:
            'Vui lòng kiểm tra lại các danh mục phân loại ở phần chi tiết vụ tai nạn.',
          targetStep: 3,
          targetSection: 'DETAILS',
          blocking: false,
        });
      }
    }
  }

  private collectPreviousReportPreSubmitIssues(
    items: PreSubmitCheckItem[],
    report: LaborAccidentReport,
    previousReport: LaborAccidentReport | null,
  ) {
    if (!previousReport) {
      return;
    }

    const currentAccidents = this.metricValue(report, 'totalAccidents');
    const previousAccidents = this.metricValue(previousReport, 'totalAccidents');
    const currentCost = this.metricValue(report, 'totalCost');
    const previousCost = this.metricValue(previousReport, 'totalCost');

    if (previousReport.status === LaborAccidentReportStatus.REJECTED) {
      this.addPreSubmitIssue(items, {
        code: 'PREVIOUS_REPORT_REJECTED',
        severity: 'info',
        category: 'PREVIOUS_PERIOD',
        title: 'Kỳ báo cáo gần nhất từng bị từ chối',
        message:
          'Báo cáo gần nhất trước kỳ này có trạng thái từ chối phê duyệt.',
        suggestion:
          'Bạn nên đối chiếu lại các lỗi từng gặp ở kỳ trước để tránh lặp lại khi gửi báo cáo kỳ này.',
        targetStep: 4,
        targetSection: 'REVIEW',
        blocking: false,
        metadata: {
          previousReportId: previousReport.id,
        },
      });
    }

    if (previousAccidents > 0 && currentAccidents === 0) {
      this.addPreSubmitIssue(items, {
        code: 'ACCIDENTS_DROPPED_TO_ZERO',
        severity: 'warning',
        category: 'PREVIOUS_PERIOD',
        title: 'Số vụ giảm về 0 so với kỳ trước',
        message:
          'Kỳ báo cáo gần nhất có ghi nhận tai nạn lao động, nhưng kỳ hiện tại đang là 0 vụ.',
        suggestion:
          'Nếu kỳ này thật sự không phát sinh tai nạn thì có thể tiếp tục; nếu chưa chắc chắn, vui lòng kiểm tra lại số liệu.',
        targetStep: 2,
        targetSection: 'SUMMARY',
        blocking: false,
        metadata: {
          previousAccidents,
          currentAccidents,
        },
      });
    }

    if (previousAccidents > 0 && currentAccidents >= previousAccidents * 2) {
      this.addPreSubmitIssue(items, {
        code: 'ACCIDENTS_INCREASED_SHARPLY',
        severity: 'warning',
        category: 'PREVIOUS_PERIOD',
        title: 'Số vụ tăng mạnh so với kỳ trước',
        message:
          'Tổng số vụ tai nạn hiện tại tăng từ 2 lần trở lên so với kỳ báo cáo gần nhất.',
        suggestion:
          'Đây không chắc chắn là lỗi, nhưng bạn nên kiểm tra lại số liệu tổng hợp và chi tiết.',
        targetStep: 2,
        targetSection: 'SUMMARY',
        blocking: false,
        metadata: {
          previousAccidents,
          currentAccidents,
        },
      });
    }

    if (previousCost > 0 && currentCost >= previousCost * 2) {
      this.addPreSubmitIssue(items, {
        code: 'TOTAL_COST_INCREASED_SHARPLY',
        severity: 'warning',
        category: 'PREVIOUS_PERIOD',
        title: 'Tổng chi phí tăng mạnh so với kỳ trước',
        message:
          'Tổng chi phí hiện tại tăng từ 2 lần trở lên so với kỳ báo cáo gần nhất.',
        suggestion:
          'Vui lòng kiểm tra lại các khoản chi phí y tế, trả lương, bồi thường/trợ cấp và thiệt hại tài sản.',
        targetStep: 2,
        targetSection: 'SUMMARY',
        blocking: false,
        metadata: {
          previousCost,
          currentCost,
        },
      });
    } else if (previousCost === 0 && currentCost >= 50_000_000) {
      this.addPreSubmitIssue(items, {
        code: 'TOTAL_COST_NEW_HIGH_VALUE',
        severity: 'warning',
        category: 'PREVIOUS_PERIOD',
        title: 'Phát sinh chi phí lớn so với kỳ trước',
        message:
          'Kỳ trước không ghi nhận chi phí, nhưng kỳ hiện tại phát sinh tổng chi phí lớn.',
        suggestion:
          'Vui lòng kiểm tra lại số tiền và đơn vị tính trước khi gửi báo cáo.',
        targetStep: 2,
        targetSection: 'SUMMARY',
        blocking: false,
        metadata: {
          previousCost,
          currentCost,
        },
      });
    }
  }

  private async findPreviousReportForBusiness(
    businessId: number,
    currentReport: LaborAccidentReport,
  ) {
    const currentStartDate = this.toDateKey(currentReport.reportPeriod.startDate);

    return this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reportPeriod', 'previous_period')
      .where('report.business_id = :businessId', { businessId })
      .andWhere('report.id <> :reportId', { reportId: currentReport.id })
      .andWhere(
        '(previous_period.year < :year OR (previous_period.year = :year AND previous_period.start_date < :startDate))',
        {
          year: currentReport.reportPeriod.year,
          startDate: currentStartDate,
        },
      )
      .orderBy('previous_period.year', 'DESC')
      .addOrderBy('previous_period.startDate', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .getOne();
  }

  private isLikelyReportDocument(fileName: string, mimetype?: string | null) {
    const normalizedName = this.normalizeTextForRuleMatching(fileName);
    const normalizedMime = this.normalizeTextForRuleMatching(mimetype ?? '');

    return (
      normalizedName.endsWith('.pdf') ||
      normalizedName.endsWith('.doc') ||
      normalizedName.endsWith('.docx') ||
      normalizedMime.includes('pdf') ||
      normalizedMime.includes('word') ||
      normalizedMime.includes('officedocument')
    );
  }

  private hasAttachmentChangedAfterReject(
    files: Express.Multer.File[],
    currentAttachment: LaborAccidentReportAttachment | null,
    lastRejectLog: LaborAccidentReportAuditLog,
  ) {
    if (files.length > 0) {
      return true;
    }

    if (!currentAttachment?.createdAt) {
      return false;
    }

    return currentAttachment.createdAt > lastRejectLog.createdAt;
  }

  private hasReportMetricDifference(
    previousReport: LaborAccidentReport,
    currentReport: LaborAccidentReport,
  ) {
    return this.getPreSubmitMetricKeys().some(
      (key) =>
        this.roundMoney(this.metricValue(previousReport, key)) !==
        this.roundMoney(this.metricValue(currentReport, key)),
    );
  }

  private getPreSubmitMetricKeys() {
    return [
      'totalEmployees',
      'femaleEmployees',
      'totalPayroll',
      'totalAccidents',
      'fatalAccidents',
      'accidentsWithTwoOrMoreVictims',
      'totalVictims',
      'femaleVictims',
      'deathVictims',
      'severeInjuryVictims',
      'victimsNotUnderManagement',
      'femaleVictimsNotUnderManagement',
      'deathVictimsNotUnderManagement',
      'severeInjuryVictimsNotUnderManagement',
      'medicalCost',
      'salaryPaymentCost',
      'allowanceCost',
      'totalCost',
      'totalDaysOff',
      'propertyDamage',
    ];
  }

  private calculatePreSubmitReadinessScore(items: PreSubmitCheckItem[]) {
    const score = items.reduce((currentScore, item) => {
      if (item.blocking) {
        return currentScore - 30;
      }

      if (item.severity === 'danger') {
        return currentScore - 15;
      }

      if (item.severity === 'warning') {
        return currentScore - 8;
      }

      if (item.severity === 'info') {
        return currentScore - 2;
      }

      return currentScore;
    }, 100);

    return Math.max(0, Math.min(100, score));
  }

  private getPreSubmitReadinessLevel(
    readinessScore: number,
    items: PreSubmitCheckItem[],
  ): PreSubmitCheckLevel {
    if (items.some((item) => item.blocking)) {
      return 'NEEDS_FIX';
    }

    if (readinessScore >= 90) {
      return 'READY';
    }

    if (readinessScore >= 70) {
      return 'REVIEW_RECOMMENDED';
    }

    return 'NEEDS_ATTENTION';
  }

  private validateReportMetrics(report: LaborAccidentReport) {
    const errors: string[] = [];

    this.collectReportMetricErrors(report, errors);
    this.throwValidationErrors(errors);
  }

  private validateReportReadyToLock(report: LaborAccidentReport) {
    const errors: string[] = [];
    const accidentDetails =
      report.details?.filter(
        (detail) =>
          detail.section === LaborAccidentReportDetailSection.ACCIDENT,
      ) ?? [];

    this.collectReportMetricErrors(report, errors);
    this.collectReportDetailConsistencyErrors(
      report,
      report.details ?? [],
      errors,
    );

    if (this.metricValue(report, 'totalEmployees') < 1) {
      errors.push(
        'Tổng số lao động của cơ sở phải lớn hơn 0 trước khi gửi báo cáo',
      );
    }

    if (
      this.metricValue(report, 'totalAccidents') > 0 &&
      !accidentDetails.length
    ) {
      errors.push(
        'Vui lòng nhập chi tiết các vụ tai nạn lao động trước khi gửi báo cáo',
      );
    }

    this.throwValidationErrors(errors);
  }

  private validateMetricPayload(
    source: Record<string, unknown>,
    label: string,
  ) {
    const errors: string[] = [];

    this.collectMetricPayloadErrors(source, label, errors);
    this.throwValidationErrors(errors);
  }

  private validateReportAgainstDetails(
    report: LaborAccidentReport,
    details: Array<Partial<LaborAccidentReportDetail>>,
  ) {
    const errors: string[] = [];

    this.collectReportDetailConsistencyErrors(report, details, errors);
    this.throwValidationErrors(errors);
  }

  private collectReportMetricErrors(
    report: LaborAccidentReport,
    errors: string[],
  ) {
    const totalEmployees = this.metricValue(report, 'totalEmployees');
    const femaleEmployees = this.metricValue(report, 'femaleEmployees');

    if (femaleEmployees > totalEmployees) {
      errors.push(
        'Tổng số lao động nữ không được lớn hơn tổng số lao động của cơ sở',
      );
    }

    this.collectMetricPayloadErrors(
      report as unknown as Record<string, unknown>,
      'Tổng quan báo cáo',
      errors,
    );
  }

  private collectMetricPayloadErrors(
    source: Record<string, unknown>,
    label: string,
    errors: string[],
  ) {
    const totalAccidents = this.metricValue(source, 'totalAccidents');
    const fatalAccidents = this.metricValue(source, 'fatalAccidents');
    const accidentsWithTwoOrMoreVictims = this.metricValue(
      source,
      'accidentsWithTwoOrMoreVictims',
    );
    const totalVictims = this.metricValue(source, 'totalVictims');
    const femaleVictims = this.metricValue(source, 'femaleVictims');
    const deathVictims = this.metricValue(source, 'deathVictims');
    const severeInjuryVictims = this.metricValue(source, 'severeInjuryVictims');
    const victimsNotUnderManagement = this.metricValue(
      source,
      'victimsNotUnderManagement',
    );
    const femaleVictimsNotUnderManagement = this.metricValue(
      source,
      'femaleVictimsNotUnderManagement',
    );
    const deathVictimsNotUnderManagement = this.metricValue(
      source,
      'deathVictimsNotUnderManagement',
    );
    const severeInjuryVictimsNotUnderManagement = this.metricValue(
      source,
      'severeInjuryVictimsNotUnderManagement',
    );
    const medicalCost = this.metricValue(source, 'medicalCost');
    const salaryPaymentCost = this.metricValue(source, 'salaryPaymentCost');
    const allowanceCost = this.metricValue(source, 'allowanceCost');
    const totalCost = this.metricValue(source, 'totalCost');

    this.collectMaxRule(
      errors,
      label,
      'Số vụ có người chết',
      fatalAccidents,
      'Tổng số vụ',
      totalAccidents,
    );
    this.collectMaxRule(
      errors,
      label,
      'Số vụ có từ 2 người bị nạn trở lên',
      accidentsWithTwoOrMoreVictims,
      'Tổng số vụ',
      totalAccidents,
    );
    this.collectMaxRule(
      errors,
      label,
      'Số lao động nữ bị nạn',
      femaleVictims,
      'Tổng số người bị nạn',
      totalVictims,
    );
    this.collectMaxRule(
      errors,
      label,
      'Số người bị chết',
      deathVictims,
      'Tổng số người bị nạn',
      totalVictims,
    );
    this.collectMaxRule(
      errors,
      label,
      'Số người bị thương nặng',
      severeInjuryVictims,
      'Tổng số người bị nạn',
      totalVictims,
    );
    this.collectMaxRule(
      errors,
      label,
      'Số người bị nạn không thuộc quyền quản lý',
      victimsNotUnderManagement,
      'Tổng số người bị nạn',
      totalVictims,
    );
    this.collectMaxRule(
      errors,
      label,
      'Lao động nữ bị nạn không thuộc quyền quản lý',
      femaleVictimsNotUnderManagement,
      'Số lao động nữ bị nạn',
      femaleVictims,
    );
    this.collectMaxRule(
      errors,
      label,
      'Số người chết không thuộc quyền quản lý',
      deathVictimsNotUnderManagement,
      'Số người bị chết',
      deathVictims,
    );
    this.collectMaxRule(
      errors,
      label,
      'Người bị thương nặng không thuộc quyền quản lý',
      severeInjuryVictimsNotUnderManagement,
      'Số người bị thương nặng',
      severeInjuryVictims,
    );

    if (totalAccidents === 0 && totalVictims > 0) {
      errors.push(
        `${label}: Tổng số người bị nạn phải bằng 0 khi tổng số vụ bằng 0`,
      );
    }

    if (totalAccidents > 0 && totalVictims < 1) {
      errors.push(
        `${label}: Tổng số người bị nạn phải lớn hơn 0 khi có vụ tai nạn`,
      );
    }

    if (fatalAccidents > deathVictims) {
      errors.push(
        `${label}: Số người bị chết phải lớn hơn hoặc bằng số vụ có người chết`,
      );
    }

    if (deathVictims + severeInjuryVictims > totalVictims) {
      errors.push(
        `${label}: Tổng số người bị chết và bị thương nặng không được lớn hơn tổng số người bị nạn`,
      );
    }

    if (
      accidentsWithTwoOrMoreVictims > 0 &&
      totalVictims < accidentsWithTwoOrMoreVictims * 2
    ) {
      errors.push(
        `${label}: Tổng số người bị nạn chưa phù hợp với số vụ có từ 2 người bị nạn trở lên`,
      );
    }

    if (
      this.roundMoney(totalCost) !==
      this.roundMoney(medicalCost + salaryPaymentCost + allowanceCost)
    ) {
      errors.push(
        `${label}: Tổng số tiền chi phí phải bằng chi phí y tế + trả lương trong thời gian điều trị + bồi thường/trợ cấp`,
      );
    }
  }

  private collectReportDetailConsistencyErrors(
    report: LaborAccidentReport,
    details: Array<Partial<LaborAccidentReportDetail>>,
    errors: string[],
  ) {
    const accidentDetails = details.filter(
      (detail) => detail.section === LaborAccidentReportDetailSection.ACCIDENT,
    );

    if (!accidentDetails.length) {
      return;
    }

    for (const field of this.getDetailConsistencyFields()) {
      const reportValue = this.metricValue(report, field.reportKey);
      const detailValue = accidentDetails.reduce(
        (sum, detail) => sum + this.metricValue(detail, field.detailKey),
        0,
      );

      if (this.roundMoney(reportValue) !== this.roundMoney(detailValue)) {
        errors.push(
          `Tổng quan báo cáo: ${field.label} phải bằng tổng chi tiết các vụ tai nạn lao động (${this.formatNumber(detailValue)})`,
        );
      }
    }
  }

  private getDetailConsistencyFields() {
    return [
      {
        label: 'Tổng số vụ',
        reportKey: 'totalAccidents',
        detailKey: 'totalAccidents',
      },
      {
        label: 'Số vụ có người chết',
        reportKey: 'fatalAccidents',
        detailKey: 'fatalAccidents',
      },
      {
        label: 'Số vụ có từ 2 người bị nạn trở lên',
        reportKey: 'accidentsWithTwoOrMoreVictims',
        detailKey: 'accidentsWithTwoOrMoreVictims',
      },
      {
        label: 'Tổng số người bị nạn',
        reportKey: 'totalVictims',
        detailKey: 'totalVictims',
      },
      {
        label: 'Số lao động nữ bị nạn',
        reportKey: 'femaleVictims',
        detailKey: 'femaleVictims',
      },
      {
        label: 'Số người bị chết',
        reportKey: 'deathVictims',
        detailKey: 'deathVictims',
      },
      {
        label: 'Số người bị thương nặng',
        reportKey: 'severeInjuryVictims',
        detailKey: 'severeInjuryVictims',
      },
      {
        label: 'Số người bị nạn không thuộc quyền quản lý',
        reportKey: 'victimsNotUnderManagement',
        detailKey: 'victimsNotUnderManagement',
      },
      {
        label: 'Lao động nữ bị nạn không thuộc quyền quản lý',
        reportKey: 'femaleVictimsNotUnderManagement',
        detailKey: 'femaleVictimsNotUnderManagement',
      },
      {
        label: 'Số người chết không thuộc quyền quản lý',
        reportKey: 'deathVictimsNotUnderManagement',
        detailKey: 'deathVictimsNotUnderManagement',
      },
      {
        label: 'Người bị thương nặng không thuộc quyền quản lý',
        reportKey: 'severeInjuryVictimsNotUnderManagement',
        detailKey: 'severeInjuryVictimsNotUnderManagement',
      },
      {
        label: 'Chi phí y tế',
        reportKey: 'medicalCost',
        detailKey: 'medicalCost',
      },
      {
        label: 'Trả lương trong thời gian điều trị',
        reportKey: 'salaryPaymentCost',
        detailKey: 'salaryPaymentCost',
      },
      {
        label: 'Bồi thường/trợ cấp',
        reportKey: 'allowanceCost',
        detailKey: 'allowanceCost',
      },
      {
        label: 'Tổng số tiền chi phí',
        reportKey: 'totalCost',
        detailKey: 'totalCost',
      },
      {
        label: 'Tổng số ngày nghỉ vì TNLĐ',
        reportKey: 'totalDaysOff',
        detailKey: 'daysOff',
      },
      {
        label: 'Thiệt hại tài sản',
        reportKey: 'propertyDamage',
        detailKey: 'propertyDamage',
      },
    ];
  }

  private collectMaxRule(
    errors: string[],
    label: string,
    childLabel: string,
    childValue: number,
    parentLabel: string,
    parentValue: number,
  ) {
    if (childValue > parentValue) {
      errors.push(`${label}: ${childLabel} không được lớn hơn ${parentLabel}`);
    }
  }

  private metricValue(source: any, key: string) {
    const value = Number(source?.[key] ?? 0);

    return Number.isFinite(value) ? value : 0;
  }

  private roundMoney(value: number) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  private throwValidationErrors(errors: string[]) {
    if (errors.length) {
      throw new BadRequestException(errors);
    }
  }

  private createEmptyMetricTotals(): ReportMetricTotals {
    return {
      totalAccidents: 0,
      fatalAccidents: 0,
      accidentsWithTwoOrMoreVictims: 0,
      totalVictims: 0,
      femaleVictims: 0,
      deathVictims: 0,
      severeInjuryVictims: 0,
      victimsNotUnderManagement: 0,
      femaleVictimsNotUnderManagement: 0,
      deathVictimsNotUnderManagement: 0,
      severeInjuryVictimsNotUnderManagement: 0,
      medicalCost: 0,
      salaryPaymentCost: 0,
      allowanceCost: 0,
      totalCost: 0,
      totalDaysOff: 0,
      propertyDamage: 0,
    };
  }

  private addReportTotals(
    target: ReportMetricTotals,
    report: LaborAccidentReport,
  ) {
    target.totalAccidents += Number(report.totalAccidents) || 0;
    target.fatalAccidents += Number(report.fatalAccidents) || 0;
    target.accidentsWithTwoOrMoreVictims +=
      Number(report.accidentsWithTwoOrMoreVictims) || 0;
    target.totalVictims += Number(report.totalVictims) || 0;
    target.femaleVictims += Number(report.femaleVictims) || 0;
    target.deathVictims += Number(report.deathVictims) || 0;
    target.severeInjuryVictims += Number(report.severeInjuryVictims) || 0;
    target.victimsNotUnderManagement +=
      Number(report.victimsNotUnderManagement) || 0;
    target.femaleVictimsNotUnderManagement +=
      Number(report.femaleVictimsNotUnderManagement) || 0;
    target.deathVictimsNotUnderManagement +=
      Number(report.deathVictimsNotUnderManagement) || 0;
    target.severeInjuryVictimsNotUnderManagement +=
      Number(report.severeInjuryVictimsNotUnderManagement) || 0;
    target.medicalCost += Number(report.medicalCost) || 0;
    target.salaryPaymentCost += Number(report.salaryPaymentCost) || 0;
    target.allowanceCost += Number(report.allowanceCost) || 0;
    target.totalCost += Number(report.totalCost) || 0;
    target.totalDaysOff += Number(report.totalDaysOff) || 0;
    target.propertyDamage += Number(report.propertyDamage) || 0;
  }

  private addDetailTotals(
    target: ReportMetricTotals,
    detail: LaborAccidentReportDetail,
  ) {
    target.totalAccidents += Number(detail.totalAccidents) || 0;
    target.fatalAccidents += Number(detail.fatalAccidents) || 0;
    target.accidentsWithTwoOrMoreVictims +=
      Number(detail.accidentsWithTwoOrMoreVictims) || 0;
    target.totalVictims += Number(detail.totalVictims) || 0;
    target.femaleVictims += Number(detail.femaleVictims) || 0;
    target.deathVictims += Number(detail.deathVictims) || 0;
    target.severeInjuryVictims += Number(detail.severeInjuryVictims) || 0;
    target.victimsNotUnderManagement +=
      Number(detail.victimsNotUnderManagement) || 0;
    target.femaleVictimsNotUnderManagement +=
      Number(detail.femaleVictimsNotUnderManagement) || 0;
    target.deathVictimsNotUnderManagement +=
      Number(detail.deathVictimsNotUnderManagement) || 0;
    target.severeInjuryVictimsNotUnderManagement +=
      Number(detail.severeInjuryVictimsNotUnderManagement) || 0;
    target.medicalCost += Number(detail.medicalCost) || 0;
    target.salaryPaymentCost += Number(detail.salaryPaymentCost) || 0;
    target.allowanceCost += Number(detail.allowanceCost) || 0;
    target.totalCost += Number(detail.totalCost) || 0;
    target.totalDaysOff += Number(detail.daysOff) || 0;
    target.propertyDamage += Number(detail.propertyDamage) || 0;
  }

  private addCatalogSummaryRow(
    target: Map<string, SummaryCatalogRow>,
    catalog: LaborAccidentCatalog | null,
    codeSnapshot: string | null,
    nameSnapshot: string | null,
    detail: LaborAccidentReportDetail,
  ) {
    if (!catalog) {
      return;
    }

    const code = codeSnapshot ?? catalog.code;
    const name = nameSnapshot ?? catalog.name;
    const key = `${catalog.id}:${code}:${name}`;
    let row = target.get(key);

    if (!row) {
      row = {
        catalog: {
          id: catalog.id,
          type: catalog.type,
          code,
          name,
          level: catalog.level,
        },
        totals: this.createEmptyMetricTotals(),
      };
      target.set(key, row);
    }

    this.addDetailTotals(row.totals, detail);
  }

  private mapSummaryCatalogRows(target: Map<string, SummaryCatalogRow>) {
    return Array.from(target.values())
      .sort((first, second) => {
        if (first.catalog.level !== second.catalog.level) {
          return first.catalog.level - second.catalog.level;
        }

        return first.catalog.code.localeCompare(second.catalog.code, 'vi', {
          numeric: true,
        });
      })
      .map((row) => ({
        catalog: row.catalog,
        totals: row.totals,
      }));
  }

  private mapSummaryFilters(query: LaborAccidentReportSummaryQueryDto) {
    return {
      reportPeriodId: query.reportPeriodId
        ? this.normalizePositiveInteger(query.reportPeriodId, 'Kỳ báo cáo')
        : null,
      year: query.year ? this.normalizeYear(query.year) : null,
      periodType: query.periodType ?? null,
      periodTypeLabel: query.periodType
        ? PERIOD_TYPE_LABELS[query.periodType]
        : null,
      status: query.status ?? null,
      statusLabel: query.status ? REPORT_STATUS_LABELS[query.status] : null,
      provinceCity: this.toTrimmedValue(query.provinceCity) ?? null,
      wardCommune: this.toTrimmedValue(query.wardCommune) ?? null,
    };
  }

  private createOfficeFile(
    html: string,
    filename: string,
    format: OfficeExportFormat,
  ): OfficeExportFile {
    return {
      buffer: Buffer.from(`\uFEFF${html}`, 'utf8'),
      filename,
      contentType:
        format === 'excel'
          ? 'application/vnd.ms-excel; charset=utf-8'
          : 'application/msword; charset=utf-8',
    };
  }

  private createReportFilename(
    report: LaborAccidentReport,
    format: OfficeExportFormat,
  ) {
    const extension = format === 'excel' ? 'xls' : 'doc';
    const periodTypeLabel = report.reportPeriod?.periodType
      ? PERIOD_TYPE_LABELS[report.reportPeriod.periodType]
      : 'ky-bao-cao';
    const filename = [
      'bao-cao-tnld',
      report.taxCode || report.businessName,
      report.reportPeriod?.year,
      periodTypeLabel,
    ]
      .filter(Boolean)
      .join('-');

    return `${this.slugify(filename)}.${extension}`;
  }

  private buildSummaryOfficeHtml(summary: any) {
    const filters = summary?.filters ?? {};
    const yearText = filters.year ? `Năm ${filters.year}` : 'Tất cả các năm';
    const periodText = filters.periodTypeLabel ? filters.periodTypeLabel : 'Tất cả các kỳ';
    const provinceText = filters.provinceCity ? filters.provinceCity : 'Toàn quốc';
    const wardText = filters.wardCommune ? ` - Phường/Xã: ${filters.wardCommune}` : '';

    const title = `Báo cáo tổng hợp tình hình tai nạn lao động - Kỳ báo cáo: ${periodText} ${yearText} (${provinceText}${wardText})`;

    return this.buildOfficeHtml(title, [
      this.buildSummaryFilterTable(summary),
      this.buildBusinessTypeTable(summary?.byBusinessType),
      this.buildMetricTable('II. Tổng số tai nạn lao động', summary?.totals),
      this.buildCatalogMetricTable(
        '2.1 Phân theo nguyên nhân xảy ra TNLĐ',
        summary?.byAccidentCause,
      ),
      this.buildCatalogMetricTable(
        '2.2 Phân theo yếu tố gây chấn thương',
        summary?.byInjuryFactor,
      ),
      this.buildCatalogMetricTable(
        '2.3 Phân theo nghề nghiệp',
        summary?.byOccupation,
      ),
      this.buildMetricTable(
        '3. Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ',
        summary?.article39Allowance,
      ),
      this.buildDamageTable(summary?.damage),
    ]);
  }

  private buildBusinessTypeTable(byBusinessType: any) {
    const categories = [
      'Doanh nghiệp nhà nước',
      'Công ty trách nhiệm hữu hạn',
      'Công ty cổ phần',
      'Công ty hợp danh',
      'Doanh nghiệp tư nhân',
      'Doanh nghiệp có vốn đầu tư nước ngoài',
      'Đơn vị kinh tế tập thể',
      'Đơn vị kinh tế cá thể',
      'Đơn vị hành chính sự nghiệp, đảng, đoàn thể, hiệp hội',
    ];

    const totalRow = {
      totalBusinesses: 0,
      participatingBusinesses: 0,
      totalEmployees: 0,
      participatingEmployees: 0,
      femaleEmployees: 0,
      totalVictims: 0,
      deathVictims: 0,
      severeInjuryVictims: 0,
      ktnld: 0,
      kchet: 0,
    };

    for (const cat of categories) {
      const data = byBusinessType?.[cat] || {};
      totalRow.totalBusinesses += Number(data.totalBusinesses) || 0;
      totalRow.participatingBusinesses += Number(data.participatingBusinesses) || 0;
      totalRow.totalEmployees += Number(data.totalEmployees) || 0;
      totalRow.participatingEmployees += Number(data.participatingEmployees) || 0;
      totalRow.femaleEmployees += Number(data.femaleEmployees) || 0;
      totalRow.totalVictims += Number(data.totalVictims) || 0;
      totalRow.deathVictims += Number(data.deathVictims) || 0;
      totalRow.severeInjuryVictims += Number(data.severeInjuryVictims) || 0;
    }

    if (totalRow.participatingEmployees > 0) {
      totalRow.ktnld = Math.round((totalRow.totalVictims / totalRow.participatingEmployees) * 1000 * 100) / 100;
      totalRow.kchet = Math.round((totalRow.deathVictims / totalRow.participatingEmployees) * 1000 * 100) / 100;
    } else {
      totalRow.ktnld = 0;
      totalRow.kchet = 0;
    }

    const rowsHtml = categories
      .map((cat, index) => {
        const data = byBusinessType?.[cat] || {};
        return `<tr>
          <td class="metric-name">${cat}</td>
          <td class="center">${index + 1}</td>
          ${this.numberCell(data.totalBusinesses)}
          ${this.numberCell(data.participatingBusinesses)}
          ${this.numberCell(data.totalEmployees)}
          ${this.numberCell(data.participatingEmployees)}
          ${this.numberCell(data.femaleEmployees)}
          ${this.numberCell(data.totalVictims)}
          ${this.numberCell(data.deathVictims)}
          ${this.numberCell(data.severeInjuryVictims)}
          ${this.numberCell(data.ktnld)}
          ${this.numberCell(data.kchet)}
          <td></td>
        </tr>`;
      })
      .join('\n');

    return `<div class="section-title">I. Th&ocirc;ng tin t&#7895;ng quan:</div>
<table class="metric-table">
  <colgroup>
    <col style="width: 22%" />
    <col style="width: 6%" />
    <col style="width: 6.5%" />
    <col style="width: 6.5%" />
    <col style="width: 6.5%" />
    <col style="width: 6.5%" />
    <col style="width: 6.5%" />
    <col style="width: 6.5%" />
    <col style="width: 6.5%" />
    <col style="width: 6.5%" />
    <col style="width: 6.5%" />
    <col style="width: 6.5%" />
    <col style="width: 6.5%" />
  </colgroup>
  <tr>
    <th rowspan="3">Lo&#7841;i h&igrave;nh c&#417; s&#7903;</th>
    <th rowspan="3">M&atilde; s&#7889;</th>
    <th colspan="2">C&#417; s&#7903;</th>
    <th colspan="3">L&#7921;c l&#432;&#7907;ng lao &#273;&#7897;ng</th>
    <th colspan="3">T&#7895;ng s&#7889; tai n&#7841;n lao &#273;&#7897;ng</th>
    <th colspan="2">T&#7847;n su&#7845;t tai n&#7841;n lao &#273;&#7897;ng</th>
    <th rowspan="3">Ghi ch&uacute;</th>
  </tr>
  <tr>
    <th rowspan="2">T&#7895;ng s&#7889;</th>
    <th rowspan="2">S&#7889; c&#417; s&#7903;<br/>tham gia</th>
    <th rowspan="2">T&#7895;ng s&#7889;<br/>lao &#273;&#7897;ng</th>
    <th rowspan="2">S&#7889; L&#272; c&#7911;a c&#417; s&#7903;<br/>tham gia b&aacute;o c&aacute;o</th>
    <th rowspan="2">S&#7889; lao &#273;&#7897;ng n&#7919;</th>
    <th colspan="3">S&#7889; ng&#432;&#7901;i b&#7883; TNL&#272;</th>
    <th rowspan="2">KTNL&#272;</th>
    <th rowspan="2">KCh&#7871;t</th>
  </tr>
  <tr>
    <th>T&#7895;ng s&#7889;</th>
    <th>S&#7889; ng&#432;&#7901;i<br/>ch&#7871;t</th>
    <th>S&#7889; ng&#432;&#7901;i b&#7883;<br/>th&#432;&#417;ng n&#7863;ng</th>
  </tr>
  <tr class="total-row">
    <td>T&#7895;ng s&#7889;</td>
    <td></td>
    ${this.numberCell(totalRow.totalBusinesses)}
    ${this.numberCell(totalRow.participatingBusinesses)}
    ${this.numberCell(totalRow.totalEmployees)}
    ${this.numberCell(totalRow.participatingEmployees)}
    ${this.numberCell(totalRow.femaleEmployees)}
    ${this.numberCell(totalRow.totalVictims)}
    ${this.numberCell(totalRow.deathVictims)}
    ${this.numberCell(totalRow.severeInjuryVictims)}
    ${this.numberCell(totalRow.ktnld)}
    ${this.numberCell(totalRow.kchet)}
    <td></td>
  </tr>
  ${rowsHtml}
</table>`;
  }

  private buildReportOfficeHtml(report: any) {
    const details = Array.isArray(report?.details) ? report.details : [];
    const accidentDetails = details.filter(
      (detail) => detail.section === LaborAccidentReportDetailSection.ACCIDENT,
    );
    const article39Details = details.filter(
      (detail) =>
        detail.section ===
        LaborAccidentReportDetailSection.ARTICLE_39_ALLOWANCE,
    );
    const title = `Báo cáo tai nạn lao động - ${
      report?.business?.businessName ?? report?.businessName ?? ''
    }`;

    return this.buildOfficeHtml(title, [
      this.buildReportInfoTable(report),
      this.buildMetricTable(
        'I. Tổng số vụ tai nạn lao động và số nạn nhân tai nạn lao động',
        report,
      ),
      this.buildReportDetailTable(
        '1. Chi tiết các vụ tai nạn lao động',
        accidentDetails,
      ),
      this.buildReportDetailTable(
        '2. Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ',
        article39Details,
      ),
      this.buildDamageTable(report),
      this.buildAttachmentTable(report?.attachments),
    ]);
  }

  private buildOfficeHtml(title: string, sections: string[]) {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: A4 landscape;
      margin: 0.45in;
      mso-page-orientation: landscape;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #111827;
      background: #ffffff;
      margin: 0;
    }
    .report-wrapper {
      width: 100%;
      max-width: 1500px;
      margin: 0 auto;
    }
    .report-title {
      font-size: 18pt;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      margin: 0 0 6px;
      color: #0f172a;
    }
    .report-subtitle {
      text-align: center;
      margin: 0 0 16px;
      color: #475569;
      font-size: 10pt;
      font-style: italic;
    }
    .section-title {
      font-size: 12pt;
      font-weight: 700;
      margin: 18px 0 8px;
      color: #0f172a;
      padding: 6px 8px;
      border-left: 4px solid #2563eb;
      background: #eff6ff;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 14px;
      table-layout: fixed;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    th,
    td {
      border: 1px solid #cbd5e1;
      padding: 7px 8px;
      vertical-align: middle;
      word-wrap: break-word;
      white-space: normal;
      mso-number-format: "\\@";
    }
    th {
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 700;
      text-align: center;
    }
    .meta-table th,
    .meta-table td {
      height: 28px;
    }
    .meta-label {
      background: #f8fafc;
      font-weight: 700;
      width: 18%;
    }
    .meta-value {
      width: 32%;
    }
    .metric-table th {
      font-size: 9pt;
      line-height: 1.25;
    }
    .metric-table td {
      height: 28px;
    }
    .metric-name {
      text-align: left;
      font-weight: 600;
    }
    .number {
      text-align: right;
      mso-number-format: "#,##0";
    }
    .center {
      text-align: center;
    }
    .muted {
      color: #64748b;
      font-style: italic;
      font-size: 10pt;
    }
    .empty {
      color: #64748b;
      font-style: italic;
      text-align: center;
    }
    .total-row td {
      background: #f8fafc;
      font-weight: 700;
    }
    .signature-table td {
      border: none;
      text-align: center;
      padding-top: 22px;
      height: 90px;
    }
  </style>
</head>
<body>
  <div class="report-wrapper">
    <div class="report-title">${this.escapeHtml(title)}</div>
    <div class="report-subtitle">Đơn vị tiền tệ: đồng; số ngày nghỉ: ngày; số liệu thống kê: vụ/người</div>
    ${sections.join('\n')}
  </div>
</body>
</html>`;
  }

  private buildSummaryFilterTable(summary: any) {
    const filters = summary?.filters ?? {};

    return `<div class="section-title">Th&ocirc;ng tin t&#7893;ng h&#7907;p</div>
<table class="meta-table">
  <colgroup>
    <col style="width: 18%" />
    <col style="width: 32%" />
    <col style="width: 18%" />
    <col style="width: 32%" />
  </colgroup>
  <tr>
    <td class="meta-label">S&#7889; b&aacute;o c&aacute;o</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(summary?.reportCount))}</td>
    <td class="meta-label">Tr&#7841;ng th&aacute;i</td>
    <td class="meta-value">${filters.statusLabel || filters.status ? this.escapeHtml(filters.statusLabel ?? filters.status) : 'T&#7845;t c&#7843;'}</td>
  </tr>
  <tr>
    <td class="meta-label">N&#259;m</td>
    <td class="meta-value">${filters.year ? this.escapeHtml(filters.year) : 'T&#7845;t c&#7843;'}</td>
    <td class="meta-label">K&#7923; b&aacute;o c&aacute;o</td>
    <td class="meta-value">${filters.periodTypeLabel || filters.periodType ? this.escapeHtml(filters.periodTypeLabel ?? filters.periodType) : 'T&#7845;t c&#7843;'}</td>
  </tr>
  <tr>
    <td class="meta-label">T&#7881;nh/th&agrave;nh ph&#7889;</td>
    <td class="meta-value">${filters.provinceCity ? this.escapeHtml(filters.provinceCity) : 'T&#7845;t c&#7843;'}</td>
    <td class="meta-label">Ph&#432;&#7901;ng/x&atilde;</td>
    <td class="meta-value">${filters.wardCommune ? this.escapeHtml(filters.wardCommune) : 'T&#7845;t c&#7843;'}</td>
  </tr>
</table>`;
  }

  private buildReportInfoTable(report: any) {
    const period = report?.reportPeriod ?? {};
    const business = report?.business ?? {};

    return `<div class="section-title">Th&ocirc;ng tin doanh nghi&#7879;p</div>
<table class="meta-table">
  <colgroup>
    <col style="width: 18%" />
    <col style="width: 32%" />
    <col style="width: 18%" />
    <col style="width: 32%" />
  </colgroup>
  <tr>
    <td class="meta-label">T&ecirc;n doanh nghi&#7879;p</td>
    <td class="meta-value" colspan="3">${this.escapeHtml(business.businessName ?? report?.businessName)}</td>
  </tr>
  <tr>
    <td class="meta-label">M&atilde; s&#7889; thu&#7871;</td>
    <td class="meta-value">${this.escapeHtml(business.taxCode ?? report?.taxCode)}</td>
    <td class="meta-label">Lo&#7841;i h&igrave;nh</td>
    <td class="meta-value">${this.escapeHtml(business.businessType ?? report?.businessType)}</td>
  </tr>
  <tr>
    <td class="meta-label">Ng&agrave;nh ngh&#7873;</td>
    <td class="meta-value" colspan="3">${this.escapeHtml(this.joinDisplay([business.industryCode ?? report?.industryCode, business.industryName ?? report?.industryName]))}</td>
  </tr>
  <tr>
    <td class="meta-label">T&ecirc;n b&aacute;o c&aacute;o</td>
    <td class="meta-value">${this.escapeHtml(period.reportName)}</td>
    <td class="meta-label">K&#7923; b&aacute;o c&aacute;o</td>
    <td class="meta-value">${this.escapeHtml(this.joinDisplay([period.year, period.periodTypeLabel ?? period.periodType]))}</td>
  </tr>
  <tr>
    <td class="meta-label">Th&#7901;i gian</td>
    <td class="meta-value">${this.escapeHtml(this.joinDisplay([period.startDate, period.endDate], ' - '))}</td>
    <td class="meta-label">Tr&#7841;ng th&aacute;i</td>
    <td class="meta-value">${this.escapeHtml(report?.statusLabel ?? report?.status)}</td>
  </tr>
  <tr>
    <td class="meta-label">Ng&agrave;y g&#7917;i</td>
    <td class="meta-value">${this.escapeHtml(this.formatDateForOffice(report?.submittedAt))}</td>
    <td class="meta-label">Ng&agrave;y ti&#7871;p nh&#7853;n</td>
    <td class="meta-value">${this.escapeHtml(this.formatDateForOffice(report?.receivedAt))}</td>
  </tr>
</table>
<div class="section-title">Th&ocirc;ng tin lao &#273;&#7897;ng</div>
<table class="meta-table">
  <colgroup>
    <col style="width: 18%" />
    <col style="width: 32%" />
    <col style="width: 18%" />
    <col style="width: 32%" />
  </colgroup>
  <tr>
    <td class="meta-label">T&#7893;ng lao &#273;&#7897;ng</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(report?.totalEmployees))}</td>
    <td class="meta-label">Lao &#273;&#7897;ng n&#7919;</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(report?.femaleEmployees))}</td>
  </tr>
  <tr>
    <td class="meta-label">T&#7893;ng qu&#7929; l&#432;&#417;ng</td>
    <td class="meta-value number" colspan="3">${this.escapeHtml(this.formatNumber(report?.totalPayroll))}</td>
  </tr>
</table>`;
  }

  private buildMetricTable(title: string, source: any) {
    return `<div class="section-title">${this.escapeHtml(title)}</div>
<table class="metric-table">
  ${this.buildMetricColGroup()}
  ${this.buildMetricHeaderRows()}
  <tr class="total-row">${this.getMetricExportColumns()
    .map((column) => this.numberCell(source?.[column.key]))
    .join('')}</tr>
</table>`;
  }

  private buildCatalogMetricTable(title: string, rows: any[]) {
    const normalizedRows = Array.isArray(rows) ? rows : [];

    return `<div class="section-title">${this.escapeHtml(title)}</div>
<table class="metric-table">
  <colgroup>
    <col style="width: 7%" />
    <col style="width: 25%" />
    ${this.getMetricExportColumns()
      .map(() => '<col style="width: 6.18%" />')
      .join('')}
  </colgroup>
  ${this.buildMetricHeaderRows([
    { labelHtml: 'M&atilde; s&#7889;', width: '7%' },
    {
      labelHtml: 'T&ecirc;n ch&#7881; ti&ecirc;u th&#7889;ng k&ecirc;',
      width: '25%',
    },
  ])}
  ${
    normalizedRows.length
      ? normalizedRows
          .map(
            (row) =>
              `<tr><td class="center">${this.escapeHtml(row?.catalog?.code)}</td><td class="metric-name">${this.escapeHtml(row?.catalog?.name)}</td>${this.getMetricExportColumns()
                .map((column) => this.numberCell(row?.totals?.[column.key]))
                .join('')}</tr>`,
          )
          .join('\n')
      : `<tr><td colspan="${this.getMetricExportColumns().length + 2}" class="empty">Ch&#432;a c&oacute; d&#7919; li&#7879;u</td></tr>`
  }
</table>`;
  }

  private buildReportDetailTable(title: string, details: any[]) {
    const normalizedDetails = Array.isArray(details) ? details : [];
    const damageColumns = [
      { labelHtml: 'Chi ph&iacute;<br/>y t&#7871;', key: 'medicalCost' },
      {
        labelHtml:
          'Tr&#7843; l&#432;&#417;ng<br/>trong TG &#273;i&#7873;u tr&#7883;',
        key: 'salaryPaymentCost',
      },
      {
        labelHtml: 'B&#7891;i th&#432;&#7901;ng/<br/>tr&#7907; c&#7845;p',
        key: 'allowanceCost',
      },
      { labelHtml: 'T&#7893;ng<br/>chi ph&iacute;', key: 'totalCost' },
      { labelHtml: 'S&#7889; ng&agrave;y<br/>ngh&#7881;', key: 'daysOff' },
      {
        labelHtml: 'Thi&#7879;t h&#7841;i<br/>t&agrave;i s&#7843;n',
        key: 'propertyDamage',
      },
    ];

    return `<div class="section-title">${this.escapeHtml(title)}</div>
<table class="metric-table">
  <colgroup>
    <col style="width: 4%" />
    <col style="width: 14%" />
    <col style="width: 13%" />
    <col style="width: 13%" />
    <col style="width: 8%" />
    ${this.getMetricExportColumns()
      .map(() => '<col style="width: 4.8%" />')
      .join('')}
    ${damageColumns.map(() => '<col style="width: 6%" />').join('')}
  </colgroup>
  <tr>
    <th rowspan="2">STT</th>
    <th rowspan="2">Nguy&ecirc;n nh&acirc;n x&#7843;y ra TNL&#272;</th>
    <th rowspan="2">Y&#7871;u t&#7889; g&acirc;y ch&#7845;n th&#432;&#417;ng</th>
    <th rowspan="2">Ngh&#7873; nghi&#7879;p</th>
    <th rowspan="2">Ghi ch&uacute;</th>
    <th colspan="3">S&#7889; v&#7909; (v&#7909;)</th>
    <th colspan="8">S&#7889; ng&#432;&#7901;i b&#7883; n&#7841;n (ng&#432;&#7901;i)</th>
    <th colspan="6">Thi&#7879;t h&#7841;i</th>
  </tr>
  <tr>
    ${this.getMetricExportColumns()
      .map((column) => `<th>${column.labelHtml}</th>`)
      .join('')}
    ${damageColumns.map((column) => `<th>${column.labelHtml}</th>`).join('')}
  </tr>
  ${
    normalizedDetails.length
      ? normalizedDetails
          .map(
            (detail, index) => `<tr>
    <td class="center">${index + 1}</td>
    <td>${this.escapeHtml(this.catalogDisplay(detail.accidentCauseCatalog))}</td>
    <td>${this.escapeHtml(this.catalogDisplay(detail.injuryFactorCatalog))}</td>
    <td>${this.escapeHtml(this.catalogDisplay(detail.occupationCatalog))}</td>
    <td>${this.escapeHtml(detail.note)}</td>
    ${this.getMetricExportColumns()
      .map((column) => this.numberCell(detail?.[column.key]))
      .join('')}
    ${damageColumns.map((column) => this.numberCell(detail?.[column.key])).join('')}
  </tr>`,
          )
          .join('\n')
      : `<tr><td colspan="${this.getMetricExportColumns().length + damageColumns.length + 5}" class="empty">Ch&#432;a c&oacute; d&#7919; li&#7879;u</td></tr>`
  }
</table>`;
  }

  private buildDamageTable(source: any) {
    return `<div class="section-title">II. Thi&#7879;t h&#7841;i do tai n&#7841;n lao &#273;&#7897;ng</div>
<table class="meta-table">
  <colgroup>
    <col style="width: 28%" />
    <col style="width: 22%" />
    <col style="width: 28%" />
    <col style="width: 22%" />
  </colgroup>
  <tr>
    <td class="meta-label">T&#7893;ng s&#7889; ng&agrave;y ngh&#7881; v&igrave; TNL&#272;</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.totalDaysOff ?? source?.daysOff))}</td>
    <td class="meta-label">Thi&#7879;t h&#7841;i t&agrave;i s&#7843;n</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.propertyDamage))}</td>
  </tr>
  <tr>
    <td class="meta-label">Chi ph&iacute; y t&#7871;</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.medicalCost))}</td>
    <td class="meta-label">Tr&#7843; l&#432;&#417;ng trong th&#7901;i gian &#273;i&#7873;u tr&#7883;</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.salaryPaymentCost))}</td>
  </tr>
  <tr class="total-row">
    <td class="meta-label">B&#7891;i th&#432;&#7901;ng/tr&#7907; c&#7845;p</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.allowanceCost))}</td>
    <td class="meta-label">T&#7893;ng s&#7889; ti&#7873;n chi ph&iacute;</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.totalCost))}</td>
  </tr>
</table>`;
  }

  private buildAttachmentTable(attachments: any[]) {
    const normalizedAttachments = Array.isArray(attachments) ? attachments : [];

    return `<div class="section-title">T&#7879;p &#273;&iacute;nh k&egrave;m</div>
<table class="metric-table">
  <colgroup>
    <col style="width: 6%" />
    <col style="width: 18%" />
    <col style="width: 24%" />
    <col style="width: 24%" />
    <col style="width: 28%" />
  </colgroup>
  <tr><th>STT</th><th>Lo&#7841;i t&#7879;p</th><th>T&ecirc;n hi&#7875;n th&#7883;</th><th>T&ecirc;n file g&#7889;c</th><th>&#272;&#432;&#7901;ng d&#7851;n</th></tr>
  ${
    normalizedAttachments.length
      ? normalizedAttachments
          .map(
            (attachment, index) =>
              `<tr><td class="center">${index + 1}</td><td>${this.escapeHtml(attachment.type)}</td><td>${this.escapeHtml(attachment.displayName)}</td><td>${this.escapeHtml(attachment.originalName)}</td><td>${this.escapeHtml(attachment.fileUrl)}</td></tr>`,
          )
          .join('\n')
      : '<tr><td colspan="5" class="empty">Ch&#432;a c&oacute; t&#7879;p &#273;&iacute;nh k&egrave;m</td></tr>'
  }
</table>`;
  }

  private buildMetricColGroup() {
    return `<colgroup>${this.getMetricExportColumns()
      .map(() => '<col style="width: 9.09%" />')
      .join('')}</colgroup>`;
  }

  private buildMetricHeaderRows(
    leadingColumns: Array<{ labelHtml: string; width?: string }> = [],
  ) {
    const leadingHeader = leadingColumns
      .map((column) => `<th rowspan="2">${column.labelHtml}</th>`)
      .join('');

    return `<tr>
    ${leadingHeader}
    <th colspan="3">S&#7889; v&#7909; (v&#7909;)</th>
    <th colspan="8">S&#7889; ng&#432;&#7901;i b&#7883; n&#7841;n (ng&#432;&#7901;i)</th>
  </tr>
  <tr>
    ${this.getMetricExportColumns()
      .map((column) => `<th>${column.labelHtml}</th>`)
      .join('')}
  </tr>`;
  }

  private getMetricExportColumns() {
    return [
      { labelHtml: 'T&#7893;ng<br/>s&#7889;', key: 'totalAccidents' },
      {
        labelHtml: 'C&oacute; ng&#432;&#7901;i<br/>ch&#7871;t',
        key: 'fatalAccidents',
      },
      {
        labelHtml:
          'C&oacute; t&#7915; 2<br/>ng&#432;&#7901;i b&#7883; n&#7841;n',
        key: 'accidentsWithTwoOrMoreVictims',
      },
      { labelHtml: 'T&#7893;ng<br/>s&#7889;', key: 'totalVictims' },
      { labelHtml: 'Lao &#273;&#7897;ng<br/>n&#7919;', key: 'femaleVictims' },
      { labelHtml: 'Ng&#432;&#7901;i<br/>ch&#7871;t', key: 'deathVictims' },
      {
        labelHtml: 'Th&#432;&#417;ng<br/>n&#7863;ng',
        key: 'severeInjuryVictims',
      },
      {
        labelHtml: 'B&#7883; n&#7841;n<br/>kh&ocirc;ng QL',
        key: 'victimsNotUnderManagement',
      },
      {
        labelHtml: 'Lao &#273;&#7897;ng n&#7919;<br/>kh&ocirc;ng QL',
        key: 'femaleVictimsNotUnderManagement',
      },
      {
        labelHtml: 'Ch&#7871;t<br/>kh&ocirc;ng QL',
        key: 'deathVictimsNotUnderManagement',
      },
      {
        labelHtml: 'Th&#432;&#417;ng n&#7863;ng<br/>kh&ocirc;ng QL',
        key: 'severeInjuryVictimsNotUnderManagement',
      },
    ];
  }

  private tableRow(cells: unknown[], cellTag: 'td' | 'th' = 'td') {
    return `<tr>${cells
      .map((cell) => `<${cellTag}>${this.escapeHtml(cell)}</${cellTag}>`)
      .join('')}</tr>`;
  }

  private numberCell(value: unknown) {
    return `<td class="number">${this.escapeHtml(this.formatNumber(value))}</td>`;
  }

  private formatNumber(value: unknown) {
    const numericValue = Number(value ?? 0);

    return new Intl.NumberFormat('vi-VN').format(
      Number.isFinite(numericValue) ? numericValue : 0,
    );
  }

  private formatDateForOffice(value: unknown) {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString('vi-VN');
  }

  private catalogDisplay(catalog: any) {
    if (!catalog) {
      return '';
    }

    return this.joinDisplay([catalog.code, catalog.name]);
  }

  private joinDisplay(values: unknown[], separator = ' - ') {
    return values
      .filter(
        (value) =>
          value !== undefined && value !== null && String(value).trim(),
      )
      .map((value) => String(value).trim())
      .join(separator);
  }

  private escapeHtml(value: unknown) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private slugify(value: string) {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);

    return slug || 'bao-cao-tnld';
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

  private toTrimmedValue(value: unknown) {
    if (value === undefined || value === null) {
      return undefined;
    }

    const trimmedValue = String(value).trim();
    return trimmedValue ? trimmedValue : undefined;
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

  private mapReport(report: LaborAccidentReport, includeDetails: boolean) {
    const access = this.getReportPeriodAccess(
      report.business,
      report.reportPeriod,
      report.status,
    );
    const attachments =
      report.attachments?.map((attachment) =>
        this.mapReportAttachment(attachment),
      ) ?? [];
    const currentAttachment =
      attachments.find(
        (attachment) =>
          attachment.type ===
            LaborAccidentReportAttachmentType.STAMPED_REPORT &&
          attachment.isCurrent,
      ) ?? null;

    return {
      id: report.id,
      reportPeriod: {
        id: report.reportPeriod.id,
        reportName: report.reportPeriod.reportName,
        year: report.reportPeriod.year,
        periodType: report.reportPeriod.periodType,
        periodTypeLabel: PERIOD_TYPE_LABELS[report.reportPeriod.periodType],
        startDate: this.formatDateInput(report.reportPeriod.startDate),
        endDate: this.formatDateInput(report.reportPeriod.endDate),
      },
      business: {
        id: report.business?.id ?? null,
        businessName: report.businessName,
        taxCode: report.taxCode,
        businessType: report.businessType,
        industryCode: report.industryCode,
        industryName: report.industryName,
        provinceCity: report.business?.provinceCity ?? null,
        wardCommune: report.business?.wardCommune ?? null,
        address: report.business?.address ?? null,
        phone: report.business?.phone ?? null,
        agencyPhone: report.business?.agencyPhone ?? null,
        email: report.business?.email ?? null,
        representativeName: report.business?.representativeName ?? null,
        representativePhone: report.business?.representativePhone ?? null,
      },
      totalEmployees: Number(report.totalEmployees) || 0,
      femaleEmployees: Number(report.femaleEmployees) || 0,
      totalPayroll: Number(report.totalPayroll) || 0,
      totalAccidents: Number(report.totalAccidents) || 0,
      fatalAccidents: Number(report.fatalAccidents) || 0,
      accidentsWithTwoOrMoreVictims:
        Number(report.accidentsWithTwoOrMoreVictims) || 0,
      totalVictims: Number(report.totalVictims) || 0,
      femaleVictims: Number(report.femaleVictims) || 0,
      deathVictims: Number(report.deathVictims) || 0,
      severeInjuryVictims: Number(report.severeInjuryVictims) || 0,
      victimsNotUnderManagement: Number(report.victimsNotUnderManagement) || 0,
      femaleVictimsNotUnderManagement:
        Number(report.femaleVictimsNotUnderManagement) || 0,
      deathVictimsNotUnderManagement:
        Number(report.deathVictimsNotUnderManagement) || 0,
      severeInjuryVictimsNotUnderManagement:
        Number(report.severeInjuryVictimsNotUnderManagement) || 0,
      medicalCost: Number(report.medicalCost) || 0,
      salaryPaymentCost: Number(report.salaryPaymentCost) || 0,
      allowanceCost: Number(report.allowanceCost) || 0,
      totalCost: Number(report.totalCost) || 0,
      totalDaysOff: Number(report.totalDaysOff) || 0,
      propertyDamage: Number(report.propertyDamage) || 0,
      status: report.status,
      statusLabel: REPORT_STATUS_LABELS[report.status],
      ...access,
      submittedAt: report.submittedAt,
      receivedAt: report.receivedAt,
      rejectReason: report.rejectReason || null,
      details: includeDetails
        ? (report.details?.map((detail) => this.mapDetail(detail)) ?? [])
        : undefined,
      currentAttachment,
      attachments,
      attachmentCount: attachments.length,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  private mapReportAttachment(attachment: LaborAccidentReportAttachment) {
    return {
      id: attachment.id,
      type: attachment.type,
      displayName: attachment.displayName,
      originalName: attachment.originalName,
      fileUrl: attachment.fileUrl,
      mimetype: attachment.mimetype,
      size: attachment.size,
      version: attachment.version,
      isCurrent: attachment.isCurrent,
      supersededAt: attachment.supersededAt,
      uploadedByUserId: attachment.uploadedByUser?.id ?? null,
      uploadedByUsername: attachment.uploadedByUser?.username ?? null,
      createdAt: attachment.createdAt,
    };
  }

  private mapDetail(detail: LaborAccidentReportDetail) {
    return {
      id: detail.id,
      section: detail.section,
      orderNo: detail.orderNo,
      accidentCauseCatalog: this.mapCatalogSnapshot(
        detail.accidentCauseCatalog,
        detail.accidentCauseCodeSnapshot,
        detail.accidentCauseNameSnapshot,
      ),
      injuryFactorCatalog: this.mapCatalogSnapshot(
        detail.injuryFactorCatalog,
        detail.injuryFactorCodeSnapshot,
        detail.injuryFactorNameSnapshot,
      ),
      occupationCatalog: this.mapCatalogSnapshot(
        detail.occupationCatalog,
        detail.occupationCodeSnapshot,
        detail.occupationNameSnapshot,
      ),
      note: detail.note,
      totalAccidents: Number(detail.totalAccidents) || 0,
      fatalAccidents: Number(detail.fatalAccidents) || 0,
      accidentsWithTwoOrMoreVictims:
        Number(detail.accidentsWithTwoOrMoreVictims) || 0,
      totalVictims: Number(detail.totalVictims) || 0,
      femaleVictims: Number(detail.femaleVictims) || 0,
      deathVictims: Number(detail.deathVictims) || 0,
      severeInjuryVictims: Number(detail.severeInjuryVictims) || 0,
      victimsNotUnderManagement: Number(detail.victimsNotUnderManagement) || 0,
      femaleVictimsNotUnderManagement:
        Number(detail.femaleVictimsNotUnderManagement) || 0,
      deathVictimsNotUnderManagement:
        Number(detail.deathVictimsNotUnderManagement) || 0,
      severeInjuryVictimsNotUnderManagement:
        Number(detail.severeInjuryVictimsNotUnderManagement) || 0,
      medicalCost: Number(detail.medicalCost) || 0,
      salaryPaymentCost: Number(detail.salaryPaymentCost) || 0,
      allowanceCost: Number(detail.allowanceCost) || 0,
      totalCost: Number(detail.totalCost) || 0,
      daysOff: Number(detail.daysOff) || 0,
      propertyDamage: Number(detail.propertyDamage) || 0,
    };
  }

  private mapCatalog(catalog: LaborAccidentCatalog | null) {
    if (!catalog) {
      return null;
    }

    return {
      id: catalog.id,
      type: catalog.type,
      code: catalog.code,
      name: catalog.name,
      level: catalog.level,
    };
  }

  private mapCatalogSnapshot(
    catalog: LaborAccidentCatalog | null,
    codeSnapshot: string | null,
    nameSnapshot: string | null,
  ) {
    if (!catalog && !codeSnapshot && !nameSnapshot) {
      return null;
    }

    return {
      id: catalog?.id ?? null,
      type: catalog?.type ?? null,
      code: codeSnapshot ?? catalog?.code ?? null,
      name: nameSnapshot ?? catalog?.name ?? null,
      level: catalog?.level ?? null,
    };
  }

  async bulkReceiveDepartmentReports(userId: number, reportIds: number[]) {
    const user = await this.findUser(userId);
    const results: LaborAccidentReport[] = [];
    for (const id of reportIds) {
      try {
        const report = await this.findReportByIdForDepartment(id);
        if (report.status === LaborAccidentReportStatus.DRAFT) {
          continue;
        }
        if (report.status === LaborAccidentReportStatus.RECEIVED) {
          continue;
        }
        if (report.status === LaborAccidentReportStatus.REJECTED) {
          continue;
        }
        const oldStatus = report.status;
        const saved = await this.dataSource.transaction(async (manager) => {
          report.status = LaborAccidentReportStatus.RECEIVED;
          report.receivedAt = new Date();
          report.receivedByUser = user;
          const receivedReport = await manager.save(
            LaborAccidentReport,
            report,
          );
          await this.createReportAuditLog(
            {
              report: receivedReport,
              action: LaborAccidentReportAuditAction.RECEIVE,
              oldStatus,
              newStatus: LaborAccidentReportStatus.RECEIVED,
              actorUser: user,
              metadata: {
                isBulkAction: true,
                reportPeriodId: report.reportPeriod.id,
                reportPeriodYear: report.reportPeriod.year,
                reportPeriodType: report.reportPeriod.periodType,
              },
            },
            manager,
          );

          return receivedReport;
        });
        results.push(saved);
      } catch (err) {
        console.error(`Error bulk receiving report ${id}:`, err);
      }
    }
    return {
      message: `Duyệt thành công ${results.length}/${reportIds.length} báo cáo`,
      success: true,
    };
  }

  async bulkRejectDepartmentReports(
    userId: number,
    reports: { id: number; rejectReason: string }[],
  ) {
    const user = await this.findUser(userId);
    const results: LaborAccidentReport[] = [];
    for (const item of reports) {
      try {
        const report = await this.findReportByIdForDepartment(item.id);
        if (
          report.status === LaborAccidentReportStatus.DRAFT ||
          report.status === LaborAccidentReportStatus.REJECTED
        ) {
          continue;
        }
        const oldStatus = report.status;
        const saved = await this.dataSource.transaction(async (manager) => {
          report.status = LaborAccidentReportStatus.REJECTED;
          report.rejectReason = item.rejectReason;
          report.receivedAt = null;
          report.receivedByUser = null;
          const rejectedReport = await manager.save(
            LaborAccidentReport,
            report,
          );
          await this.createReportAuditLog(
            {
              report: rejectedReport,
              action: LaborAccidentReportAuditAction.REJECT,
              oldStatus,
              newStatus: LaborAccidentReportStatus.REJECTED,
              actorUser: user,
              reason: item.rejectReason,
              metadata: {
                isBulkAction: true,
                reportPeriodId: report.reportPeriod.id,
                reportPeriodYear: report.reportPeriod.year,
                reportPeriodType: report.reportPeriod.periodType,
              },
            },
            manager,
          );

          return rejectedReport;
        });
        results.push(saved);
      } catch (err) {
        console.error(`Error bulk rejecting report ${item.id}:`, err);
      }
    }
    return {
      message: `Từ chối thành công ${results.length}/${reports.length} báo cáo`,
      success: true,
    };
  }
}

@Controller('labor-accident-reports/admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN')
@ApiTags('Báo cáo TNLĐ Sở')
@ApiBearerAuth('access-token')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  LaborAccidentReportResponseDto,
  LaborAccidentReportListResponseDto,
)
export class LaborAccidentReportAdminController {
  constructor(private readonly reportService: LaborAccidentReportService) {}

  @Get()
  @Permissions('LABOR_C_REPORT_VIEW')
  @ApiOperation({
    summary: 'Danh sách báo cáo TNLĐ cho role Sở',
    description:
      'Mặc định không lấy báo cáo nháp. Truyền status=DRAFT nếu cần kiểm tra dữ liệu test.',
  })
  @ApiOkResponse({
    description: 'Danh sách báo cáo TNLĐ kèm phân trang',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentReportListResponseDto) },
          },
        },
      ],
    },
  })
  getReports(@Query() query: ListLaborAccidentReportsQueryDto) {
    return this.reportService.getDepartmentReports(query);
  }

  @Get('dashboard')
  @Permissions('LABOR_C_REPORT_DASHBOARD')
  @ApiOperation({
    summary: 'Dashboard điều hành tiến độ báo cáo TNLĐ cho role Sở',
    description:
      'Tổng hợp tiến độ theo kỳ/năm/địa bàn, bao gồm cảnh báo sắp hết hạn, quá hạn, bị từ chối chưa gửi lại và báo cáo đang chờ tiếp nhận.',
  })
  @ApiOkResponse({
    description: 'Dashboard điều hành tiến độ báo cáo TNLĐ',
    type: ApiSuccessResponseDto,
  })
  getDashboard(@Query() query: LaborAccidentReportDashboardQueryDto) {
    return this.reportService.getDepartmentReportDashboard(query);
  }

  @Get('summary')
  @Permissions('LABOR_C_REPORT_VIEW')
  @ApiOperation({
    summary: 'Báo cáo tổng hợp TNLĐ cho role Sở',
    description:
      'Tổng hợp theo kỳ/năm/địa bàn/trạng thái, kèm nhóm nguyên nhân, yếu tố chấn thương, nghề nghiệp và khoản 2 điều 39.',
  })
  @ApiOkResponse({
    description: 'Báo cáo tổng hợp TNLĐ',
    type: ApiSuccessResponseDto,
  })
  getSummary(@Query() query: LaborAccidentReportSummaryQueryDto) {
    return this.reportService.getDepartmentReportSummary(query);
  }

  @Get('summary/export/excel')
  @Permissions('LABOR_C_REPORT_EXPORT')
  @ApiOperation({
    summary: 'Xuất Excel báo cáo tổng hợp TNLĐ cho role Sở',
  })
  @ApiOkResponse({
    description: 'File Excel báo cáo tổng hợp TNLĐ',
  })
  async exportSummaryExcel(
    @Query() query: LaborAccidentReportSummaryQueryDto,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportDepartmentSummary(
      query,
      'excel',
    );

    sendOfficeExport(response, file);
  }

  @Get('summary/export/word')
  @Permissions('LABOR_C_REPORT_EXPORT')
  @ApiOperation({
    summary: 'Xuất Word báo cáo tổng hợp TNLĐ cho role Sở',
  })
  @ApiOkResponse({
    description: 'File Word báo cáo tổng hợp TNLĐ',
  })
  async exportSummaryWord(
    @Query() query: LaborAccidentReportSummaryQueryDto,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportDepartmentSummary(
      query,
      'word',
    );

    sendOfficeExport(response, file);
  }

  @Get(':id/export/excel')
  @Permissions('LABOR_C_REPORT_EXPORT')
  @ApiOperation({
    summary: 'Xuất Excel chi tiết báo cáo TNLĐ cho role Sở',
  })
  @ApiOkResponse({
    description: 'File Excel chi tiết báo cáo TNLĐ',
  })
  async exportReportExcel(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportDepartmentReport(id, 'excel');

    sendOfficeExport(response, file);
  }

  @Get(':id/export/word')
  @Permissions('LABOR_C_REPORT_EXPORT')
  @ApiOperation({
    summary: 'Xuất Word chi tiết báo cáo TNLĐ cho role Sở',
  })
  @ApiOkResponse({
    description: 'File Word chi tiết báo cáo TNLĐ',
  })
  async exportReportWord(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportDepartmentReport(id, 'word');

    sendOfficeExport(response, file);
  }

  @Post(':id/receive')
  @Permissions('LABOR_C_REPORT_RECEIVE')
  @ApiOperation({
    summary: 'Sở tiếp nhận báo cáo TNLĐ',
    description:
      'Chỉ tiếp nhận báo cáo đã được doanh nghiệp gửi. Sau khi tiếp nhận, báo cáo bị khóa chỉnh sửa ở phía doanh nghiệp.',
  })
  @ApiOkResponse({
    description: 'Báo cáo sau khi được Sở tiếp nhận',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentReportResponseDto) },
          },
        },
      ],
    },
  })
  receiveReport(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportService.receiveDepartmentReport(currentUser.id, id);
  }

  @Get(':id/audit-logs')
  @Permissions('LABOR_C_REPORT_AUDIT_VIEW')
  @ApiOperation({
    summary: 'Lịch sử xử lý báo cáo TNLĐ cho role Sở',
  })
  @ApiOkResponse({
    description: 'Timeline lịch sử xử lý báo cáo TNLĐ',
    type: ApiSuccessResponseDto,
  })
  getReportAuditLogs(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.getDepartmentReportAuditLogs(id);
  }

  @Get(':id')
  @Permissions('LABOR_C_REPORT_VIEW')
  @ApiOperation({
    summary: 'Chi tiết báo cáo TNLĐ cho role Sở',
  })
  @ApiOkResponse({
    description: 'Chi tiết báo cáo TNLĐ',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentReportResponseDto) },
          },
        },
      ],
    },
  })
  getReportDetail(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.getDepartmentReportDetail(id);
  }

  @Post('bulk-receive')
  @Permissions('LABOR_C_REPORT_RECEIVE')
  @ApiOperation({
    summary: 'Duyệt hàng loạt báo cáo TNLĐ',
  })
  bulkReceive(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: { ids: number[] },
  ) {
    return this.reportService.bulkReceiveDepartmentReports(
      currentUser.id,
      body.ids,
    );
  }

  @Post('bulk-reject')
  @Permissions('LABOR_C_REPORT_RECEIVE')
  @ApiOperation({
    summary: 'Từ chối hàng loạt báo cáo TNLĐ',
  })
  bulkReject(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: {
      ids?: number[];
      rejectReason?: string;
      reports?: { id: number; rejectReason: string }[];
    },
  ) {
    let reportsToReject: { id: number; rejectReason: string }[] = [];
    if (body.reports && Array.isArray(body.reports)) {
      reportsToReject = body.reports;
    } else if (body.ids && Array.isArray(body.ids)) {
      const reason = body.rejectReason || '';
      reportsToReject = body.ids.map((id) => ({ id, rejectReason: reason }));
    }
    return this.reportService.bulkRejectDepartmentReports(
      currentUser.id,
      reportsToReject,
    );
  }
}

@Controller('labor-accident-reports/my')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER')
@ApiTags('Báo cáo TNLĐ doanh nghiệp')
@ApiBearerAuth('access-token')
export class LaborAccidentReportBusinessExportController {
  constructor(private readonly reportService: LaborAccidentReportService) {}

  @Get(':id/export/excel')
  @ApiOperation({
    summary: 'Xuất Excel chi tiết báo cáo TNLĐ của doanh nghiệp đang đăng nhập',
  })
  @ApiOkResponse({
    description: 'File Excel chi tiết báo cáo TNLĐ',
  })
  async exportMyReportExcel(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportMyReport(
      currentUser.id,
      id,
      'excel',
    );

    sendOfficeExport(response, file);
  }

  @Get(':id/export/word')
  @ApiOperation({
    summary: 'Xuất Word chi tiết báo cáo TNLĐ của doanh nghiệp đang đăng nhập',
  })
  @ApiOkResponse({
    description: 'File Word chi tiết báo cáo TNLĐ',
  })
  async exportMyReportWord(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportMyReport(
      currentUser.id,
      id,
      'word',
    );

    sendOfficeExport(response, file);
  }
}

queueMicrotask(() => {
  try {
    const { AppModule } = require('../app.module');
    const controllers =
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AppModule) ?? [];

    const extraControllers = [
      LaborAccidentReportAdminController,
      LaborAccidentReportBusinessExportController,
    ];
    const nextControllers = [...controllers];

    for (const controller of extraControllers) {
      if (!nextControllers.includes(controller)) {
        nextControllers.push(controller);
      }
    }

    if (nextControllers.length !== controllers.length) {
      Reflect.defineMetadata(
        MODULE_METADATA.CONTROLLERS,
        nextControllers,
        AppModule,
      );
    }
  } catch {
    // AppModule metadata is patched only to work around a local write lock.
  }
});

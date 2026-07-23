import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import {
  LaborAccidentReport,
  LaborAccidentReportStatus,
} from './labor-accident-report.entity';
import { User } from './user.entity';

export enum LaborAccidentReportAuditAction {
  CREATE_DRAFT = 'CREATE_DRAFT',
  UPDATE_DRAFT = 'UPDATE_DRAFT',
  SUBMIT = 'SUBMIT',
  RESUBMIT = 'RESUBMIT',
  RECEIVE = 'RECEIVE',
  REJECT = 'REJECT',
  BACKFILL = 'BACKFILL',
}

@Entity('labor_accident_report_audit_logs')
@Index('IDX_lar_audit_report_created_at', ['report', 'createdAt'])
@Index('IDX_lar_audit_actor_user_id', ['actorUser'])
@Index('IDX_lar_audit_action', ['action'])
export class LaborAccidentReportAuditLog {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => LaborAccidentReport, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'report_id',
  })
  report!: LaborAccidentReport;

  @Column({
    type: 'varchar',
    length: 40,
  })
  action!: LaborAccidentReportAuditAction;

  @Column({
    name: 'old_status',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  oldStatus!: LaborAccidentReportStatus | null;

  @Column({
    name: 'new_status',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  newStatus!: LaborAccidentReportStatus | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'actor_user_id',
  })
  actorUser!: User | null;

  @Column({
    name: 'actor_name_snapshot',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  actorNameSnapshot!: string | null;

  @Column({
    name: 'actor_role_snapshot',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  actorRoleSnapshot!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  message!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  reason!: string | null;

  @Column({
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;
}

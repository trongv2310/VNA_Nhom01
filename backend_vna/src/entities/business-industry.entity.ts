import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Business } from './business.entity';

@Entity('business_industries')
@Check('CHK_business_industries_level', '"level" BETWEEN 1 AND 4')
@Index('UQ_business_industries_code', ['code'], { unique: true })
@Index('IDX_business_industries_parent_id', ['parent'])
@Index('IDX_business_industries_level_active', ['level', 'isActive'])
export class BusinessIndustry {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({
    type: 'varchar',
    length: 20,
  })
  code!: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name!: string;

  @Column({
    type: 'integer',
  })
  level!: number;

  @ManyToOne(() => BusinessIndustry, (industry) => industry.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'parent_id',
  })
  parent!: BusinessIndustry | null;

  @OneToMany(() => BusinessIndustry, (industry) => industry.parent)
  children!: BusinessIndustry[];

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @Column({
    name: 'sort_order',
    type: 'integer',
    default: 0,
  })
  sortOrder!: number;

  @OneToMany(() => Business, (business) => business.industryCatalog)
  businesses!: Business[];

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}

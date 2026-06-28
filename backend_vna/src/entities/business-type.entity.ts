import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Business } from './business.entity';

@Entity('business_types')
@Index('UQ_business_types_code', ['code'], { unique: true })
@Index('UQ_business_types_name', ['name'], { unique: true })
export class BusinessType {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({
    type: 'varchar',
    length: 20,
  })
  code!: string;

  @Column({
    type: 'varchar',
    length: 150,
  })
  name!: string;

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

  @OneToMany(() => Business, (business) => business.businessTypeCatalog)
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

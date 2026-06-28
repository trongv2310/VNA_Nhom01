import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RolePermission } from './role-permission.entity';

export enum PermissionType {
  GROUP = 'GROUP',
  COMPONENT = 'COMPONENT',
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({
    length: 80,
    unique: true,
  })
  code!: string;

  @Column({
    length: 150,
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  type!: PermissionType;

  @ManyToOne(() => Permission, (permission) => permission.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'parent_id',
  })
  parent!: Permission | null;

  @OneToMany(() => Permission, (permission) => permission.parent)
  children!: Permission[];

  @Column({
    name: 'sort_order',
    type: 'int',
    default: 0,
  })
  sortOrder!: number;

  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions!: RolePermission[];

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}

import 'reflect-metadata';

import { resolve } from 'node:path';
import { DataSource } from 'typeorm';

try {
  process.loadEnvFile(resolve(__dirname, '../../.env'));
} catch {
  // Environment variables may already be provided by the runtime.
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  migrationsTableName: 'migrations',
  migrations: [resolve(__dirname, 'migrations/*.{ts,js}')],
});

export default AppDataSource;

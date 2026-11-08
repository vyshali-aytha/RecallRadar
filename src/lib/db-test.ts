import { pool } from './db';

export type DbTestResult = {
  success: boolean;
  dbName: string;
  message: string;
  tableNames: string[];
  serverStatus?: unknown;
  error?: string;
};

export async function testMysqlConnection(): Promise<DbTestResult> {
  const dbName = process.env.DB_NAME ?? 'recallradar_db';

  try {
    const [connectionCheck] = await pool.query<any>('SELECT 1 AS ok');
    const [rows] = await pool.query<any>(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
      [dbName],
    );

    return {
      success: true,
      dbName,
      message: 'MySQL connection successful.',
      tableNames: rows.map((row: { TABLE_NAME: string }) => row.TABLE_NAME),
      serverStatus: connectionCheck,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';

    return {
      success: false,
      dbName,
      message: 'MySQL connection failed.',
      tableNames: [],
      error: message,
    };
  }
}

export default testMysqlConnection;

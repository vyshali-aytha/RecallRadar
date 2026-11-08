import mysql from 'mysql2/promise';

export const runtime = 'nodejs';

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'recallradar_db',
} = process.env;

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
});

export async function query<T = unknown>(sql: string, params: unknown[] = []) {
  const [rows] = await pool.execute<any>(sql, params as any);
  return rows as T;
}

export async function testConnection() {
  const [rows] = await pool.query<any>('SELECT 1 AS ok');
  return rows;
}

export default pool;

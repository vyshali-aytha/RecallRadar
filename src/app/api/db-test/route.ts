import { NextResponse } from 'next/server';
import { testMysqlConnection } from '../../../lib/db-test';
import { requireRole } from '@/lib/auth';

export async function GET() {
  try {
    await requireRole('Admin');
    const result = await testMysqlConnection();

    return NextResponse.json(
      {
        success: result.success,
        dbName: result.dbName,
        message: result.success ? 'MySQL connection successful.' : 'MySQL connection failed.',
      },
      { status: result.success ? 200 : 500 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message === 'Authentication required.'
      ? 401
      : message === 'Insufficient role permissions.'
        ? 403
        : 500;
    return NextResponse.json(
      { success: false, message: status === 401 ? 'Authentication required.' : status === 403 ? 'Admin permission required.' : 'MySQL connection failed.' },
      { status },
    );
  }
}

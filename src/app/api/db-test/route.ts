import { NextResponse } from 'next/server';
import { testMysqlConnection } from '../../../lib/db-test';

export async function GET() {
  const result = await testMysqlConnection();

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}

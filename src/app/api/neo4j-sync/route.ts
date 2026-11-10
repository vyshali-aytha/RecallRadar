import { NextResponse } from 'next/server';

import { requireRole } from '@/lib/auth';
import { syncMySQLToNeo4j } from '@/lib/neo4j-sync';

export async function POST() {
  try {
    await requireRole('Admin');
    const summary = await syncMySQLToNeo4j();

    if (!summary.success) {
      return NextResponse.json(
        { success: false, error: 'MySQL to Neo4j synchronization failed.' },
        { status: 500 }
      );
    }

    return NextResponse.json(summary, {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown synchronization error';
    const status = message === 'Authentication required.'
      ? 401
      : message === 'Insufficient role permissions.'
        ? 403
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: status === 401 ? 'Authentication required.' : status === 403 ? 'Admin permission required.' : 'MySQL to Neo4j synchronization failed.',
      },
      { status }
    );
  }
}

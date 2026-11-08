import { NextResponse } from 'next/server';

import { syncMySQLToNeo4j } from '@/lib/neo4j-sync';

export async function POST() {
  try {
    const summary = await syncMySQLToNeo4j();

    return NextResponse.json(summary, {
      status: summary.success ? 200 : 500,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown synchronization error';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

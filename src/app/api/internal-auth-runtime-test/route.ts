import { NextResponse } from 'next/server';

import { runAuthRuntimeTestHarness } from '@/lib/dev-auth-runtime-test';

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      {
        success: false,
        error: 'Not found.',
      },
      { status: 404 }
    );
  }

  if (process.env.ENABLE_AUTH_RUNTIME_TESTS !== 'true') {
    return NextResponse.json(
      {
        success: false,
        error: 'Set ENABLE_AUTH_RUNTIME_TESTS=true in development/test mode before running the auth runtime harness.',
      },
      { status: 403 }
    );
  }

  if (!process.env.DB_NAME || process.env.DB_NAME !== 'recallradar_test_db') {
    return NextResponse.json(
      {
        success: false,
        error: 'This runtime harness must run against the recallradar_test_db database. Set DB_NAME=recallradar_test_db before starting the app.',
      },
      { status: 403 }
    );
  }

  try {
    const summary = await runAuthRuntimeTestHarness();
    return NextResponse.json(summary, { status: summary.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication runtime test harness failed.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  }
  return NextResponse.json(
    {
      success: false,
      error: 'This route is restricted to development/test usage. Use POST with ENABLE_AUTH_RUNTIME_TESTS=true.',
    },
    { status: 403 }
  );
}

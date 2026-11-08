import { NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentSession();

    return NextResponse.json(
      {
        success: true,
        user,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to read session.',
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

import { logoutUser } from '@/lib/auth';

export async function POST() {
  try {
    const result = await logoutUser();

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed.',
      },
      { status: 500 }
    );
  }
}

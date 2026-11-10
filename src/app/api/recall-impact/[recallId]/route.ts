import { NextResponse } from 'next/server';

import { requireRecallImpactAccess } from '@/lib/auth';
import { getRecallImpact } from '@/lib/recall-impact';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recallId: string }> }
) {
  try {
    await requireRecallImpactAccess();

    const { recallId } = await params;
    const parsedId = Number(recallId);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid recall ID.',
        },
        { status: 400 }
      );
    }

    const result = await getRecallImpact(parsedId);

    if (result.error === 'Invalid recall ID.') {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    if (result.error === 'Recall not found in MySQL.') {
      return NextResponse.json(
        {
          success: false,
          error: 'Recall not found.',
        },
        { status: 404 }
      );
    }

    if (result.error) {
      return NextResponse.json(
        { success: false, error: 'Recall impact analysis is unavailable.' },
        { status: 500 }
      );
    }

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message === 'Authentication required.'
      ? 401
      : message === 'Insufficient role permissions.'
        ? 403
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: status === 401 ? 'Authentication required.' : status === 403 ? 'Insufficient permissions.' : 'Recall impact analysis is unavailable.',
      },
      { status }
    );
  }
}

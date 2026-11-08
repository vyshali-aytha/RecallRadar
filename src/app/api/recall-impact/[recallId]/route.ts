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

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const status =
      message.includes('Authentication required') || message.includes('unauthorized')
        ? 401
        : message.includes('Insufficient role permissions') || message.includes('forbidden')
          ? 403
          : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

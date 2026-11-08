import { NextResponse } from 'next/server';

import { getRecallImpact } from '@/lib/recall-impact';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recallId: string }> }
) {
  try {
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

    if (result.error && result.recall === null) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result, {
      status: result.error ? 500 : 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

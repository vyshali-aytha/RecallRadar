import { NextResponse } from 'next/server';

import { hashPassword, isValidRole } from '@/lib/auth';
import {
  deleteAppUser,
  getAppUserById,
  updateAppUser,
} from '@/lib/member-b-actions';

type PublicUser = {
  user_id: number;
  name: string;
  email: string;
  role: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidEmail(value: string): boolean {
  return value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function publicUser(value: unknown): PublicUser {
  const user = value as PublicUser;
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function parseUserId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const userId = Number(value);
  return Number.isSafeInteger(userId) ? userId : null;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return typeof error.code === 'string' ? error.code : undefined;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  const code = errorCode(error);

  if (message === 'Authentication required.') {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }
  if (message === 'Insufficient role permissions.') {
    return NextResponse.json({ success: false, error: 'Insufficient permissions.' }, { status: 403 });
  }
  if (message === 'App user not found.') {
    return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
  }
  if (message === 'App user ID must be a positive integer.') {
    return NextResponse.json({ success: false, error: 'Invalid user ID.' }, { status: 400 });
  }
  if (code === 'ER_DUP_ENTRY') {
    return NextResponse.json({ success: false, error: 'A user with this email already exists.' }, { status: 409 });
  }
  if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_ROW_IS_REFERENCED') {
    return NextResponse.json(
      { success: false, error: 'User is referenced by other records and cannot be deleted.' },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: false, error: 'Unable to process the user request.' }, { status: 500 });
}

async function getValidUserId(params: Promise<{ userId: string }>): Promise<number | null> {
  const { userId: rawUserId } = await params;
  return parseUserId(rawUserId);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = await getValidUserId(params);
    if (userId === null) {
      return NextResponse.json({ success: false, error: 'Invalid user ID.' }, { status: 400 });
    }

    const user = await getAppUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: publicUser(user) }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  return updateUser(request, context.params);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  return updateUser(request, context.params);
}

async function updateUser(request: Request, params: Promise<{ userId: string }>) {
  try {
    const userId = await getValidUserId(params);
    if (userId === null) {
      return NextResponse.json({ success: false, error: 'Invalid user ID.' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'A valid JSON body is required.' }, { status: 400 });
    }

    if (!isRecord(body)) {
      return NextResponse.json({ success: false, error: 'A JSON object is required.' }, { status: 400 });
    }

    const allowedFields = new Set(['name', 'email', 'password', 'role']);
    const keys = Object.keys(body);
    if (
      keys.length === 0 ||
      'password_hash' in body ||
      'user_id' in body ||
      keys.some((key) => !allowedFields.has(key))
    ) {
      return NextResponse.json(
        { success: false, error: 'Provide supported fields only; user_id and password_hash cannot be changed.' },
        { status: 400 }
      );
    }

    const updates: { name?: string; email?: string; password_hash?: string; role?: string } = {};

    if ('name' in body) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 150) {
        return NextResponse.json({ success: false, error: 'Name must be 1–150 characters.' }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if ('email' in body) {
      if (typeof body.email !== 'string' || !isValidEmail(body.email.trim())) {
        return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
      }
      updates.email = body.email.trim().toLowerCase();
    }
    if ('password' in body) {
      if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 1024) {
        return NextResponse.json(
          { success: false, error: 'Password must be between 12 and 1024 characters.' },
          { status: 400 }
        );
      }
      updates.password_hash = hashPassword(body.password);
    }
    if ('role' in body) {
      if (!isValidRole(body.role)) {
        return NextResponse.json({ success: false, error: 'Role must be Admin or Staff.' }, { status: 400 });
      }
      updates.role = body.role;
    }

    const user = await updateAppUser(userId, updates);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: publicUser(user) }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = await getValidUserId(params);
    if (userId === null) {
      return NextResponse.json({ success: false, error: 'Invalid user ID.' }, { status: 400 });
    }

    const deletedRows = await deleteAppUser(userId);
    if (deletedRows === 0) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted.' }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

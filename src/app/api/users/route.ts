import { NextResponse } from 'next/server';

import { hashPassword, isValidRole } from '@/lib/auth';
import {
  createAppUser,
  getAllAppUsers,
  getAppUserById,
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
  if (code === 'ER_DUP_ENTRY') {
    return NextResponse.json({ success: false, error: 'A user with this email already exists.' }, { status: 409 });
  }

  return NextResponse.json({ success: false, error: 'Unable to process the user request.' }, { status: 500 });
}

export async function GET() {
  try {
    const users = await getAllAppUsers();
    return NextResponse.json(
      { success: true, users: users.map(publicUser) },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
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
    if (
      'password_hash' in body ||
      'user_id' in body ||
      Object.keys(body).some((key) => !allowedFields.has(key))
    ) {
      return NextResponse.json(
        { success: false, error: 'Request contains unsupported or protected fields.' },
        { status: 400 }
      );
    }

    const { name, email, password, role } = body;
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 150 ||
      typeof email !== 'string' ||
      !isValidEmail(email.trim()) ||
      typeof password !== 'string' ||
      password.length < 12 ||
      password.length > 1024 ||
      !isValidRole(role)
    ) {
      return NextResponse.json(
        { success: false, error: 'Name, valid email, password (12–1024 characters), and valid role are required.' },
        { status: 400 }
      );
    }

    const userId = await createAppUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashPassword(password),
      role,
    });
    const createdUser = await getAppUserById(userId);

    if (!createdUser) {
      return NextResponse.json(
        { success: false, error: 'User was created but could not be retrieved.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, user: publicUser(createdUser) },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

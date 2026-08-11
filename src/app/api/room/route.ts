import { NextRequest, NextResponse } from 'next/server';
import {
  createRoom,
  getRoom,
  isAdminToken,
  isValidCode,
  normalizeCode,
  MIN_PASSWORD_LENGTH,
  StorageUnavailableError,
} from '@/lib/roomStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = normalizeCode(searchParams.get('code'));
  const adminToken = searchParams.get('token');

  if (!isValidCode(code)) {
    return NextResponse.json({ error: 'Valid 6-character room code is required' }, { status: 400 });
  }

  const room = await getRoom(code);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({
    code: room.code,
    createdAt: room.createdAt,
    items: room.items,
    isAdmin: isAdminToken(room, adminToken),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedCode = body.code ? normalizeCode(body.code) : undefined;
    const password = typeof body.password === 'string' ? body.password : '';

    if (requestedCode && !isValidCode(requestedCode)) {
      return NextResponse.json(
        { error: 'Room code must be exactly 6 letters/numbers' },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Admin password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const result = await createRoom(requestedCode, password);

    if (!result.ok) {
      const errors = {
        taken: 'That room code is already in use. Pick another one.',
        invalid_code: 'Room code must be exactly 6 letters/numbers',
        weak_password: `Admin password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      } as const;
      return NextResponse.json({ error: errors[result.reason] }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      code: result.room.code,
      adminToken: result.adminToken,
      message: `Room ${result.room.code} created successfully`,
    });
  } catch (error: unknown) {
    console.error('Error creating room:', error);
    if (error instanceof StorageUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

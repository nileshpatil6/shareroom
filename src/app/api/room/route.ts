import { NextRequest, NextResponse } from 'next/server';
import { createRoom, getRoom } from '@/lib/roomStore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const adminToken = searchParams.get('token');

  if (!code || !/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: 'Valid 4-digit room code is required' }, { status: 400 });
  }

  const room = await getRoom(code);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const isAdmin = Boolean(adminToken && adminToken === room.adminToken);

  return NextResponse.json({
    code: room.code,
    createdAt: room.createdAt,
    items: room.items,
    isAdmin,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedCode = body.code;

    if (requestedCode && !/^\d{4}$/.test(requestedCode)) {
      return NextResponse.json({ error: 'Requested code must be a 4-digit number' }, { status: 400 });
    }

    const { room, adminToken } = await createRoom(requestedCode);

    return NextResponse.json({
      success: true,
      code: room.code,
      adminToken,
      message: `Room ${room.code} created successfully`,
    });
  } catch (error: unknown) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

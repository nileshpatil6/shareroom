import { NextRequest, NextResponse } from 'next/server';
import { getRoom, isValidCode, loginAdmin, normalizeCode } from '@/lib/roomStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin login: exchange the room password for an admin token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = normalizeCode(body.code);
    const password = typeof body.password === 'string' ? body.password : '';

    if (!isValidCode(code)) {
      return NextResponse.json({ error: 'Valid 6-character room code is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const adminToken = await loginAdmin(code, password);
    if (!adminToken) {
      return NextResponse.json({ error: 'Incorrect admin password' }, { status: 401 });
    }

    return NextResponse.json({ success: true, code, adminToken });
  } catch (error: unknown) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Admin login failed' }, { status: 500 });
  }
}

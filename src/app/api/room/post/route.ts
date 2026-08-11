import { NextRequest, NextResponse } from 'next/server';
import { addRoomItem, getRoom, isAdminToken, isValidCode, normalizeCode, StorageUnavailableError } from '@/lib/roomStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, content, title, language, adminToken } = body;
    const code = normalizeCode(body.code);

    if (!isValidCode(code)) {
      return NextResponse.json({ error: 'Valid 6-character room code required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
    }

    if (type !== 'text' && type !== 'code') {
      return NextResponse.json({ error: 'Invalid post type' }, { status: 400 });
    }

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const newItem = await addRoomItem(code, {
      type,
      content: content.trim(),
      title: title?.trim() || (type === 'code' ? `${language || 'code'} snippet` : 'Text Note'),
      language: type === 'code' ? language || 'javascript' : undefined,
      authorAdmin: isAdminToken(room, adminToken),
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: unknown) {
    console.error('Error posting item:', error);
    if (error instanceof StorageUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to post item' }, { status: 500 });
  }
}

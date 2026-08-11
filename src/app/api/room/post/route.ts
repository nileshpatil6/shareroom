import { NextRequest, NextResponse } from 'next/server';
import { addRoomItem, getRoom } from '@/lib/roomStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, type, content, title, language, adminToken } = body;

    if (!code || !/^\d{4}$/.test(code)) {
      return NextResponse.json({ error: 'Valid 4-digit code required' }, { status: 400 });
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

    const isCreatorAdmin = Boolean(adminToken && adminToken === room.adminToken);

    const newItem = await addRoomItem(code, {
      type,
      content: content.trim(),
      title: title?.trim() || (type === 'code' ? `${language || 'code'} snippet` : 'Text Note'),
      language: type === 'code' ? (language || 'javascript') : undefined,
      authorAdmin: isCreatorAdmin,
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: unknown) {
    console.error('Error posting item:', error);
    return NextResponse.json({ error: 'Failed to post item' }, { status: 500 });
  }
}

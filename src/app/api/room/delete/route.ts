import { NextRequest, NextResponse } from 'next/server';
import { deleteRoomItem, normalizeCode } from '@/lib/roomStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = normalizeCode(searchParams.get('code'));
    const itemId = searchParams.get('itemId');
    const adminToken = searchParams.get('token');

    if (!code || !itemId || !adminToken) {
      return NextResponse.json({ error: 'Missing code, itemId or adminToken' }, { status: 400 });
    }

    const success = await deleteRoomItem(code, itemId, adminToken);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete item or unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

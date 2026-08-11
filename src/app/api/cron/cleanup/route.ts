import { NextRequest, NextResponse } from 'next/server';
import { runGlobalCleanup } from '@/lib/roomStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    // Optional secret verification if CRON_SECRET is set
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    const { deletedCount } = await runGlobalCleanup();
    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
      message: `Cleaned up ${deletedCount} expired items older than 10 days`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown cron cleanup error';
    console.error('Cron cleanup error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

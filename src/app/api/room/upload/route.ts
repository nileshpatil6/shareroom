import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { addRoomItem, getRoom } from '@/lib/roomStore';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const code = formData.get('code') as string | null;
    const adminToken = formData.get('adminToken') as string | null;

    if (!code || !/^\d{4}$/.test(code)) {
      return NextResponse.json({ error: 'Valid 4-digit room code is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Strict 10MB file size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum limit of 10 MB. Yours was ${(file.size / (1024 * 1024)).toFixed(2)} MB.` },
        { status: 400 }
      );
    }

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isCreatorAdmin = Boolean(adminToken && adminToken === room.adminToken);
    const fileName = file.name || 'unnamed_file';
    const mimeType = file.type || 'application/octet-stream';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let blobUrl = '';

    // Check if Vercel Blob Token is set
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const blob = await put(`shareroom/${code}/${Date.now()}-${safeName}`, buffer, {
          access: 'public',
          contentType: mimeType,
        });
        blobUrl = blob.url;
      } catch (blobErr: unknown) {
        const msg = blobErr instanceof Error ? blobErr.message : 'Unknown blob error';
        console.error('Vercel Blob upload failed:', blobErr);
        return NextResponse.json({ error: 'Failed to upload to Vercel Blob: ' + msg }, { status: 500 });
      }
    } else {
      // Local development fallback file store
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', code);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const localFileName = `${Date.now()}-${safeName}`;
      const filePath = path.join(uploadDir, localFileName);
      fs.writeFileSync(filePath, buffer);
      blobUrl = `/uploads/${code}/${localFileName}`;
    }

    const newItem = await addRoomItem(code, {
      type: 'file',
      content: blobUrl,
      title: fileName,
      fileName,
      fileSize: file.size,
      mimeType,
      blobUrl,
      authorAdmin: isCreatorAdmin,
    });

    return NextResponse.json({
      success: true,
      item: newItem,
      message: 'File uploaded successfully (will auto-erase after 10 days)',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Upload failed: ' + msg }, { status: 500 });
  }
}

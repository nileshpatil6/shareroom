import { put, del, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { RoomData, RoomItem } from './types';

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

const LOCAL_DATA_DIR = path.join(process.cwd(), '.data', 'rooms');

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
}

function getLocalRoomPath(code: string): string {
  ensureLocalDir();
  return path.join(LOCAL_DATA_DIR, `${code}.json`);
}

function hasBlobStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Generate random 4-digit code (e.g. "4921")
export function generate4DigitCode(): string {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  return code;
}

// Generate admin token
export function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Clean expired items (> 10 days old) and delete associated Vercel Blobs
async function purgeExpiredItems(room: RoomData): Promise<RoomData> {
  const now = Date.now();
  const validItems: RoomItem[] = [];
  let modified = false;

  for (const item of room.items) {
    const isExpired = now >= item.expiresAt || (now - item.createdAt >= TEN_DAYS_MS);
    if (isExpired) {
      modified = true;
      // If it's a file with a blobUrl, delete from Vercel Blob if blob storage active
      if (item.type === 'file' && item.blobUrl && hasBlobStore()) {
        try {
          await del(item.blobUrl);
        } catch (err) {
          console.error(`Failed to delete blob ${item.blobUrl}:`, err);
        }
      }
    } else {
      validItems.push(item);
    }
  }

  if (modified) {
    room.items = validItems;
    await saveRoom(room);
  }

  return room;
}

export async function getRoom(code: string): Promise<RoomData | null> {
  const cleanCode = code.trim();
  if (!/^\d{4}$/.test(cleanCode)) {
    return null;
  }

  let room: RoomData | null = null;

  if (hasBlobStore()) {
    try {
      const blobPath = `rooms/${cleanCode}.json`;
      // Find room blob in list or fetch via public store URL if exists
      const { blobs } = await list({ prefix: blobPath, limit: 1 });
      if (blobs.length > 0) {
        const response = await fetch(blobs[0].url, { cache: 'no-store' });
        if (response.ok) {
          room = (await response.json()) as RoomData;
        }
      }
    } catch (err) {
      console.error('Error fetching room from Blob store:', err);
    }
  }

  // Fallback to local storage if blob not found or not configured
  if (!room) {
    const localPath = getLocalRoomPath(cleanCode);
    if (fs.existsSync(localPath)) {
      try {
        const fileContent = fs.readFileSync(localPath, 'utf-8');
        room = JSON.parse(fileContent) as RoomData;
      } catch (err) {
        console.error('Error reading local room:', err);
      }
    }
  }

  if (!room) return null;

  // Purge any items older than 10 days
  return await purgeExpiredItems(room);
}

export async function saveRoom(room: RoomData): Promise<void> {
  const code = room.code;

  if (hasBlobStore()) {
    try {
      const blobPath = `rooms/${code}.json`;
      await put(blobPath, JSON.stringify(room), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
    } catch (err) {
      console.error('Error saving room to Vercel Blob:', err);
    }
  }

  // Always keep local backup/sync if in local environment
  try {
    const localPath = getLocalRoomPath(code);
    fs.writeFileSync(localPath, JSON.stringify(room, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local room:', err);
  }
}

export async function createRoom(customCode?: string): Promise<{ room: RoomData; adminToken: string }> {
  let code = customCode && /^\d{4}$/.test(customCode) ? customCode : generate4DigitCode();
  
  // Ensure unique code if randomly generated
  let existing = await getRoom(code);
  let attempts = 0;
  while (existing && !customCode && attempts < 10) {
    code = generate4DigitCode();
    existing = await getRoom(code);
    attempts++;
  }

  const adminToken = generateToken();
  const room: RoomData = {
    code,
    adminToken,
    createdAt: Date.now(),
    items: [],
  };

  await saveRoom(room);
  return { room, adminToken };
}

export async function addRoomItem(code: string, item: Omit<RoomItem, 'id' | 'createdAt' | 'expiresAt'>): Promise<RoomItem | null> {
  const room = await getRoom(code);
  if (!room) return null;

  const now = Date.now();
  const newItem: RoomItem = {
    ...item,
    id: 'item_' + Math.random().toString(36).substring(2, 10),
    createdAt: now,
    expiresAt: now + TEN_DAYS_MS,
  };

  room.items.unshift(newItem); // Newest items first
  await saveRoom(room);
  return newItem;
}

export async function deleteRoomItem(code: string, itemId: string, adminToken: string): Promise<boolean> {
  const room = await getRoom(code);
  if (!room || room.adminToken !== adminToken) return false;

  const targetIndex = room.items.findIndex(i => i.id === itemId);
  if (targetIndex === -1) return false;

  const targetItem = room.items[targetIndex];
  if (targetItem.type === 'file' && targetItem.blobUrl && hasBlobStore()) {
    try {
      await del(targetItem.blobUrl);
    } catch (err) {
      console.error('Failed to delete blob file:', err);
    }
  }

  room.items.splice(targetIndex, 1);
  await saveRoom(room);
  return true;
}

// Global cleanup procedure for scheduled Vercel Cron
export async function runGlobalCleanup(): Promise<{ deletedCount: number }> {
  let deletedCount = 0;

  if (hasBlobStore()) {
    try {
      const { blobs } = await list({ prefix: 'rooms/' });
      for (const blob of blobs) {
        const res = await fetch(blob.url, { cache: 'no-store' });
        if (res.ok) {
          const room = (await res.json()) as RoomData;
          const initialLength = room.items.length;
          await purgeExpiredItems(room);
          deletedCount += (initialLength - room.items.length);
        }
      }
    } catch (err) {
      console.error('Error during global Blob cleanup:', err);
    }
  }

  // Also clean local dir
  if (fs.existsSync(LOCAL_DATA_DIR)) {
    const files = fs.readdirSync(LOCAL_DATA_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(LOCAL_DATA_DIR, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const room = JSON.parse(content) as RoomData;
          const initialLength = room.items.length;
          await purgeExpiredItems(room);
          deletedCount += (initialLength - room.items.length);
        } catch (e) {
          console.error(`Error purging local file ${file}:`, e);
        }
      }
    }
  }

  return { deletedCount };
}

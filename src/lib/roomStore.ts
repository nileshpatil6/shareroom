import { put, del, list } from '@vercel/blob';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { RoomData, RoomItem } from './types';

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

export const CODE_LENGTH = 6;
// Unambiguous alphabet: no 0/O, no 1/I/L
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_REGEX = /^[A-Z0-9]{6}$/;

export const MIN_PASSWORD_LENGTH = 4;

// Local disk store is DEV ONLY. On Vercel every function instance gets its own
// empty /tmp, so a room written there vanishes seconds later on the next request.
const LOCAL_DATA_DIR = path.join(process.cwd(), '.data', 'rooms');

export function hasBlobStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isServerless(): boolean {
  return Boolean(process.env.VERCEL);
}

export class StorageUnavailableError extends Error {
  constructor() {
    super(
      'Persistent storage is not configured. Connect a Vercel Blob store to this project and set BLOB_READ_WRITE_TOKEN, otherwise rooms cannot survive between requests.'
    );
    this.name = 'StorageUnavailableError';
  }
}

function ensureLocalDir() {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to create local dir:', e);
  }
}

function getLocalRoomPath(code: string): string {
  ensureLocalDir();
  return path.join(LOCAL_DATA_DIR, `${code}.json`);
}

// ---------- Code helpers ----------

// Normalize any user input into the canonical room code form
export function normalizeCode(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

export function isValidCode(code: string): boolean {
  return CODE_REGEX.test(code);
}

// Generate a random 6-char alphanumeric code (e.g. "K7P2XM")
export function generateRoomCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

// ---------- Auth helpers ----------

export function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function buildPasswordFields(password: string): { passwordSalt: string; passwordHash: string } {
  const passwordSalt = crypto.randomBytes(16).toString('hex');
  return { passwordSalt, passwordHash: hashPassword(password, passwordSalt) };
}

export function verifyRoomPassword(room: RoomData, password: string): boolean {
  if (!room.passwordHash || !room.passwordSalt) return false;
  const candidate = Buffer.from(hashPassword(password, room.passwordSalt), 'hex');
  const stored = Buffer.from(room.passwordHash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

export function isAdminToken(room: RoomData, token?: string | null): boolean {
  if (!token || !room.adminToken) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(room.adminToken);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------- Persistence ----------

// Clean expired items (> 10 days old) and delete associated Vercel Blobs
async function purgeExpiredItems(room: RoomData): Promise<RoomData> {
  const now = Date.now();
  const validItems: RoomItem[] = [];
  let modified = false;

  for (const item of room.items) {
    const isExpired = now >= item.expiresAt || now - item.createdAt >= TEN_DAYS_MS;
    if (isExpired) {
      modified = true;
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

// Blob CDN caches by full URL, so a unique query string forces a fresh read.
function noCacheUrl(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}_ts=${Date.now()}`;
}

export async function getRoom(rawCode: string): Promise<RoomData | null> {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code)) return null;

  let room: RoomData | null = null;

  if (hasBlobStore()) {
    try {
      const blobPath = `rooms/${code}.json`;
      const { blobs } = await list({ prefix: blobPath, limit: 1 });
      const match = blobs.find((b) => b.pathname === blobPath);
      if (match) {
        const response = await fetch(noCacheUrl(match.url), { cache: 'no-store' });
        if (response.ok) {
          room = (await response.json()) as RoomData;
        }
      }
    } catch (err) {
      console.error('Error fetching room from Blob store:', err);
    }
  } else if (!isServerless()) {
    try {
      const localPath = getLocalRoomPath(code);
      if (fs.existsSync(localPath)) {
        room = JSON.parse(fs.readFileSync(localPath, 'utf-8')) as RoomData;
      }
    } catch (err) {
      console.error('Error reading local room:', err);
    }
  }

  if (!room) return null;

  return await purgeExpiredItems(room);
}

export async function saveRoom(room: RoomData): Promise<void> {
  const code = room.code;

  if (hasBlobStore()) {
    await put(`rooms/${code}.json`, JSON.stringify(room), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    });
    return;
  }

  if (isServerless()) {
    // Never pretend a write succeeded: /tmp is wiped between invocations.
    throw new StorageUnavailableError();
  }

  fs.writeFileSync(getLocalRoomPath(code), JSON.stringify(room, null, 2), 'utf-8');
}

export type CreateRoomResult =
  | { ok: true; room: RoomData; adminToken: string }
  | { ok: false; reason: 'taken' | 'invalid_code' | 'weak_password' };

export async function createRoom(customCode: string | undefined, password: string): Promise<CreateRoomResult> {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: 'weak_password' };
  }

  let code: string;

  if (customCode) {
    code = normalizeCode(customCode);
    if (!isValidCode(code)) return { ok: false, reason: 'invalid_code' };
    if (await getRoom(code)) return { ok: false, reason: 'taken' };
  } else {
    code = generateRoomCode();
    let attempts = 0;
    while ((await getRoom(code)) && attempts < 10) {
      code = generateRoomCode();
      attempts++;
    }
  }

  const adminToken = generateToken();
  const room: RoomData = {
    code,
    adminToken,
    ...buildPasswordFields(password),
    createdAt: Date.now(),
    items: [],
  };

  await saveRoom(room);
  return { ok: true, room, adminToken };
}

// Password login: returns a fresh admin token when the password matches
export async function loginAdmin(rawCode: string, password: string): Promise<string | null> {
  const room = await getRoom(rawCode);
  if (!room) return null;
  if (!verifyRoomPassword(room, password)) return null;

  // Reuse the existing token so other admin devices stay logged in
  if (!room.adminToken) {
    room.adminToken = generateToken();
    await saveRoom(room);
  }
  return room.adminToken;
}

export async function addRoomItem(
  rawCode: string,
  item: Omit<RoomItem, 'id' | 'createdAt' | 'expiresAt'>
): Promise<RoomItem | null> {
  const room = await getRoom(rawCode);
  if (!room) return null;

  const now = Date.now();
  const newItem: RoomItem = {
    ...item,
    id: 'item_' + crypto.randomBytes(6).toString('hex'),
    createdAt: now,
    expiresAt: now + TEN_DAYS_MS,
  };

  room.items.unshift(newItem);
  await saveRoom(room);
  return newItem;
}

export async function deleteRoomItem(rawCode: string, itemId: string, adminToken: string): Promise<boolean> {
  const room = await getRoom(rawCode);
  if (!room || !isAdminToken(room, adminToken)) return false;

  const targetIndex = room.items.findIndex((i) => i.id === itemId);
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

export async function runGlobalCleanup(): Promise<{ deletedCount: number }> {
  let deletedCount = 0;

  if (hasBlobStore()) {
    try {
      const { blobs } = await list({ prefix: 'rooms/' });
      for (const blob of blobs) {
        const res = await fetch(noCacheUrl(blob.url), { cache: 'no-store' });
        if (res.ok) {
          const room = (await res.json()) as RoomData;
          const initialLength = room.items.length;
          await purgeExpiredItems(room);
          deletedCount += initialLength - room.items.length;
        }
      }
    } catch (err) {
      console.error('Error during global Blob cleanup:', err);
    }
  }

  if (!isServerless() && fs.existsSync(LOCAL_DATA_DIR)) {
    try {
      for (const file of fs.readdirSync(LOCAL_DATA_DIR)) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(LOCAL_DATA_DIR, file);
        try {
          const room = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RoomData;
          const initialLength = room.items.length;
          await purgeExpiredItems(room);
          deletedCount += initialLength - room.items.length;
        } catch (e) {
          console.error(`Error purging local file ${file}:`, e);
        }
      }
    } catch (err) {
      console.error('Error reading local directory:', err);
    }
  }

  return { deletedCount };
}

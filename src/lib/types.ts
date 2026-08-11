export type ItemType = 'text' | 'code' | 'file';

export interface RoomItem {
  id: string;
  type: ItemType;
  content: string; // Plain text, code string, or file download URL
  title?: string;
  language?: string; // For code snippets e.g. javascript, python, json, html, css, etc.
  fileName?: string; // For file items
  fileSize?: number; // File size in bytes
  mimeType?: string; // MIME type of file
  blobUrl?: string; // Vercel Blob URL for files
  createdAt: number; // Unix timestamp in ms
  expiresAt: number; // Unix timestamp in ms (10 days after createdAt)
  authorAdmin: boolean; // Whether posted by Admin
}

export interface RoomData {
  code: string; // 4-digit code e.g. "4821"
  adminToken: string; // Secret key for admin verification
  createdAt: number;
  items: RoomItem[];
}

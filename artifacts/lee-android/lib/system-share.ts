import type { PerceptionCapture, PerceptionCaptureType } from '@workspace/mobile-foundation';

export const MAX_SYSTEM_SHARE_BYTES = 5 * 1024 * 1024;
export const MAX_SYSTEM_SHARE_TEXT_BYTES = 20_000;
const EXECUTABLE_MIME = /(?:x-msdownload|x-sh|x-executable|java-archive|x-apple-diskimage|x-apple-installer|android\.package-archive)/i;
const EXECUTABLE_EXTENSION = /\.(?:apk|app|bat|bin|cmd|com|dmg|exe|jar|js|mjs|pkg|ps1|sh|so|vbs)$/i;
const DOCUMENT_MIMES = new Set(['application/pdf', 'text/plain', 'text/csv', 'text/markdown', 'application/rtf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

export type AndroidSystemSharePayload = {
  captureId: string;
  captureType: PerceptionCaptureType;
  text?: string;
  filename?: string;
  mimeType?: string;
  contentBase64?: string;
  byteSize?: number;
  capturedAt: string;
  sourceMetadata?: Record<string, unknown>;
};

function safeFilename(value: unknown) {
  return String(value ?? '').replaceAll('\\', '/').split('/').pop()?.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 240) ?? '';
}
function base64Bytes(value: string) {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return Math.floor(value.length * 3 / 4) - padding;
}
function utf8Bytes(value: string) { return encodeURIComponent(value).replace(/%[A-F\d]{2}/gi, 'x').length; }
function validHttpUrl(value: string) {
  if (!/^https?:\/\/\S+$/i.test(value)) return false;
  try { const parsed = new URL(value); return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname); } catch { return false; }
}
function boundedMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const allowed = new Set(['sharedVia', 'captureOrigin', 'contentKind', 'sharedMimeType', 'originatingApp', 'uriScheme']);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key, item]) => allowed.has(key) && typeof item === 'string').map(([key, item]) => [key, String(item).slice(0, 240)]));
}
function supportedDocument(filename: string, mimeType: string) {
  return DOCUMENT_MIMES.has(mimeType) || /\.(?:csv|doc|docx|md|pdf|rtf|txt)$/i.test(filename);
}

export function normalizeAndroidSystemShare(input: unknown): PerceptionCapture | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<AndroidSystemSharePayload>;
  const captureId = String(value.captureId ?? '').trim();
  const captureType = String(value.captureType ?? '') as PerceptionCaptureType;
  const text = typeof value.text === 'string' ? value.text.trim() : '';
  const filename = safeFilename(value.filename);
  const mimeType = String(value.mimeType ?? '').trim().toLowerCase();
  const capturedAt = new Date(String(value.capturedAt ?? ''));
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(captureId) || !capturedAt.getTime()) return null;
  if (!['image', 'screenshot', 'document', 'pdf', 'link', 'text'].includes(String(captureType))) return null;
  if (EXECUTABLE_MIME.test(mimeType) || EXECUTABLE_EXTENSION.test(filename)) return null;
  const common = { captureId, purpose: `android_system_share_${captureType}`, capturedAt: capturedAt.toISOString(), authorizedScope: 'owner-private' as const, sourceMetadata: { ...boundedMetadata(value.sourceMetadata), sharedVia: 'android-system-share' }, brainLinks: [] };
  if (captureType === 'link') {
    if (!validHttpUrl(text) || utf8Bytes(text) > MAX_SYSTEM_SHARE_TEXT_BYTES) return null;
    return { ...common, captureType, text, filename: filename || text, mimeType: mimeType || 'text/uri-list' };
  }
  if (captureType === 'text') {
    if (!text || utf8Bytes(text) > MAX_SYSTEM_SHARE_TEXT_BYTES) return null;
    return { ...common, captureType, text, filename: filename || 'shared-text.txt', mimeType: mimeType || 'text/plain' };
  }
  const contentBase64 = typeof value.contentBase64 === 'string' ? value.contentBase64 : '';
  const decodedBytes = base64Bytes(contentBase64);
  const declaredBytes = value.byteSize === undefined ? decodedBytes : Number(value.byteSize);
  if (!contentBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(contentBase64) || !Number.isFinite(declaredBytes) || declaredBytes < 1 || declaredBytes > MAX_SYSTEM_SHARE_BYTES || decodedBytes < 1 || decodedBytes > MAX_SYSTEM_SHARE_BYTES) return null;
  if (captureType === 'image' || captureType === 'screenshot') {
    if (!mimeType.startsWith('image/')) return null;
  } else if (captureType === 'pdf') {
    if (mimeType !== 'application/pdf' && !filename.toLowerCase().endsWith('.pdf')) return null;
  } else if (captureType === 'document' && !supportedDocument(filename, mimeType)) return null;
  return { ...common, captureType, text: text || `Owner system share evidence: ${filename || 'shared content'}`, filename: filename || (captureType === 'image' || captureType === 'screenshot' ? 'lee-shared-image' : 'lee-shared-document'), mimeType: mimeType || 'application/octet-stream', contentBase64, byteSize: declaredBytes };
}
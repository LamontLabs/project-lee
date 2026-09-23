import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeAndroidSystemShare, MAX_SYSTEM_SHARE_BYTES } from '../lib/system-share';

function read(relativePath: string) {
  return readFileSync(join(dirname(fileURLToPath(String(import.meta.url))), relativePath), 'utf8');
}

const manifest = read('../android/app/src/main/AndroidManifest.xml');
const appConfig = read('../app.json');
const nativeModule = read('../android/app/src/main/java/com/projectlee/owner/LeeShareModule.kt');
const context = read('../context/LeeContext.tsx');

const capturedAt = new Date().toISOString();
const media = Buffer.from('bounded shared evidence').toString('base64');
const base = {
  captureId: 'android-share-test-1',
  capturedAt,
  sourceMetadata: { sharedVia: 'android-system-share', originatingApp: 'com.example.sender', token: 'must-not-survive' },
};

test('supported image, text, link, document, and PDF shares normalize to the existing perception model', () => {
  const image = normalizeAndroidSystemShare({ ...base, captureType: 'image', filename: 'photo.png', mimeType: 'image/png', contentBase64: media, byteSize: Buffer.from('bounded shared evidence').byteLength });
  const text = normalizeAndroidSystemShare({ ...base, captureId: 'android-share-test-text', captureType: 'text', text: 'A bounded note', mimeType: 'text/plain' });
  const link = normalizeAndroidSystemShare({ ...base, captureId: 'android-share-test-link', captureType: 'link', text: 'https://example.com/research', mimeType: 'text/uri-list' });
  const document = normalizeAndroidSystemShare({ ...base, captureId: 'android-share-test-doc', captureType: 'document', filename: 'brief.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', contentBase64: media, byteSize: 23 });
  const pdf = normalizeAndroidSystemShare({ ...base, captureId: 'android-share-test-pdf', captureType: 'pdf', filename: 'brief.pdf', mimeType: 'application/pdf', contentBase64: media, byteSize: 23 });
  assert.equal(image?.captureType, 'image');
  assert.equal(text?.captureType, 'text');
  assert.equal(link?.captureType, 'link');
  assert.equal(document?.captureType, 'document');
  assert.equal(pdf?.captureType, 'pdf');
  assert.equal(image?.authorizedScope, 'owner-private');
  assert.equal(image?.sourceMetadata?.token, undefined);
  assert.equal(image?.sourceMetadata?.originatingApp, 'com.example.sender');
});

test('unsupported MIME, malformed URI, executable, and oversized content fail closed', () => {
  assert.equal(normalizeAndroidSystemShare({ ...base, captureType: 'document', filename: 'installer.apk', mimeType: 'application/vnd.android.package-archive', contentBase64: media, byteSize: 23 }), null);
  assert.equal(normalizeAndroidSystemShare({ ...base, captureType: 'document', filename: 'unknown.bin', mimeType: 'application/octet-stream', contentBase64: media, byteSize: 23 }), null);
  assert.equal(normalizeAndroidSystemShare({ ...base, captureType: 'link', text: 'https://[malformed', mimeType: 'text/uri-list' }), null);
  assert.equal(normalizeAndroidSystemShare({ ...base, captureType: 'image', filename: 'photo.png', mimeType: 'image/png', contentBase64: 'A'.repeat(7_000_000), byteSize: MAX_SYSTEM_SHARE_BYTES + 1 }), null);
});

test('native registration stays narrow and routes accepted shares through the existing queue', () => {
  for (const mime of ['image/*', 'text/plain', 'text/uri-list', 'application/pdf', 'text/csv', 'text/markdown', 'application/rtf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']) {
    assert.match(manifest, new RegExp(`android:mimeType="${mime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(appConfig, new RegExp(`"mimeType": "${mime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  }
  assert.match(nativeModule, /ACTION_SEND/);
  assert.match(nativeModule, /stableId/);
  assert.match(nativeModule, /MAX_BYTES/);
  assert.match(nativeModule, /contentResolver\.openInputStream/);
  assert.match(context, /normalizeAndroidSystemShare/);
  assert.match(context, /captureSystemShare/);
});

test('same share identity remains stable while changed content is left to server conflict handling', () => {
  const first = normalizeAndroidSystemShare({ ...base, captureType: 'text', text: 'first', mimeType: 'text/plain' });
  const changed = normalizeAndroidSystemShare({ ...base, captureType: 'text', text: 'changed', mimeType: 'text/plain' });
  assert.equal(first?.captureId, changed?.captureId);
  assert.notEqual(first?.text, changed?.text);
  assert.match(nativeModule, /already used for different evidence|SHA-256|MessageDigest/);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAndroidSystemShare, MAX_SYSTEM_SHARE_BYTES } from '../lib/system-share';

const capturedAt = new Date().toISOString();
const media = Buffer.from('bounded shared evidence').toString('base64');
const base = { captureId: 'android-share-test-1', capturedAt, sourceMetadata: { sharedVia: 'android-system-share', originatingApp: 'com.example.sender', token: 'must-not-survive' } };

test('supported image, text, link, document, and PDF shares normalize safely', () => {
  const image = normalizeAndroidSystemShare({ ...base, captureType: 'image', filename: 'photo.png', mimeType: 'image/png', contentBase64: media, byteSize: 23 });
  const text = normalizeAndroidSystemShare({ ...base, captureId: 'android-share-test-text', captureType: 'text', text: 'A bounded note', mimeType: 'text/plain' });
  const link = normalizeAndroidSystemShare({ ...base, captureId: 'android-share-test-link', captureType: 'link', text: 'https://example.com/research', mimeType: 'text/uri-list' });
  assert.equal(image?.captureType, 'image');
  assert.equal(text?.captureType, 'text');
  assert.equal(link?.captureType, 'link');
  assert.equal(image?.authorizedScope, 'owner-private');
  assert.equal(image?.sourceMetadata?.token, undefined);
  assert.equal(image?.sourceMetadata?.originatingApp, 'com.example.sender');
});
test('unsupported, malformed, executable, and oversized content fail closed', () => {
  assert.equal(normalizeAndroidSystemShare({ ...base, captureType: 'document', filename: 'installer.apk', mimeType: 'application/vnd.android.package-archive', contentBase64: media, byteSize: 23 }), null);
  assert.equal(normalizeAndroidSystemShare({ ...base, captureType: 'link', text: 'https://[malformed', mimeType: 'text/uri-list' }), null);
  assert.equal(normalizeAndroidSystemShare({ ...base, captureType: 'image', filename: 'photo.png', mimeType: 'image/png', contentBase64: 'A'.repeat(7_000_000), byteSize: MAX_SYSTEM_SHARE_BYTES + 1 }), null);
});
test('same share identity remains stable while changed content is not silently conflated', () => {
  const first = normalizeAndroidSystemShare({ ...base, captureType: 'text', text: 'first', mimeType: 'text/plain' });
  const changed = normalizeAndroidSystemShare({ ...base, captureType: 'text', text: 'changed', mimeType: 'text/plain' });
  assert.equal(first?.captureId, changed?.captureId);
  assert.notEqual(first?.text, changed?.text);
});
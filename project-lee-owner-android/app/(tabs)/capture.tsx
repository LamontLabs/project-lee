import React, { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, Card, Eyebrow, PageBrand, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import { highestUncertainty, UncertaintyNotice } from '@/components/UncertaintyNotice';
import type { Capture } from '@/lib/types';
import type { PerceptionReviewItem } from '@/lib/api';
import { MobileStatePill, mobileTokens } from '@workspace/mobile-foundation';

type CaptureMode = 'note' | 'idea' | 'observation' | 'project_update' | 'url' | 'share';

const modes: Array<{ id: CaptureMode; label: string; placeholder: string }> = [
  { id: 'note', label: 'Note', placeholder: 'A fact or loose thread…' },
  { id: 'idea', label: 'Idea', placeholder: 'A possibility worth keeping…' },
  { id: 'observation', label: 'Observation', placeholder: 'What did you notice?' },
  { id: 'project_update', label: 'Project update', placeholder: 'What changed on a project?' },
  { id: 'url', label: 'URL', placeholder: 'Paste a link and a short note…' },
  { id: 'share', label: 'Share', placeholder: 'Paste text or a link to share with LEE…' },
];

const modeTags: Record<CaptureMode, string> = {
  note: 'Note',
  idea: 'Idea',
  observation: 'Observation',
  project_update: 'Project update',
  url: 'URL',
  share: 'Share',
};
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

function estimatedBase64Bytes(value: string) {
  return Math.floor(value.length * 3 / 4);
}

function captureState(status: Capture['status']) {
  if (status === 'queued') return { label: 'Queued', tone: 'neutral' as const };
  if (status === 'syncing') return { label: 'Syncing', tone: 'warning' as const };
  if (status === 'synced') return { label: 'Synced', tone: 'positive' as const };
  if (status === 'rejected') return { label: 'Rejected', tone: 'danger' as const };
  if (status === 'conflict') return { label: 'Conflict', tone: 'danger' as const };
  return { label: 'Failed', tone: 'danger' as const };
}

export default function CaptureTab() {
  const colors = useColors();
  const { captures, addCapture, capturePerception, retryCapture, uncertainty: uncertaintySnapshot, pairing, api, hosted } = useLee();
  const uncertainty = uncertaintySnapshot?.value ?? [];
  const [text, setText] = useState('');
  const [mode, setMode] = useState<CaptureMode>('note');
  const [tag, setTag] = useState('Untagged');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [reviewItems, setReviewItems] = useState<PerceptionReviewItem[]>([]);
  const [reviewBusyId, setReviewBusyId] = useState('');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const selectedMode = modes.find((item) => item.id === mode) ?? modes[0];

  useEffect(() => {
    if (!pairing || !api) {
      setReviewItems([]);
      return;
    }
    void api.perceptionReviewQueue().then(setReviewItems).catch(() => setReviewItems([]));
  }, [pairing]);

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  }

  async function submit() {
    const value = text.trim();
    if (!value) {
      showNotice('Add a little context before saving.');
      return;
    }
    if (mode === 'url' && !/^https?:\/\/\S+/i.test(value)) {
      showNotice('URL captures need an http or https link.');
      return;
    }
    if (mode === 'url' || mode === 'share') {
      const isLink = /^https?:\/\/\S+/i.test(value);
      await capturePerception({
        captureType: isLink ? 'link' : 'share',
        purpose: isLink ? 'shared_link' : 'shared_text',
        text: value,
        filename: isLink ? value : 'shared-text.txt',
        mimeType: isLink ? 'text/uri-list' : 'text/plain',
        capturedAt: new Date().toISOString(),
        authorizedScope: 'owner-private',
        sourceMetadata: { sharedVia: 'owner-compose', contentKind: isLink ? 'link' : 'plain-text' },
        brainLinks: [],
      });
    } else {
      await addCapture(value, `${modeTags[mode]} · ${tag}`);
    }
    setText('');
    showNotice(pairing ? 'Saved and sent to Source Vault.' : 'Saved locally · will retry when paired.');
  }

  async function photo() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showNotice('Camera permission is required for a photo capture.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (!asset.base64) {
        showNotice('This device did not return photo bytes. The capture was not uploaded.');
        return;
      }
      if ((asset.fileSize ?? estimatedBase64Bytes(asset.base64)) > MAX_EVIDENCE_BYTES) {
        showNotice('Photo evidence exceeds the 5 MB limit and was not uploaded.');
        return;
      }
      await capturePerception({
        captureType: 'image',
        purpose: 'what_am_i_looking_at',
        text: `Owner photo evidence: ${asset.fileName ?? 'photo'}`,
        filename: asset.fileName ?? 'lee-photo.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
        contentBase64: asset.base64,
        byteSize: asset.fileSize,
        capturedAt: new Date().toISOString(),
        authorizedScope: 'owner-private',
         sourceMetadata: { captureOrigin: 'camera', contentKind: 'photo' },
        brainLinks: [],
      });
      showNotice(pairing ? 'Photo saved and sent to Source Vault.' : 'Photo saved locally · will retry when paired.');
    }
  }

  async function attachment() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (!asset.base64) {
        showNotice('This device did not return attachment bytes. The capture was not uploaded.');
        return;
      }
      if ((asset.fileSize ?? estimatedBase64Bytes(asset.base64)) > MAX_EVIDENCE_BYTES) {
        showNotice('Image evidence exceeds the 5 MB limit and was not uploaded.');
        return;
      }
      await capturePerception({
         captureType: 'screenshot',
        purpose: 'visual_evidence_intake',
        text: `Owner file evidence: ${asset.fileName ?? 'attachment'}`,
        filename: asset.fileName ?? 'lee-attachment',
        mimeType: asset.mimeType ?? 'application/octet-stream',
        contentBase64: asset.base64,
        byteSize: asset.fileSize,
        capturedAt: new Date().toISOString(),
        authorizedScope: 'owner-private',
         sourceMetadata: { captureOrigin: 'library', contentKind: 'image-or-screenshot' },
        brainLinks: [],
      });
      showNotice(pairing ? 'Attachment saved and sent to Source Vault.' : 'Attachment saved locally · will retry when paired.');
    }
  }

  async function document() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/csv', 'text/markdown', 'application/rtf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const size = asset.size ?? 0;
    if (!size || size > 5 * 1024 * 1024) {
      showNotice('Documents and PDFs must be between 1 byte and 5 MB.');
      return;
    }
    const filename = (asset.name || 'lee-document').replace(/[\\/\u0000-\u001f\u007f]/g, '').slice(0, 240);
    const mimeType = (asset.mimeType || '').toLowerCase();
    const isPdf = mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
    try {
      const contentBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      await capturePerception({
        captureType: isPdf ? 'pdf' : 'document',
        purpose: isPdf ? 'shared_pdf' : 'shared_document',
        text: `Owner document evidence: ${filename}`,
        filename,
        mimeType: mimeType || (isPdf ? 'application/pdf' : 'application/octet-stream'),
        contentBase64,
        byteSize: size,
        capturedAt: new Date().toISOString(),
        authorizedScope: 'owner-private',
        sourceMetadata: {
          captureOrigin: 'system-document-picker',
          contentKind: isPdf ? 'pdf' : 'document',
          uriScheme: asset.uri.split(':')[0] ?? 'unknown',
        },
        brainLinks: [],
      });
      showNotice(pairing ? 'Document saved and sent to Source Vault.' : 'Document saved locally · will retry when paired.');
    } catch {
      showNotice('This document could not be read safely; the source was not uploaded.');
    }
  }

  async function voice() {
    if (!recorder.isRecording) {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showNotice('Microphone permission is required for voice capture.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      recorder.record({ forDuration: 120 });
      showNotice('Recording… tap Voice note again to stop.');
    } else {
      await recorder.stop();
      if (!recorder.uri) {
        showNotice('The microphone did not return an audio file.');
        return;
      }
      try {
        const info = await FileSystem.getInfoAsync(recorder.uri);
        if (!info.exists || (info.size ?? 0) > 5 * 1024 * 1024) {
          showNotice('Audio capture is unavailable or exceeds the 5 MB evidence limit.');
          return;
        }
        const contentBase64 = await FileSystem.readAsStringAsync(recorder.uri, { encoding: FileSystem.EncodingType.Base64 });
        await capturePerception({
          captureType: 'audio',
          purpose: 'explicit_voice_capture',
          text: 'Owner voice evidence',
          filename: 'lee-voice.m4a',
          mimeType: 'audio/m4a',
          contentBase64,
          byteSize: info.size,
          capturedAt: new Date().toISOString(),
          authorizedScope: 'owner-private',
          sourceMetadata: { captureOrigin: 'microphone', contentKind: 'audio', durationSeconds: Math.min(120, Math.round((recorder.getStatus().durationMillis ?? 0) / 1000)) },
          brainLinks: [],
        });
      } catch {
        showNotice('Audio bytes could not be read safely; nothing was uploaded.');
        return;
      }
      showNotice(pairing ? 'Voice note saved and sent to Source Vault.' : 'Voice note saved locally · will retry when paired.');
    }
  }

  async function review(id: string, decision: 'accept' | 'reject') {
    if (!api) return;
    setReviewBusyId(id);
    try {
      await api.reviewPerception(id, decision);
      setReviewItems((items) => items.filter((item) => item.id !== id));
      showNotice(decision === 'accept' ? 'Accepted for cognition; canonical Brain promotion remains separate.' : 'Interpretation rejected; evidence remains retained.');
    } catch {
      showNotice('The review could not be saved while offline.');
    } finally {
      setReviewBusyId('');
    }
  }

  async function retry(capture: Capture) {
    setBusyId(capture.id);
    try {
      await retryCapture(capture);
      showNotice('Capture sync retried.');
    } catch {
      showNotice('Still offline · capture remains safely queued.');
    } finally {
      setBusyId('');
    }
  }

  const uncertaintyItem = highestUncertainty(uncertainty);
  return (
    <Screen>
      <PageBrand />
      <Eyebrow>Quick input</Eyebrow>
      <Title subtitle="Capture first. Lee will make sense of it later.">What’s on your mind?</Title>
      {uncertaintyItem ? <UncertaintyNotice item={uncertaintyItem} offline={!pairing} /> : null}
      <Card style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
        <View style={styles.modeList}>
          {modes.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: mode === item.id }} testID={`capture-mode-${item.id}`} onPress={() => setMode(item.id)} style={({ pressed }) => [styles.mode, { backgroundColor: mode === item.id ? colors.accent : colors.secondary, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={[styles.modeText, { color: mode === item.id ? colors.accentForeground : colors.mutedForeground }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput testID="capture-input" value={text} onChangeText={setText} multiline autoCapitalize={mode === 'url' ? 'none' : 'sentences'} keyboardType={mode === 'url' ? 'url' : 'default'} placeholder={selectedMode.placeholder} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} />
        <View style={styles.tools}>
          <View style={styles.tags}>{['Untagged', 'Project', 'Person'].map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: tag === item }} onPress={() => setTag(item)} style={[styles.tag, { backgroundColor: tag === item ? colors.accent : colors.secondary }]}><Text style={[styles.tagText, { color: tag === item ? colors.accentForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}</View>
          <Pressable accessibilityRole="button" accessibilityLabel="Save capture" testID="submit-capture" onPress={() => void submit()} style={({ pressed }) => [styles.send, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}><Feather name="arrow-up" size={18} color={colors.primaryForeground} /></Pressable>
        </View>
      </Card>
       <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" testID="capture-voice" onPress={() => void voice()} style={({ pressed }) => [styles.action, { backgroundColor: recorder.isRecording ? colors.destructive : colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}><Feather name="mic" size={18} color={recorder.isRecording ? colors.destructiveForeground : colors.primary} /><Text style={[styles.actionText, { color: recorder.isRecording ? colors.destructiveForeground : colors.foreground }]}>{recorder.isRecording ? 'Stop recording' : 'Voice note'}</Text></Pressable>
        <Pressable accessibilityRole="button" testID="capture-photo" onPress={() => void photo()} style={({ pressed }) => [styles.action, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}><Feather name="camera" size={18} color={colors.primary} /><Text style={[styles.actionText, { color: colors.foreground }]}>Photo</Text></Pressable>
        <Pressable accessibilityRole="button" testID="capture-attachment" onPress={() => void attachment()} style={({ pressed }) => [styles.action, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}><Feather name="image" size={18} color={colors.primary} /><Text style={[styles.actionText, { color: colors.foreground }]}>Share / image</Text></Pressable>
        <Pressable accessibilityRole="button" testID="capture-document" onPress={() => void document()} style={({ pressed }) => [styles.action, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}><Feather name="file-text" size={18} color={colors.primary} /><Text style={[styles.actionText, { color: colors.foreground }]}>Document / PDF</Text></Pressable>
      </View>
        <Text style={[styles.localStatus, { color: colors.mutedForeground }]}>Share to LEE uses the same owner-private evidence path for links and bounded media. Continuous Watch / Observe sessions are reserved for a later phase.</Text>
       <Text style={[styles.localStatus, { color: colors.mutedForeground }]}>{hosted.connectivity === 'online' ? 'Online · new captures sync to Source Vault.' : hosted.connectivity === 'reauthorization-required' ? 'Server authorization changed · reconnect before queued captures can sync.' : 'Offline · captures stay on this device until the server is reachable.'}</Text>
      {notice ? <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}
      {reviewItems.length > 0 ? <Card style={{ borderColor: colors.accent, borderWidth: 1 }}>
        <View style={styles.reviewHeader}><SectionLabel>Owner review · {reviewItems.length}</SectionLabel><MobileStatePill colors={colors} label="Review available" tone="warning" /></View>
        {reviewItems.map((item) => <View key={item.id} style={styles.reviewItem}>
          <Text style={[styles.captureText, { color: colors.foreground }]}>{item.interpretation?.summary ?? `${item.captureType} interpretation is ready for review.`}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>Evidence only until you decide · confidence {Math.round(item.confidence * 100)}%</Text>
          <View style={styles.reviewActions}>
            <Pressable disabled={reviewBusyId === item.id} onPress={() => void review(item.id, 'reject')}><Text style={[styles.retry, { color: colors.destructive }]}>Reject</Text></Pressable>
            <Pressable disabled={reviewBusyId === item.id} onPress={() => void review(item.id, 'accept')}><Text style={[styles.retry, { color: colors.primary }]}>Accept for cognition</Text></Pressable>
          </View>
        </View>)}
      </Card> : null}
      <SectionLabel>Recent captures · {captures.length}</SectionLabel>
      {captures.length === 0 ? <Card><Text style={[styles.empty, { color: colors.mutedForeground }]}>Your next useful observation belongs here.</Text></Card> : captures.slice(0, 5).map((capture) => (
        <Card key={capture.id}>
          <View style={styles.captureRow}>
            <View style={styles.captureCopy}>
              <View style={styles.captureHeader}><Text style={[styles.captureText, { color: colors.foreground }]} numberOfLines={3}>{capture.text}</Text><MobileStatePill colors={colors} label={captureState(capture.status).label} tone={captureState(capture.status).tone} /></View>
               <Text style={[styles.meta, { color: capture.status === 'failed' || capture.status === 'rejected' || capture.status === 'conflict' ? colors.destructive : colors.mutedForeground }]}>{capture.tag} · {capture.status === 'queued' ? 'Queued locally · will retry automatically' : capture.status === 'syncing' ? 'Checking authorization…' : capture.status === 'failed' ? `Sync failed${capture.lastError ? ` · ${capture.lastError}` : ''}` : capture.status === 'rejected' ? `Sync blocked${capture.lastError ? ` · ${capture.lastError}` : ''}` : capture.status === 'conflict' ? `Conflict · server state kept${capture.lastError ? ` · ${capture.lastError}` : ''}` : 'Synced'}</Text>
               {capture.status !== 'synced' && capture.status !== 'syncing' && capture.status !== 'conflict' ? <Pressable disabled={busyId === capture.id || !pairing || capture.status === 'rejected'} onPress={() => void retry(capture)}><Text style={[styles.retry, { color: pairing && capture.status !== 'rejected' ? colors.primary : colors.mutedForeground }]}>{busyId === capture.id ? 'Retrying…' : capture.status === 'rejected' ? 'Reconnect to re-authorize' : pairing ? 'Retry sync' : 'Reconnect to retry'}</Text></Pressable> : null}
            </View>
             <Feather name={capture.status === 'synced' ? 'check-circle' : capture.status === 'failed' || capture.status === 'rejected' || capture.status === 'conflict' ? 'alert-circle' : 'clock'} size={17} color={capture.status === 'failed' || capture.status === 'rejected' || capture.status === 'conflict' ? colors.destructive : capture.status === 'queued' ? colors.mutedForeground : colors.primary} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  mode: { borderRadius: mobileTokens.radius.pill, minHeight: 38, justifyContent: 'center', paddingHorizontal: 11, paddingVertical: 7 },
  modeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  input: { minHeight: 112, fontSize: 16, lineHeight: 23, fontFamily: 'Inter_400Regular', textAlignVertical: 'top' },
  tools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tags: { flexDirection: 'row', gap: 6, flex: 1 },
  tag: { borderRadius: mobileTokens.radius.pill, minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  send: { width: 44, height: 44, borderRadius: mobileTokens.radius.md, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexBasis: '47%', flexGrow: 1, minHeight: 52, borderWidth: 1, borderRadius: mobileTokens.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  actionText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  localStatus: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  notice: { textAlign: 'center', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  empty: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  captureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reviewItem: { gap: 3, marginTop: 8 },
  captureHeader: { gap: 8 },
  reviewActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginTop: 4 },
  captureCopy: { flex: 1 },
  captureText: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_500Medium' },
  meta: { fontSize: 11, lineHeight: 16, marginTop: 5, fontFamily: 'Inter_400Regular' },
  retry: { fontSize: 12, marginTop: 7, fontFamily: 'Inter_700Bold' },
});
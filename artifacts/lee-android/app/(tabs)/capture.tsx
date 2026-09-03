import React, { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, Card, Eyebrow, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import { highestUncertainty, UncertaintyNotice } from '@/components/UncertaintyNotice';
import type { Capture } from '@/lib/types';

type CaptureMode = 'note' | 'idea' | 'observation' | 'project_update' | 'url';

const modes: Array<{ id: CaptureMode; label: string; placeholder: string }> = [
  { id: 'note', label: 'Note', placeholder: 'A fact or loose thread…' },
  { id: 'idea', label: 'Idea', placeholder: 'A possibility worth keeping…' },
  { id: 'observation', label: 'Observation', placeholder: 'What did you notice?' },
  { id: 'project_update', label: 'Project update', placeholder: 'What changed on a project?' },
  { id: 'url', label: 'URL', placeholder: 'Paste a link and a short note…' },
];

const modeTags: Record<CaptureMode, string> = {
  note: 'Note',
  idea: 'Idea',
  observation: 'Observation',
  project_update: 'Project update',
  url: 'URL',
};

export default function CaptureTab() {
  const colors = useColors();
  const { captures, addCapture, retryCapture, uncertainty, pairing } = useLee();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<CaptureMode>('note');
  const [tag, setTag] = useState('Untagged');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const selectedMode = modes.find((item) => item.id === mode) ?? modes[0];

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
    await addCapture(value, `${modeTags[mode]} · ${tag}`);
    setText('');
    showNotice(pairing ? 'Saved and sent to Source Vault.' : 'Saved locally · will retry when paired.');
  }

  async function photo() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showNotice('Camera permission is required for a photo capture.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      await addCapture(`Photo capture: ${asset.fileName ?? 'photo'} · ${asset.uri}`, 'Photo');
      showNotice(pairing ? 'Photo saved and sent to Source Vault.' : 'Photo saved locally · will retry when paired.');
    }
  }

  async function attachment() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      const kind = asset.type === 'video' ? 'File · video' : 'Screenshot / file';
      await addCapture(`${kind}: ${asset.fileName ?? 'attachment'} · ${asset.uri}`, kind);
      showNotice(pairing ? 'Attachment saved and sent to Source Vault.' : 'Attachment saved locally · will retry when paired.');
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
      recorder.record();
      showNotice('Recording… tap Voice note again to stop.');
    } else {
      await recorder.stop();
      await addCapture(`Voice capture queued${recorder.uri ? ` · ${recorder.uri}` : ''}`, 'Voice note');
      showNotice(pairing ? 'Voice note saved and sent to Source Vault.' : 'Voice note saved locally · will retry when paired.');
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
      <Eyebrow>Quick input</Eyebrow>
      <Title subtitle="Capture first. Lee will make sense of it later.">What’s on your mind?</Title>
      {uncertaintyItem ? <UncertaintyNotice item={uncertaintyItem} offline={!pairing} /> : null}
      <Card style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
        <View style={styles.modeList}>
          {modes.map((item) => (
            <Pressable key={item.id} testID={`capture-mode-${item.id}`} onPress={() => setMode(item.id)} style={[styles.mode, { backgroundColor: mode === item.id ? colors.accent : colors.secondary }]}>
              <Text style={[styles.modeText, { color: mode === item.id ? colors.accentForeground : colors.mutedForeground }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput testID="capture-input" value={text} onChangeText={setText} multiline autoCapitalize={mode === 'url' ? 'none' : 'sentences'} keyboardType={mode === 'url' ? 'url' : 'default'} placeholder={selectedMode.placeholder} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} />
        <View style={styles.tools}>
          <View style={styles.tags}>{['Untagged', 'Project', 'Person'].map((item) => <Pressable key={item} onPress={() => setTag(item)} style={[styles.tag, { backgroundColor: tag === item ? colors.accent : colors.secondary }]}><Text style={[styles.tagText, { color: tag === item ? colors.accentForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}</View>
          <Pressable testID="submit-capture" onPress={() => void submit()} style={[styles.send, { backgroundColor: colors.primary }]}><Feather name="arrow-up" size={18} color={colors.primaryForeground} /></Pressable>
        </View>
      </Card>
      <View style={styles.actionRow}>
        <Pressable testID="capture-voice" onPress={() => void voice()} style={[styles.action, { backgroundColor: recorder.isRecording ? colors.destructive : colors.card, borderColor: colors.border }]}><Feather name="mic" size={18} color={recorder.isRecording ? colors.destructiveForeground : colors.primary} /><Text style={[styles.actionText, { color: recorder.isRecording ? colors.destructiveForeground : colors.foreground }]}>{recorder.isRecording ? 'Stop recording' : 'Voice note'}</Text></Pressable>
        <Pressable testID="capture-photo" onPress={() => void photo()} style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="camera" size={18} color={colors.primary} /><Text style={[styles.actionText, { color: colors.foreground }]}>Photo</Text></Pressable>
        <Pressable testID="capture-attachment" onPress={() => void attachment()} style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="paperclip" size={18} color={colors.primary} /><Text style={[styles.actionText, { color: colors.foreground }]}>File / screenshot</Text></Pressable>
      </View>
      <Text style={[styles.localStatus, { color: colors.mutedForeground }]}>{pairing ? 'Online · new captures sync to Source Vault.' : 'Offline · captures stay on this device until the server is reachable.'}</Text>
      {notice ? <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}
      <SectionLabel>Recent captures · {captures.length}</SectionLabel>
      {captures.length === 0 ? <Card><Text style={[styles.empty, { color: colors.mutedForeground }]}>Your next useful observation belongs here.</Text></Card> : captures.slice(0, 5).map((capture) => (
        <Card key={capture.id}>
          <View style={styles.captureRow}>
            <View style={styles.captureCopy}>
              <Text style={[styles.captureText, { color: colors.foreground }]} numberOfLines={3}>{capture.text}</Text>
              <Text style={[styles.meta, { color: capture.status === 'failed' ? colors.destructive : colors.mutedForeground }]}>{capture.tag} · {capture.status === 'queued' ? 'Queued locally · will retry automatically' : capture.status === 'failed' ? `Sync failed${capture.lastError ? ` · ${capture.lastError}` : ''}` : 'Synced'}</Text>
              {capture.status === 'failed' ? <Pressable disabled={busyId === capture.id || !pairing} onPress={() => void retry(capture)}><Text style={[styles.retry, { color: pairing ? colors.primary : colors.mutedForeground }]}>{busyId === capture.id ? 'Retrying…' : pairing ? 'Retry sync' : 'Reconnect to retry'}</Text></Pressable> : null}
            </View>
            <Feather name={capture.status === 'synced' ? 'check-circle' : capture.status === 'failed' ? 'alert-circle' : 'clock'} size={17} color={capture.status === 'failed' ? colors.destructive : capture.status === 'queued' ? colors.mutedForeground : colors.primary} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  mode: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  modeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  input: { minHeight: 112, fontSize: 16, lineHeight: 23, fontFamily: 'Inter_400Regular', textAlignVertical: 'top' },
  tools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tags: { flexDirection: 'row', gap: 6, flex: 1 },
  tag: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6 },
  tagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  send: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minHeight: 50, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  actionText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  localStatus: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  notice: { textAlign: 'center', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  empty: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  captureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  captureCopy: { flex: 1 },
  captureText: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_500Medium' },
  meta: { fontSize: 11, lineHeight: 16, marginTop: 5, fontFamily: 'Inter_400Regular' },
  retry: { fontSize: 12, marginTop: 7, fontFamily: 'Inter_700Bold' },
});
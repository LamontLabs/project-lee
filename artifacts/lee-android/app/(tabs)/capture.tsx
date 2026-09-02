import React, { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, Card, Eyebrow, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import { highestUncertainty, UncertaintyNotice } from '@/components/UncertaintyNotice';

export default function CaptureTab() {
  const colors = useColors();
  const { captures, addCapture, uncertainty, pairing } = useLee();
  const [text, setText] = useState('');
  const [tag, setTag] = useState('Untagged');
  const [notice, setNotice] = useState('');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  async function submit() { if (!text.trim()) return; await addCapture(text, tag); setText(''); setNotice('Queued for understanding'); setTimeout(() => setNotice(''), 2400); }
  async function photo() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) { await addCapture(`Image capture: ${result.assets[0].fileName ?? 'screenshot'} · ${result.assets[0].uri}`, 'Image'); setNotice('Image queued for Source Vault'); }
  }
  async function voice() {
    if (!recorder.isRecording) {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) { setNotice('Microphone permission is required for voice capture.'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      recorder.record();
      setNotice('Recording… tap Voice note again to stop.');
    } else {
      await recorder.stop();
      await addCapture(`Voice capture queued${recorder.uri ? ` · ${recorder.uri}` : ''}`, 'Voice');
      setNotice('Voice note queued for Source Vault');
    }
  }
  return (
    <Screen>
      <Eyebrow>Quick input</Eyebrow><Title subtitle="Capture first. Lee will make sense of it later.">What’s on your mind?</Title>
      {(() => { const item = highestUncertainty(uncertainty); return item ? <UncertaintyNotice item={item} offline={!pairing} /> : null; })()}
      <Card style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
        <TextInput testID="capture-input" value={text} onChangeText={setText} multiline placeholder="A fact, observation, or loose thread…" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} />
        <View style={styles.tools}><View style={styles.tags}>{['Untagged', 'Project', 'Person'].map((item) => <Pressable key={item} onPress={() => setTag(item)} style={[styles.tag, { backgroundColor: tag === item ? colors.accent : colors.secondary }]}><Text style={[styles.tagText, { color: tag === item ? colors.accentForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}</View><Pressable testID="submit-capture" onPress={submit} style={[styles.send, { backgroundColor: colors.primary }]}><Feather name="arrow-up" size={18} color={colors.primaryForeground} /></Pressable></View>
      </Card>
       <View style={styles.actionRow}><Pressable onPress={() => void voice()} style={[styles.action, { backgroundColor: recorder.isRecording ? colors.destructive : colors.card, borderColor: colors.border }]}><Feather name="mic" size={18} color={recorder.isRecording ? colors.destructiveForeground : colors.primary} /><Text style={[styles.actionText, { color: recorder.isRecording ? colors.destructiveForeground : colors.foreground }]}>{recorder.isRecording ? 'Stop recording' : 'Voice note'}</Text></Pressable><Pressable onPress={photo} style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="image" size={18} color={colors.primary} /><Text style={[styles.actionText, { color: colors.foreground }]}>Photo</Text></Pressable></View>
      {notice ? <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}
      <SectionLabel>Recent captures · {captures.length}</SectionLabel>
      {captures.length === 0 ? <Card><Text style={[styles.empty, { color: colors.mutedForeground }]}>Your next useful observation belongs here.</Text></Card> : captures.slice(0, 5).map((capture) => <Card key={capture.id}><View style={styles.captureRow}><View style={styles.captureCopy}><Text style={[styles.captureText, { color: colors.foreground }]}>{capture.text}</Text><Text style={[styles.meta, { color: capture.status === 'failed' ? colors.destructive : colors.mutedForeground }]}>{capture.tag} · {capture.status === 'queued' ? 'Queued locally' : capture.status === 'failed' ? `Sync failed${capture.lastError ? ` · ${capture.lastError}` : ''}` : 'Synced'}</Text></View><Feather name={capture.status === 'synced' ? 'check-circle' : capture.status === 'failed' ? 'alert-circle' : 'clock'} size={17} color={capture.status === 'failed' ? colors.destructive : capture.status === 'queued' ? colors.mutedForeground : colors.primary} /></View></Card>)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 112, fontSize: 16, lineHeight: 23, fontFamily: 'Inter_400Regular', textAlignVertical: 'top' }, tools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, tags: { flexDirection: 'row', gap: 6, flex: 1 }, tag: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6 }, tagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' }, send: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, actionRow: { flexDirection: 'row', gap: 10 }, action: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, actionText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' }, notice: { textAlign: 'center', fontSize: 13, fontFamily: 'Inter_600SemiBold' }, empty: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' }, captureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, captureCopy: { flex: 1 }, captureText: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_500Medium' }, meta: { fontSize: 11, marginTop: 5, fontFamily: 'Inter_400Regular' },
});
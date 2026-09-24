import React, { useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Eyebrow, PageBrand, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import { RoseBackdrop, mobileTokens } from '@workspace/mobile-foundation';

type Message = { id: string; role: 'user' | 'assistant'; content: string; model?: string; cost?: number; status?: 'streaming' | 'complete' | 'error' | 'cancelled'; evidence?: number; question?: string };
let counter = 0;
const id = () => `m-${Date.now()}-${++counter}`;

export default function AskTab() {
  const colors = useColors(); const { api, hosted } = useLee(); const insets = useSafeAreaInsets(); const input = useRef<TextInput>(null); const listRef = useRef<FlatList<Message>>(null);
  const { prompt, alertId } = useLocalSearchParams<{ prompt?: string; alertId?: string }>();
  const [question, setQuestion] = useState(''); const [messages, setMessages] = useState<Message[]>([]); const [loading, setLoading] = useState(false); const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (prompt) setQuestion(String(prompt));
    if (alertId && api && hosted.freshness === 'live') void api.alertContext(String(alertId)).then((context) => setQuestion(context.prompt)).catch(() => undefined);
  }, [alertId, api, hosted.freshness, prompt]);
  useEffect(() => {
    if (messages.length) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length]);
  async function ask(retryText?: string) { const text = (retryText ?? question).trim(); if (!text || !api || hosted.freshness !== 'live' || loading) return; setQuestion(''); const assistantId = id(); setMessages((current) => [...current, { id: id(), role: 'user', content: text }, { id: assistantId, role: 'assistant', content: '', status: 'streaming', question: text }]); setLoading(true); abort.current = new AbortController(); try { await api.askStream(text, (event) => setMessages((current) => current.map((item) => item.id !== assistantId ? item : event.type === 'chunk' ? { ...item, content: item.content + event.data.text } : event.type === 'start' ? { ...item, model: event.data.model, evidence: event.data.evidence.length } : event.type === 'complete' ? { ...item, content: event.data.answer, model: event.data.model, cost: event.data.estimatedCostUsd, evidence: event.data.evidence.length, status: 'complete' } : { ...item, content: event.data.error, status: 'error' })), abort.current.signal); } catch (error) { const cancelled = abort.current?.signal.aborted; setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: cancelled ? 'Response cancelled. You can try again.' : error instanceof Error ? error.message : 'Lee could not answer while offline.', status: cancelled ? 'cancelled' : 'error' } : item)); } finally { abort.current = null; setLoading(false); input.current?.focus(); } }
  function cancel() { abort.current?.abort(); }
  return (
    <View style={[styles.keyboard, { backgroundColor: colors.background }]}>
      <RoseBackdrop
        colors={colors}
        topSource={require('../../assets/images/rose-top.png')}
        bottomSource={require('../../assets/images/rose-bottom.png')}
      />
      <KeyboardAvoidingView behavior="padding" style={styles.keyboard}>
      <View style={[styles.shell, { paddingTop: insets.top + 16 }]}>
        <PageBrand />
        <View style={styles.header}>
          <Eyebrow>Low-cost mode · evidence first</Eyebrow>
          <Title subtitle="A fast question is often enough to unblock the next move.">Ask Lee.</Title>
          {hosted.freshness !== 'live' && <View style={[styles.offline, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="wifi-off" size={15} color={colors.warning} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{hosted.detail} External-dependent answers stay blocked until the hosted Core is live.</Text>
          </View>}
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.empty}><Feather name="message-circle" size={22} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ask for grounded context.</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>Responses stay source-backed and show their evidence count when available.</Text></View>}
          ListFooterComponent={loading ? <Pressable accessibilityRole="button" onPress={cancel} style={[styles.typing, { backgroundColor: colors.card, borderColor: colors.border }]}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.meta, { color: colors.mutedForeground }]}>Lee is responding… Tap to cancel</Text></Pressable> : null}
          renderItem={({ item }) => (
            <View style={[styles.bubble, { alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: item.role === 'user' ? colors.accent : colors.card, borderColor: item.role === 'user' ? colors.accent : colors.border }]}>
              <Text selectable style={[styles.message, { color: colors.foreground }]}>{item.content || (item.status === 'streaming' ? '…' : '')}</Text>
              {item.role === 'assistant' && <View style={styles.responseMeta}>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.status === 'streaming' ? 'Lee is responding…' : `${item.model ?? 'Lee'} · ${item.cost == null ? '—' : `$${item.cost.toFixed(4)}`} estimated${item.evidence == null ? '' : ` · ${item.evidence} evidence`}`}</Text>
                {item.status === 'error' && <Pressable accessibilityRole="button" onPress={() => void ask(item.question)} hitSlop={8}><Text style={[styles.retry, { color: colors.primary }]}>Try again</Text></Pressable>}
              </View>}
            </View>
          )}
        />
        <View style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            ref={input}
            testID="ask-input"
            editable={hosted.freshness === 'live'}
            value={question}
            onChangeText={setQuestion}
            multiline
            blurOnSubmit={false}
            onFocus={() => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))}
            placeholder={hosted.freshness === 'live' ? 'What do you need to understand?' : 'Pair with hosted Core to ask Lee'}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Cancel response' : 'Send question'}
            accessibilityState={{ disabled: hosted.freshness !== 'live' }}
            disabled={hosted.freshness !== 'live'}
            testID="ask-button"
            onPress={() => { Keyboard.dismiss(); loading ? cancel() : void ask(); }}
            style={({ pressed }) => [styles.send, { backgroundColor: hosted.freshness === 'live' ? colors.primary : colors.secondary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name={loading ? 'x' : 'arrow-up'} size={18} color={hosted.freshness === 'live' ? colors.primaryForeground : colors.mutedForeground} />
          </Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  shell: { flex: 1, paddingHorizontal: 18 },
  header: { gap: 8 },
  messages: { flexGrow: 1, gap: 10, paddingTop: 10, paddingBottom: 12 },
  bubble: { maxWidth: '92%', borderWidth: 1, borderRadius: 16, padding: 14 },
  message: { fontSize: 15, lineHeight: 23, fontFamily: 'Inter_400Regular' },
  responseMeta: { gap: 2 },
  meta: { fontSize: 10, lineHeight: 15, marginTop: 7, fontFamily: 'Inter_500Medium' },
  retry: { fontSize: 12, marginTop: 7, fontFamily: 'Inter_700Bold' },
  typing: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1 },
  offline: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 11, borderRadius: 12, borderWidth: 1 },
  empty: { alignItems: 'center', gap: 7, paddingTop: 36, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderRadius: mobileTokens.radius.md, padding: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 132, fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular', paddingHorizontal: 8, paddingTop: 10 },
  send: { width: 44, height: 44, borderRadius: mobileTokens.radius.md, alignItems: 'center', justifyContent: 'center' },
});
import React, { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native'
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio'
import { Microphone, MicrophoneSlash, X, Check, CheckCircle } from 'phosphor-react-native'
import { colors, font } from '../theme'
import { processVoiceDump } from '../services/ai'

const S = { IDLE: 'idle', RECORDING: 'recording', PROCESSING: 'processing', DONE: 'done', ERROR: 'error' }

const CATEGORY_COLORS = { health: colors.health, work: colors.work, content: colors.content, personal: colors.personal, finance: colors.finance, other: colors.other }

export default function VoiceDumpScreen({ navigation }) {
  const [state, setState]         = useState(S.IDLE)
  const [useText, setUseText]     = useState(false)
  const [textInput, setTextInput] = useState('')
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const [elapsed, setElapsed]     = useState(0)
  const recorder   = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const timerRef   = useRef(null)
  const mountedRef = useRef(true)

  // Auto-start recording as soon as the screen opens (from mic button or Side Key)
  useEffect(() => {
    startRecording()
    return () => {
      mountedRef.current = false
      clearInterval(timerRef.current)
      if (recorder.isRecording) recorder.stop().catch(() => {})
    }
  }, [])

  const safeSet = (fn) => { if (mountedRef.current) fn() }

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync()
      if (!granted) {
        Alert.alert('Permission needed', 'Nudge needs microphone access to record.')
        safeSet(() => setUseText(true))
        return
      }
      // setAudioModeAsync options are iOS-specific — skip on Android to avoid crash
      if (Platform.OS === 'ios') {
        await setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      }
      await recorder.prepareToRecordAsync()
      recorder.record()
      safeSet(() => {
        setElapsed(0)
        timerRef.current = setInterval(() => safeSet(() => setElapsed(s => s + 1)), 1000)
        setState(S.RECORDING)
      })
    } catch (e) {
      console.warn('[VoiceDump] startRecording error:', e)
      safeSet(() => { setError('Could not start recording: ' + e.message); setState(S.ERROR) })
    }
  }

  const stopRecording = async () => {
    clearInterval(timerRef.current)
    try {
      await recorder.stop()
      const uri = recorder.uri
      if (!uri) throw new Error('No recording file produced.')
      safeSet(() => setState(S.PROCESSING))
      await handleProcess(uri)
    } catch (e) {
      console.warn('[VoiceDump] stopRecording error:', e)
      safeSet(() => { setError(e.message); setState(S.ERROR) })
    }
  }

  const handleProcess = async (uri, text = null) => {
    try {
      const res = await processVoiceDump(uri, text)
      safeSet(() => { setResult(res); setState(S.DONE) })
    } catch (e) {
      console.warn('[VoiceDump] handleProcess error:', e)
      safeSet(() => { setError(e.message || 'Something went wrong.'); setState(S.ERROR) })
    }
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return
    safeSet(() => setState(S.PROCESSING))
    await handleProcess(null, textInput.trim())
  }

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Voice Dump</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn}>
          <X size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

        {/* IDLE */}
        {state === S.IDLE && !useText && (
          <View style={s.center}>
            <Text style={s.headline}>Talk freely.</Text>
            <Text style={s.sub}>Plans, tasks, reminders — anything. Nudge figures the rest out.</Text>
            <TouchableOpacity style={s.micBtn} onPress={startRecording}>
              <Microphone size={32} color="#fff" weight="fill" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setUseText(true)}>
              <Text style={s.textLink}>Type instead</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RECORDING */}
        {state === S.RECORDING && (
          <View style={s.center}>
            <Text style={s.headline}>Listening...</Text>
            <Text style={[s.sub, { fontVariant: ['tabular-nums'] }]}>{fmt(elapsed)}</Text>
            <TouchableOpacity style={[s.micBtn, { backgroundColor: colors.missed }]} onPress={stopRecording}>
              <MicrophoneSlash size={32} color="#fff" weight="fill" />
            </TouchableOpacity>
            <Text style={s.textLink}>Tap to stop & process</Text>
          </View>
        )}

        {/* PROCESSING */}
        {state === S.PROCESSING && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.headline}>Parsing your plan...</Text>
            <Text style={s.sub}>Whisper → GPT-4o</Text>
          </View>
        )}

        {/* DONE */}
        {state === S.DONE && result && (
          <View style={{ gap: 12 }}>
            <View style={s.doneRow}>
              <View style={s.doneCheck}><Check size={12} color={colors.done} /></View>
              <Text style={s.doneText}>
                Got it — {result.items?.filter(i => i.type !== 'context' && i.type !== 'habit').length} nudge(s)
                {result.storedHabits?.length > 0 ? `, ${result.storedHabits.length} habit(s)` : ''} created.
              </Text>
            </View>

            {result.summary && <Text style={s.sub}>{result.summary}</Text>}

            {result.items?.map((item, i) => (
              <View key={i} style={s.itemRow}>
                <View style={[s.dot, { backgroundColor: CATEGORY_COLORS[item.category] ?? colors.other }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{item.title}</Text>
                  {item.nudge_copy && item.type !== 'context' && (
                    <Text style={s.itemCopy}>{item.nudge_copy}</Text>
                  )}
                </View>
                {item.type !== 'context' && (
                  <View style={s.typeBadge}><Text style={s.typeBadgeText}>{item.type}</Text></View>
                )}
              </View>
            ))}

            <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()}>
              <Text style={s.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TEXT INPUT / ERROR fallback */}
        {(state === S.ERROR || useText) && state !== S.PROCESSING && state !== S.DONE && (
          <View style={{ gap: 12 }}>
            {error ? <Text style={s.errorText}>{error}</Text> : null}
            <TextInput
              style={s.textArea}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="I'm heading to a coffee shop, remind me to drink water..."
              placeholderTextColor={colors.muted}
              multiline
              autoFocus
            />
            <TouchableOpacity style={[s.doneBtn, !textInput.trim() && { opacity: 0.4 }]}
              onPress={handleTextSubmit} disabled={!textInput.trim()}>
              <Text style={s.doneBtnText}>Parse this</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.bg },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:    { fontSize: font.base, fontWeight: '700', color: colors.foreground },
  closeBtn: { padding: 4 },
  body:     { padding: 20, gap: 8, flexGrow: 1 },
  center:   { alignItems: 'center', gap: 16, paddingTop: 40 },
  headline: { fontSize: font.lg, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  sub:      { fontSize: font.sm, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  micBtn:   { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  textLink: { fontSize: font.xs, color: colors.muted, textDecorationLine: 'underline' },
  doneRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneCheck:{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.done + '22', alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: font.sm, fontWeight: '600', color: colors.foreground, flex: 1 },
  itemRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 },
  dot:      { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  itemTitle:{ fontSize: font.sm, fontWeight: '600', color: colors.foreground },
  itemCopy: { fontSize: font.xs, color: colors.muted, marginTop: 2, lineHeight: 17 },
  typeBadge:{ backgroundColor: colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, color: colors.muted, textTransform: 'capitalize' },
  doneBtn:  { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  doneBtnText: { fontSize: font.sm, fontWeight: '700', color: '#fff' },
  textArea: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: font.sm, color: colors.foreground, minHeight: 120, textAlignVertical: 'top' },
  errorText:{ fontSize: font.xs, color: colors.missed, textAlign: 'center' },
})

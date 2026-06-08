import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, ScrollView, Platform, Animated, Modal
} from 'react-native'
import { useAudioRecorder, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio'
import { Microphone, MicrophoneSlash, X, Check, PencilSimple, ArrowRight } from 'phosphor-react-native'
import { colors, font } from '../theme'
import { processVoiceDump } from '../services/ai'

const S = { STARTING: 'starting', RECORDING: 'recording', PROCESSING: 'processing', DONE: 'done', TEXT: 'text', ERROR: 'error' }

const CATEGORY_COLORS = {
  health: colors.health, work: colors.work, content: colors.content,
  personal: colors.personal, finance: colors.finance, other: colors.other,
}

const RECORDING_OPTIONS = {
  android: { extension: '.m4a', outputFormat: 'mpeg4', audioEncoder: 'aac', sampleRate: 44100, numberOfChannels: 2, bitRate: 128000 },
  ios:     { extension: '.m4a', outputFormat: 'mpeg4AAC', audioQuality: 'max', sampleRate: 44100, numberOfChannels: 2, bitRate: 128000 },
  web:     { mimeType: 'audio/webm', bitsPerSecond: 128000 },
}

function PulsingRing({ active }) {
  const scale   = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(0.5)).current
  useEffect(() => {
    if (!active) return
    const loop = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale,   { toValue: 1.7, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(scale,   { toValue: 1,   duration: 0, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
      ]),
    ]))
    loop.start()
    return () => loop.stop()
  }, [active])
  if (!active) return null
  return <Animated.View style={[s.pulse, { transform: [{ scale }], opacity }]} />
}

// ─── Exported component ───────────────────────────────────────────────────────
// Props: visible, onClose, textMode (bool)

export default function VoiceDumpScreen({ visible, onClose, textMode = false }) {
  const [state, setState]         = useState(S.STARTING)
  const [textInput, setTextInput] = useState('')
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const [elapsed, setElapsed]     = useState(0)
  const recorder   = useAudioRecorder(RECORDING_OPTIONS)
  const timerRef   = useRef(null)
  const mountedRef = useRef(false)

  // Reset and start whenever the sheet opens
  useEffect(() => {
    if (visible) {
      mountedRef.current = true
      setState(textMode ? S.TEXT : S.STARTING)
      setResult(null); setError(''); setTextInput(''); setElapsed(0)
      if (!textMode) startRecording()
    } else {
      mountedRef.current = false
      clearInterval(timerRef.current)
      if (recorder.isRecording) recorder.stop().catch(() => {})
    }
  }, [visible])

  const safe = (fn) => { if (mountedRef.current) fn() }

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync()
      if (!granted) { safe(() => setState(S.TEXT)); return }
      if (Platform.OS === 'ios') {
        await setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      }
      await recorder.prepareToRecordAsync()
      recorder.record()
      safe(() => {
        setElapsed(0)
        timerRef.current = setInterval(() => safe(() => setElapsed(n => n + 1)), 1000)
        setState(S.RECORDING)
      })
    } catch (e) {
      console.warn('[Nudge] startRecording:', e.message)
      safe(() => { setError(e.message); setState(S.TEXT) })
    }
  }

  const stopRecording = async () => {
    clearInterval(timerRef.current)
    try {
      await recorder.stop()
      const uri = recorder.uri
      if (!uri) throw new Error('No recording file produced.')
      safe(() => setState(S.PROCESSING))
      await handleProcess(uri)
    } catch (e) {
      console.warn('[Nudge] stopRecording:', e.message)
      safe(() => { setError(e.message); setState(S.TEXT) })
    }
  }

  const handleProcess = async (uri, text = null) => {
    try {
      const res = await processVoiceDump(uri, text)
      safe(() => { setResult(res); setState(S.DONE) })
    } catch (e) {
      console.warn('[Nudge] handleProcess:', e.message)
      safe(() => { setError(e.message || 'Something went wrong.'); setState(S.ERROR) })
    }
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return
    safe(() => setState(S.PROCESSING))
    await handleProcess(null, textInput.trim())
  }

  // Only allow closing when it's safe (not mid-recording or processing)
  const isSafeToClose = state !== S.RECORDING && state !== S.PROCESSING && state !== S.STARTING

  const handleClose = () => {
    if (!isSafeToClose) return
    clearInterval(timerRef.current)
    if (recorder.isRecording) recorder.stop().catch(() => {})
    onClose()
  }

  const forceClose = () => {
    clearInterval(timerRef.current)
    if (recorder.isRecording) recorder.stop().catch(() => {})
    onClose()
  }

  const switchToText = () => {
    clearInterval(timerRef.current)
    if (recorder.isRecording) recorder.stop().catch(() => {})
    safe(() => setState(S.TEXT))
  }

  const switchToVoice = () => {
    safe(() => { setError(''); setState(S.STARTING) })
    startRecording()
  }

  const fmt = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={forceClose}>

      <View style={s.backdrop}>
        {/* Dim area — only dismiss when safe (not recording/processing) */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={isSafeToClose ? handleClose : undefined}
        />

        {/* Sheet */}
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.topRow}>
            <Text style={s.sheetTitle}>
              {state === S.STARTING   ? 'Starting…'      :
               state === S.RECORDING  ? 'Recording'       :
               state === S.PROCESSING ? 'Processing'      :
               state === S.DONE       ? 'Done'            : 'Type a task'}
            </Text>
            <TouchableOpacity onPress={forceClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

            {state === S.STARTING && (
              <View style={s.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}

            {state === S.RECORDING && (
              <View style={s.center}>
                <View style={s.micWrap}>
                  <PulsingRing active />
                  <TouchableOpacity style={s.stopBtn} onPress={stopRecording} activeOpacity={0.8}>
                    <MicrophoneSlash size={28} color="#fff" weight="fill" />
                  </TouchableOpacity>
                </View>
                <Text style={s.timer}>{fmt(elapsed)}</Text>
                <Text style={s.hint}>Tap to stop</Text>
                <TouchableOpacity style={s.switchRow} onPress={switchToText}>
                  <PencilSimple size={13} color={colors.muted} />
                  <Text style={s.switchText}>Type instead</Text>
                </TouchableOpacity>
              </View>
            )}

            {state === S.PROCESSING && (
              <View style={s.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={s.processingLabel}>Parsing your plan…</Text>
                <Text style={s.hint}>Whisper → GPT-4o</Text>
              </View>
            )}

            {state === S.DONE && result && (
              <View style={{ gap: 10 }}>
                <View style={s.doneRow}>
                  <View style={s.doneIcon}><Check size={12} color={colors.done} weight="bold" /></View>
                  <Text style={s.doneText}>
                    {result.items?.filter(i => i.type !== 'context' && i.type !== 'habit').length ?? 0} nudge(s)
                    {result.storedHabits?.length > 0 ? `, ${result.storedHabits.length} habit(s)` : ''} created
                  </Text>
                </View>
                {result.summary ? <Text style={s.hint}>{result.summary}</Text> : null}
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
                      <View style={s.badge}><Text style={s.badgeText}>{item.type}</Text></View>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={s.actionBtn} onPress={handleClose}>
                  <Text style={s.actionBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {(state === S.TEXT || state === S.ERROR) && state !== S.PROCESSING && state !== S.DONE && (
              <View style={{ gap: 10 }}>
                {error ? <Text style={s.errorText}>{error}</Text> : null}
                <TextInput
                  style={s.textArea}
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder="Remind me to call the dentist at 3pm, pick up groceries on the way home…"
                  placeholderTextColor={colors.muted}
                  multiline
                  autoFocus
                />
                <TouchableOpacity
                  style={[s.actionBtn, !textInput.trim() && { opacity: 0.4 }]}
                  onPress={handleTextSubmit}
                  disabled={!textInput.trim()}>
                  <ArrowRight size={15} color="#fff" weight="bold" />
                  <Text style={s.actionBtnText}>Parse this</Text>
                </TouchableOpacity>
                {state !== S.ERROR && (
                  <TouchableOpacity style={s.switchRow} onPress={switchToVoice}>
                    <Microphone size={13} color={colors.muted} />
                    <Text style={s.switchText}>Use voice instead</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:         { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '82%' },
  handle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  topRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  sheetTitle:    { fontSize: font.sm, fontWeight: '700', color: colors.foreground },
  body:          { paddingTop: 4, paddingBottom: 12 },
  center:        { alignItems: 'center', gap: 14, paddingVertical: 28 },
  micWrap:       { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  pulse:         { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: colors.missed + '55' },
  stopBtn:       { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.missed, alignItems: 'center', justifyContent: 'center' },
  timer:         { fontSize: 34, fontWeight: '700', color: colors.foreground, fontVariant: ['tabular-nums'] },
  hint:          { fontSize: font.xs, color: colors.muted, textAlign: 'center' },
  processingLabel:{ fontSize: font.base, fontWeight: '600', color: colors.foreground },
  switchRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  switchText:    { fontSize: font.xs, color: colors.muted },
  doneRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneIcon:      { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.done + '22', alignItems: 'center', justifyContent: 'center' },
  doneText:      { fontSize: font.sm, fontWeight: '600', color: colors.foreground, flex: 1 },
  itemRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 },
  dot:           { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  itemTitle:     { fontSize: font.sm, fontWeight: '600', color: colors.foreground },
  itemCopy:      { fontSize: font.xs, color: colors.muted, marginTop: 2, lineHeight: 17 },
  badge:         { backgroundColor: colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText:     { fontSize: 10, color: colors.muted, textTransform: 'capitalize' },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 12, padding: 14 },
  actionBtnText: { fontSize: font.sm, fontWeight: '700', color: '#fff' },
  textArea:      { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: font.sm, color: colors.foreground, minHeight: 100, textAlignVertical: 'top' },
  errorText:     { fontSize: font.xs, color: colors.missed, textAlign: 'center', marginBottom: 4 },
})

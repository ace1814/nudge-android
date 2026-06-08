import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { Shield, Database, Sliders, Lightning, CheckCircle, Eye, EyeSlash, WifiHigh, WifiX, CircleNotch } from 'phosphor-react-native'
import { colors, font } from '../theme'
import { storage } from '../services/storage'
import { resetSupabase, getSupabase } from '../services/supabase'

const TONES = [
  { id: 'gentle', label: 'Gentle', desc: 'Soft, no pressure' },
  { id: 'firm',   label: 'Firm',   desc: 'Clear and direct' },
  { id: 'blunt',  label: 'Blunt',  desc: 'No fluff, just the ask' }
]

export default function SettingsScreen() {
  const [openaiKey,  setOpenaiKey]  = useState('')
  const [keySet,     setKeySet]     = useState(false)
  const [showKey,    setShowKey]    = useState(false)
  const [supaUrl,    setSupaUrl]    = useState('')
  const [supaKey,    setSupaKey]    = useState('')
  const [tone,       setTone]       = useState('gentle')
  const [dbStatus,   setDbStatus]   = useState(null)
  const [testing,    setTesting]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    Promise.all([
      storage.get('openai_key'),
      storage.get('supabase_url'),
      storage.get('supabase_key'),
      storage.get('nudge_tone')
    ]).then(([ok, su, sk, nt]) => {
      setKeySet(!!ok)
      setSupaUrl(su || '')
      setSupaKey(sk || '')
      setTone(nt || 'gentle')
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (openaiKey.trim()) { await storage.set('openai_key', openaiKey.trim()); setKeySet(true); setOpenaiKey('') }
      if (supaUrl.trim())   { await storage.set('supabase_url', supaUrl.trim()); resetSupabase() }
      if (supaKey.trim())   { await storage.set('supabase_key', supaKey.trim()); resetSupabase() }
      await storage.set('nudge_tone', tone)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const testConnection = async () => {
    setTesting(true); setDbStatus(null)
    try {
      resetSupabase()
      const db = await getSupabase()
      if (!db) { setDbStatus({ ok: false, error: 'No URL or key stored. Save settings first.' }); return }
      const tables = { days: 'id', nudges: 'id', habits: 'id', completions: 'id', settings: 'key' }
      for (const [table, col] of Object.entries(tables)) {
        const { error } = await db.from(table).select(col).limit(1)
        if (error) { setDbStatus({ ok: false, error: `Table "${table}": ${error.message}` }); return }
      }
      setDbStatus({ ok: true })
    } catch (e) { setDbStatus({ ok: false, error: e.message }) }
    finally { setTesting(false) }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.pageTitle}>Settings</Text>

      {/* OpenAI */}
      <Section title="OpenAI" Icon={Shield}>
        {keySet && (
          <View style={s.keySet}>
            <CheckCircle size={13} color={colors.done} weight="fill" />
            <Text style={s.keySetText}>Key stored securely</Text>
          </View>
        )}
        <View style={s.inputRow}>
          <TextInput style={[s.input, { flex: 1 }]}
            value={openaiKey} onChangeText={setOpenaiKey}
            placeholder={keySet ? 'Replace existing key...' : 'sk-proj-...'}
            placeholderTextColor={colors.muted}
            secureTextEntry={!showKey} autoCapitalize="none" autoCorrect={false} />
          <TouchableOpacity onPress={() => setShowKey(!showKey)} style={s.eyeBtn}>
            {showKey ? <EyeSlash size={16} color={colors.muted} /> : <Eye size={16} color={colors.muted} />}
          </TouchableOpacity>
        </View>
        <Text style={s.hint}>Stored in device secure storage. Never sent to our servers.</Text>
      </Section>

      {/* Supabase */}
      <Section title="Supabase" Icon={Database}>
        <TextInput style={s.input} value={supaUrl} onChangeText={setSupaUrl}
          placeholder="https://xxxx.supabase.co" placeholderTextColor={colors.muted}
          autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <TextInput style={[s.input, { marginTop: 8 }]} value={supaKey} onChangeText={setSupaKey}
          placeholder="service_role key" placeholderTextColor={colors.muted}
          secureTextEntry autoCapitalize="none" autoCorrect={false} />
        <Text style={s.hint}>Use the service_role key, not anon.</Text>

        <TouchableOpacity style={s.testBtn} onPress={testConnection} disabled={testing}>
          {testing ? <CircleNotch size={13} color={colors.muted} /> : <WifiHigh size={13} color={colors.muted} />}
          <Text style={s.testBtnText}>{testing ? 'Testing...' : 'Test connection'}</Text>
        </TouchableOpacity>

        {dbStatus && (
          <View style={[s.dbResult, dbStatus.ok ? s.dbOk : s.dbErr]}>
            {dbStatus.ok
              ? <CheckCircle size={13} color={colors.done} weight="fill" />
              : <WifiX size={13} color={colors.missed} />}
            <Text style={[s.dbResultText, { color: dbStatus.ok ? colors.done : colors.missed }]}>
              {dbStatus.ok ? 'All tables found. Connected.' : dbStatus.error}
            </Text>
          </View>
        )}
      </Section>

      {/* Nudge tone */}
      <Section title="Nudge Tone" Icon={Sliders}>
        {TONES.map(t => (
          <TouchableOpacity key={t.id} style={[s.toneRow, tone === t.id && s.toneRowActive]}
            onPress={() => setTone(t.id)}>
            <View style={[s.toneRadio, tone === t.id && s.toneRadioActive]} />
            <View>
              <Text style={s.toneLabel}>{t.label}</Text>
              <Text style={s.toneDesc}>{t.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </Section>

      {/* Power button instructions */}
      <Section title="Samsung Side Key" Icon={Lightning}>
        <View style={s.infoBox}>
          <Text style={s.infoText}>Launch Nudge with a single button press:</Text>
          <Text style={s.infoStep}>1. Open Samsung Settings</Text>
          <Text style={s.infoStep}>2. Advanced features → Side key</Text>
          <Text style={s.infoStep}>3. Press → Open app → Select Nudge</Text>
          <Text style={s.infoStep}>   (or Double press if you use Press for something else)</Text>
          <Text style={s.infoStep}>4. Press your Side key once — Nudge opens and recording starts immediately!</Text>
        </View>
      </Section>

      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        <Text style={s.saveBtnText}>{saved ? '✓ Saved' : saving ? 'Saving...' : 'Save settings'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function Section({ title, Icon, children }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        {Icon && <Icon size={12} color={colors.muted} />}
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.bg },
  content:       { padding: 16, paddingBottom: 40 },
  pageTitle:     { fontSize: font.lg, fontWeight: '700', color: colors.foreground, marginBottom: 20 },
  section:       { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle:  { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.5 },
  keySet:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  keySetText:    { fontSize: font.xs, color: colors.done },
  inputRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input:         { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: font.sm, color: colors.foreground },
  eyeBtn:        { padding: 8 },
  hint:          { fontSize: font.xs, color: colors.muted, marginTop: 6 },
  testBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  testBtnText:   { fontSize: font.xs, color: colors.muted },
  dbResult:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10, marginTop: 8 },
  dbOk:          { backgroundColor: colors.done + '15' },
  dbErr:         { backgroundColor: colors.missed + '15' },
  dbResultText:  { fontSize: font.xs, flex: 1, lineHeight: 17 },
  toneRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 6 },
  toneRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  toneRadio:     { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.muted },
  toneRadioActive:{ borderColor: colors.primary, backgroundColor: colors.primary },
  toneLabel:     { fontSize: font.sm, fontWeight: '600', color: colors.foreground },
  toneDesc:      { fontSize: font.xs, color: colors.muted, marginTop: 1 },
  infoBox:       { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 6 },
  infoText:      { fontSize: font.sm, color: colors.foreground, fontWeight: '600', marginBottom: 4 },
  infoStep:      { fontSize: font.sm, color: colors.muted, lineHeight: 20 },
  saveBtn:       { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  saveBtnText:   { fontSize: font.sm, fontWeight: '700', color: '#fff' },
})

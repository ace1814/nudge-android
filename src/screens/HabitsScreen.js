import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Switch, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { colors, font } from '../theme'
import { getActiveHabits, upsertHabit, deleteHabit } from '../services/supabase'

const FREQS  = ['daily', 'weekdays', 'weekends']
const TONES  = ['gentle', 'firm', 'blunt']
const EMPTY  = { name: '', frequency: 'daily', nudge_tone: 'gentle', active: true }

export default function HabitsScreen() {
  const [habits, setHabits]   = useState([])
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    try { setHabits(await getActiveHabits() || []) } catch (e) { console.warn(e.message) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try { await upsertHabit(form); setForm(EMPTY); setAdding(false); load() }
    finally { setSaving(false) }
  }

  const confirmDelete = (id, name) => {
    Alert.alert('Delete habit', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteHabit(id); load() } }
    ])
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Habits</Text>
          <Text style={s.sub}>Always on, no re-entry needed</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setAdding(!adding)}>
          <Feather name={adding ? 'x' : 'plus'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>

        {/* Add form */}
        {adding && (
          <View style={s.card}>
            <TextInput
              style={s.input}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="e.g. Morning swim"
              placeholderTextColor={colors.muted}
              autoFocus
            />

            <Text style={s.label}>Frequency</Text>
            <View style={s.chipRow}>
              {FREQS.map(f => (
                <TouchableOpacity key={f} style={[s.chip, form.frequency === f && s.chipActive]}
                  onPress={() => setForm(ff => ({ ...ff, frequency: f }))}>
                  <Text style={[s.chipText, form.frequency === f && s.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Tone</Text>
            <View style={s.chipRow}>
              {TONES.map(t => (
                <TouchableOpacity key={t} style={[s.chip, form.nudge_tone === t && s.chipActive]}
                  onPress={() => setForm(f => ({ ...f, nudge_tone: t }))}>
                  <Text style={[s.chipText, form.nudge_tone === t && s.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.formBtns}>
              <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={() => { setAdding(false); setForm(EMPTY) }}>
                <Text style={s.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnPrimary, (!form.name.trim() || saving) && { opacity: 0.5 }]}
                onPress={handleSave} disabled={!form.name.trim() || saving}>
                <Text style={s.btnPrimaryText}>{saving ? 'Saving...' : 'Add habit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {habits.length === 0 && !adding && (
          <Text style={s.empty}>No habits yet. Tap + to add one.</Text>
        )}

        {habits.map(h => (
          <View key={h.id} style={[s.card, s.habitCard]}>
            <View style={{ flex: 1 }}>
              <Text style={s.habitName}>{h.name}</Text>
              <Text style={s.habitMeta}>{h.frequency} · {h.nudge_tone}</Text>
            </View>
            <Switch
              value={h.active}
              onValueChange={async v => { await upsertHabit({ ...h, active: v }); load() }}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
            <TouchableOpacity onPress={() => confirmDelete(h.id, h.name)} style={s.deleteBtn}>
              <Feather name="trash-2" size={16} color={colors.missed} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title:         { fontSize: font.lg, fontWeight: '700', color: colors.foreground },
  sub:           { fontSize: font.xs, color: colors.muted, marginTop: 2 },
  addBtn:        { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  card:          { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14 },
  habitCard:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input:         { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: font.sm, color: colors.foreground, marginBottom: 14 },
  label:         { fontSize: font.xs, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  chipRow:       { flexDirection: 'row', gap: 6, marginBottom: 14 },
  chip:          { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  chipActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:      { fontSize: font.xs, color: colors.muted, fontWeight: '600', textTransform: 'capitalize' },
  chipTextActive:{ color: '#fff' },
  formBtns:      { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn:           { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnPrimary:    { backgroundColor: colors.primary },
  btnPrimaryText:{ fontSize: font.sm, fontWeight: '700', color: '#fff' },
  btnSecondary:  { backgroundColor: colors.border },
  btnSecondaryText: { fontSize: font.sm, fontWeight: '600', color: colors.foreground },
  habitName:     { fontSize: font.sm, fontWeight: '600', color: colors.foreground },
  habitMeta:     { fontSize: font.xs, color: colors.muted, textTransform: 'capitalize', marginTop: 2 },
  deleteBtn:     { padding: 4 },
  empty:         { fontSize: font.sm, color: colors.muted, textAlign: 'center', marginTop: 60 },
})

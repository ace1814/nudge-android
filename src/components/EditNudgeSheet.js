import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native'
import { X } from 'phosphor-react-native'
import dayjs from 'dayjs'
import { colors, font } from '../theme'
import { updateNudge } from '../services/supabase'

const CATEGORIES = ['health', 'work', 'content', 'personal', 'finance', 'other']
const CAT_COLORS = {
  health: colors.health, work: colors.work, content: colors.content,
  personal: colors.personal, finance: colors.finance, other: colors.other,
}

export default function EditNudgeSheet({ nudge, visible, onClose, onSaved }) {
  const [title, setTitle]     = useState('')
  const [copy, setCopy]       = useState('')
  const [category, setCategory] = useState('other')
  const [dateStr, setDateStr] = useState('')   // YYYY-MM-DD
  const [timeStr, setTimeStr] = useState('')   // HH:MM
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (nudge && visible) {
      setTitle(nudge.title || '')
      setCopy(nudge.nudge_copy || '')
      setCategory(nudge.category || 'other')
      const d = dayjs(nudge.scheduled_for)
      setDateStr(d.format('YYYY-MM-DD'))
      setTimeStr(d.format('HH:mm'))
      setError('')
    }
  }, [nudge, visible])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    setError('')
    try {
      const scheduled_for = new Date(`${dateStr}T${timeStr}:00`).toISOString()
      await updateNudge(nudge.id, {
        title: title.trim(),
        nudge_copy: copy.trim(),
        category,
        scheduled_for,
      })
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.backdrop}>
          {/* Dim tap-to-close area */}
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

          {/* Sheet */}
          <View style={s.sheet}>
            <View style={s.handle} />

            {/* Header */}
            <View style={s.header}>
              <Text style={s.headerTitle}>Edit nudge</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={17} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>

              {/* Title */}
              <Label>Title</Label>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Task title"
                placeholderTextColor={colors.muted}
                autoFocus
              />

              {/* Notification text */}
              <Label>Notification text</Label>
              <TextInput
                style={[s.input, s.textarea]}
                value={copy}
                onChangeText={setCopy}
                placeholder="What should the notification say?"
                placeholderTextColor={colors.muted}
                multiline
                textAlignVertical="top"
              />

              {/* Category */}
              <Label>Category</Label>
              <View style={s.catRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[s.catBtn, category === cat && { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}
                    onPress={() => setCategory(cat)}
                  >
                    <View style={[s.catDot, { backgroundColor: CAT_COLORS[cat] }]} />
                    <Text style={[s.catLabel, category === cat && { color: colors.primary }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date */}
              <Label>Date (YYYY-MM-DD)</Label>
              <TextInput
                style={s.input}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="2025-06-09"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />

              {/* Time */}
              <Label>Time (HH:MM)</Label>
              <TextInput
                style={s.input}
                value={timeStr}
                onChangeText={setTimeStr}
                placeholder="14:30"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[s.saveBtn, (!title.trim() || saving) && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={!title.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.saveBtnText}>Save changes</Text>
                }
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function Label({ children }) {
  return (
    <Text style={s.label}>{children}</Text>
  )
}

const s = StyleSheet.create({
  backdrop:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:      { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '90%' },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  headerTitle:{ fontSize: font.sm, fontWeight: '700', color: colors.foreground },
  body:       { paddingBottom: 12, gap: 4 },
  label:      { fontSize: 10, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 14, marginBottom: 6 },
  input:      { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: font.sm, color: colors.foreground },
  textarea:   { minHeight: 70, textAlignVertical: 'top' },
  catRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  catDot:     { width: 7, height: 7, borderRadius: 4 },
  catLabel:   { fontSize: font.xs, fontWeight: '600', color: colors.muted, textTransform: 'capitalize' },
  saveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, padding: 14, marginTop: 20 },
  saveBtnText:{ fontSize: font.sm, fontWeight: '700', color: '#fff' },
  errorText:  { fontSize: font.xs, color: colors.missed, textAlign: 'center', marginTop: 8 },
})

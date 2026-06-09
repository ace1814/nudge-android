import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { Microphone, Check, PencilSimple } from 'phosphor-react-native'
import dayjs from 'dayjs'
import { colors, font } from '../theme'
import { getUpcomingNudges, getActiveHabits, completeNudge, snoozeNudge, deleteNudge } from '../services/supabase'
import NudgeCard from '../components/NudgeCard'
import EditNudgeSheet from '../components/EditNudgeSheet'
import { useRecorder } from '../hooks/useRecorder'

const TIME_FILTERS = [
  { id: 'today',    label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week',     label: 'This week' },
]

export default function HomeScreen() {
  const { openVoice, openText } = useRecorder()
  const [nudges, setNudges]   = useState([])
  const [habits, setHabits]   = useState([])
  const [doneHabits, setDoneHabits] = useState(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [editingNudge, setEditingNudge] = useState(null)
  const [timeFilter, setTimeFilter] = useState('today')

  const load = useCallback(async () => {
    try {
      const [n, h] = await Promise.all([getUpcomingNudges(), getActiveHabits()])
      setNudges(n || []); setHabits(h || [])
    } catch (err) { console.warn(err.message) }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  // Client-side time filtering
  const todayStr    = dayjs().format('YYYY-MM-DD')
  const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD')
  const weekEndStr  = dayjs().add(7, 'day').format('YYYY-MM-DD')

  const isOverdue = n => n.scheduled_for < todayStr && ['pending', 'fired', 'snoozed'].includes(n.status)

  const visibleNudges = nudges.filter(n => {
    if (timeFilter === 'today')    return n.scheduled_for.startsWith(todayStr) || isOverdue(n)
    if (timeFilter === 'tomorrow') return n.scheduled_for.startsWith(tomorrowStr)
    if (timeFilter === 'week')     return n.scheduled_for >= todayStr && n.scheduled_for < weekEndStr
    return true
  })

  const upcoming = visibleNudges.filter(n => n.status === 'pending' || n.status === 'fired' || n.status === 'snoozed')
  const missed   = timeFilter === 'today' ? visibleNudges.filter(n => n.status === 'missed') : []
  const done     = visibleNudges.filter(n => n.status === 'done')

  const toggleHabit = (id) => setDoneHabits(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning.'
    if (h < 17) return 'Good afternoon.'
    return 'Good evening.'
  }

  const sectionTitle = timeFilter === 'today' ? 'Up next' : timeFilter === 'tomorrow' ? 'Tomorrow' : 'This week'

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.date}>{dayjs().format('dddd, D MMMM')}</Text>
        <Text style={s.greeting}>{greeting()}</Text>
        {nudges.length > 0 && (
          <View style={s.stats}>
            <Stat label="Due"    value={upcoming.length} color={colors.pending} />
            <Stat label="Done"   value={done.length}     color={colors.done} />
            <Stat label="Missed" value={missed.length}   color={colors.missed} />
          </View>
        )}
      </View>

      {/* Time filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsScroll} contentContainerStyle={s.pills}>
        {TIME_FILTERS.map(f => (
          <TouchableOpacity key={f.id} onPress={() => setTimeFilter(f.id)}
            style={[s.pill, timeFilter === f.id && s.pillActive]}>
            <Text style={[s.pillText, timeFilter === f.id && s.pillTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Quick entry row */}
      <View style={s.quickRow}>
        <TouchableOpacity style={[s.quickBtn, s.quickBtnPrimary]} onPress={openVoice}>
          <Microphone size={15} color="#fff" weight="fill" />
          <Text style={s.quickBtnTextPrimary}>Voice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.quickBtn, s.quickBtnSecondary]} onPress={openText}>
          <PencilSimple size={15} color={colors.foreground} />
          <Text style={s.quickBtnTextSecondary}>Type a task</Text>
        </TouchableOpacity>
      </View>

      {/* Habits (today only) */}
      {timeFilter === 'today' && habits.length > 0 && (
        <Section title="Habits">
          {habits.map(h => (
            <TouchableOpacity key={h.id} style={[s.habitRow, doneHabits.has(h.id) && s.habitDone]}
              onPress={() => toggleHabit(h.id)}>
              <View style={[s.habitCheck, doneHabits.has(h.id) && s.habitCheckDone]}>
                {doneHabits.has(h.id) && <Check size={11} color="#fff" weight="bold" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.habitName, doneHabits.has(h.id) && s.habitNameDone]}>{h.name}</Text>
                {h.frequency && <Text style={s.habitFreq}>{h.frequency}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </Section>
      )}

      {/* Upcoming nudges */}
      {upcoming.length > 0 && (
        <Section title={sectionTitle}>
          {upcoming.map(n => (
            <NudgeCard key={n.id} nudge={n}
              onComplete={async () => { await completeNudge(n.id); load() }}
              onSnooze={async () => { await snoozeNudge(n.id, 60); load() }}
              onDelete={async () => { await deleteNudge(n.id); load() }}
              onEdit={() => setEditingNudge(n)} />
          ))}
        </Section>
      )}

      {/* Missed (today only) */}
      {timeFilter === 'today' && missed.length > 0 && (
        <Section title="Missed today">
          {missed.map(n => (
            <NudgeCard key={n.id} nudge={n}
              onDelete={async () => { await deleteNudge(n.id); load() }} />
          ))}
        </Section>
      )}

      {upcoming.length === 0 && missed.length === 0 && habits.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyText}>
            Nothing for {TIME_FILTERS.find(f => f.id === timeFilter)?.label.toLowerCase()}.
            {'\n'}Tap Voice or Type to add tasks.
          </Text>
        </View>
      )}

      <EditNudgeSheet
        nudge={editingNudge}
        visible={!!editingNudge}
        onClose={() => setEditingNudge(null)}
        onSaved={load}
      />
    </ScrollView>
  )
}

function Section({ title, children }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={{ fontSize: font.xs, color: colors.muted, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  )
}

function Stat({ label, value, color }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 14 }}>
      <Text style={{ fontSize: font.sm, fontWeight: '700', color }}>{value}</Text>
      <Text style={{ fontSize: font.xs, color: colors.muted }}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: colors.bg },
  content:            { padding: 16, paddingBottom: 40 },
  header:             { marginBottom: 12 },
  date:               { fontSize: font.xs, color: colors.muted, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  greeting:           { fontSize: font.xl, fontWeight: '700', color: colors.foreground },
  stats:              { flexDirection: 'row', marginTop: 10 },
  pillsScroll:        { flexGrow: 0, marginBottom: 12, marginHorizontal: -16 },
  pills:              { paddingHorizontal: 16, gap: 6, flexDirection: 'row' },
  pill:               { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  pillActive:         { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText:           { fontSize: font.xs, color: colors.muted, fontWeight: '600' },
  pillTextActive:     { color: '#fff' },
  quickRow:           { flexDirection: 'row', gap: 8, marginBottom: 4 },
  quickBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 11 },
  quickBtnPrimary:    { backgroundColor: colors.primary },
  quickBtnSecondary:  { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  quickBtnTextPrimary:{ fontSize: font.sm, fontWeight: '600', color: '#fff' },
  quickBtnTextSecondary: { fontSize: font.sm, fontWeight: '600', color: colors.foreground },
  habitRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 6 },
  habitDone:          { opacity: 0.5 },
  habitCheck:         { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  habitCheckDone:     { borderColor: colors.done, backgroundColor: colors.done },
  habitName:          { fontSize: font.sm, fontWeight: '600', color: colors.foreground },
  habitNameDone:      { textDecorationLine: 'line-through', color: colors.muted },
  habitFreq:          { fontSize: font.xs, color: colors.muted, textTransform: 'capitalize', marginTop: 1 },
  empty:              { alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 8 },
  emptyText:          { fontSize: font.sm, color: colors.muted, textAlign: 'center' },
})

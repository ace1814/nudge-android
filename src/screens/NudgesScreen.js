import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { colors, font } from '../theme'
import { getTodayNudges, completeNudge, snoozeNudge, updateNudgeStatus, deleteNudge } from '../services/supabase'
import NudgeCard from '../components/NudgeCard'

const FILTERS = ['all', 'pending', 'done', 'missed', 'snoozed']

export default function NudgesScreen() {
  const [nudges, setNudges]     = useState([])
  const [filter, setFilter]     = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try { setNudges(await getTodayNudges() || []) } catch (e) { console.warn(e.message) }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const filtered = filter === 'all' ? nudges : nudges.filter(n => n.status === filter)

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Nudges</Text>
        <Text style={s.sub}>Today · {nudges.length} total</Text>
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pills} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[s.pill, filter === f && s.pillActive]}>
            <Text style={[s.pillText, filter === f && s.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.list} contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {filtered.length === 0 && (
          <Text style={s.empty}>Nothing here.</Text>
        )}
        {filtered.map(n => (
          <NudgeCard key={n.id} nudge={n}
            onComplete={n.status === 'pending' || n.status === 'fired' ? async () => { await completeNudge(n.id); load() } : null}
            onSnooze={n.status === 'pending' || n.status === 'fired' ? async () => { await snoozeNudge(n.id, 60); load() } : null}
            onDismiss={n.status === 'pending' || n.status === 'fired' ? async () => { await updateNudgeStatus(n.id, 'missed'); load() } : null}
            onDelete={async () => { await deleteNudge(n.id); load() }} />
        ))}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.bg },
  header:        { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:         { fontSize: font.lg, fontWeight: '700', color: colors.foreground },
  sub:           { fontSize: font.xs, color: colors.muted, marginTop: 2 },
  pills:         { flexGrow: 0, paddingVertical: 10 },
  pill:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  pillActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText:      { fontSize: font.xs, color: colors.muted, textTransform: 'capitalize', fontWeight: '600' },
  pillTextActive:{ color: '#fff' },
  list:          { flex: 1 },
  empty:         { fontSize: font.sm, color: colors.muted, textAlign: 'center', marginTop: 60 },
})

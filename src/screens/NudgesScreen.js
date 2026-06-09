import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { FunnelSimple, X } from 'phosphor-react-native'
import { colors, font } from '../theme'
import { getTodayNudges, completeNudge, snoozeNudge, updateNudgeStatus, deleteNudge, getNudgesByCreatedDate, getNudgesByCompletedDate } from '../services/supabase'
import NudgeCard from '../components/NudgeCard'
import EditNudgeSheet from '../components/EditNudgeSheet'

const STATUS_FILTERS = ['all', 'pending', 'done', 'missed', 'snoozed']

export default function NudgesScreen() {
  const [nudges, setNudges]       = useState([])
  const [filter, setFilter]       = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [editingNudge, setEditingNudge] = useState(null)

  // Date filters
  const [dateFilterType, setDateFilterType] = useState(null)  // null | 'created' | 'completed'
  const [dateFilterValue, setDateFilterValue] = useState('')
  const [dateFiltered, setDateFiltered] = useState(null)      // null = inactive

  const load = useCallback(async () => {
    try { setNudges(await getTodayNudges() || []) } catch (e) { console.warn(e.message) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!dateFilterType || !dateFilterValue) { setDateFiltered(null); return }
    const fetch = async () => {
      try {
        const results = dateFilterType === 'created'
          ? await getNudgesByCreatedDate(dateFilterValue)
          : await getNudgesByCompletedDate(dateFilterValue)
        setDateFiltered(results || [])
      } catch (e) { setDateFiltered([]) }
    }
    fetch()
  }, [dateFilterType, dateFilterValue])

  const clearDateFilter = () => {
    setDateFilterType(null); setDateFilterValue(''); setDateFiltered(null)
  }

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const sourceList = dateFiltered !== null ? dateFiltered : nudges
  const filtered   = filter === 'all' ? sourceList : sourceList.filter(n => n.status === filter)

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Nudges</Text>
        <Text style={s.sub}>
          {dateFiltered !== null
            ? `${dateFilterType === 'created' ? 'Created' : 'Completed'} on ${dateFilterValue} · ${filtered.length} found`
            : `Today · ${nudges.length} total`}
        </Text>
      </View>

      {/* Date filters */}
      <View style={s.dateFilterBar}>
        <FunnelSimple size={11} color={colors.muted} />
        <TouchableOpacity
          style={[s.dateChip, dateFilterType === 'created' && s.dateChipActive]}
          onPress={() => setDateFilterType(t => t === 'created' ? null : 'created')}
        >
          <Text style={[s.dateChipText, dateFilterType === 'created' && { color: colors.primary }]}>Created on</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.dateChip, dateFilterType === 'completed' && s.dateChipActive]}
          onPress={() => setDateFilterType(t => t === 'completed' ? null : 'completed')}
        >
          <Text style={[s.dateChipText, dateFilterType === 'completed' && { color: colors.primary }]}>Completed on</Text>
        </TouchableOpacity>
        {dateFilterType && (
          <View style={s.dateInputRow}>
            <TextInput
              style={s.dateInput}
              value={dateFilterValue}
              onChangeText={setDateFilterValue}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
            {dateFilterValue ? (
              <TouchableOpacity onPress={clearDateFilter} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={11} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {/* Status filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pills} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        {STATUS_FILTERS.map(f => (
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
            onDelete={async () => { await deleteNudge(n.id); load() }}
            onEdit={() => setEditingNudge(n)} />
        ))}
      </ScrollView>

      <EditNudgeSheet
        nudge={editingNudge}
        visible={!!editingNudge}
        onClose={() => setEditingNudge(null)}
        onSaved={load}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.bg },
  header:        { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:         { fontSize: font.lg, fontWeight: '700', color: colors.foreground },
  sub:           { fontSize: font.xs, color: colors.muted, marginTop: 2 },
  dateFilterBar: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8 },
  dateChip:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  dateChipActive:{ borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  dateChipText:  { fontSize: 10, fontWeight: '600', color: colors.muted },
  dateInputRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dateInput:     { flex: 1, fontSize: 10, color: colors.foreground, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  pills:         { flexGrow: 0, paddingVertical: 6 },
  pill:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  pillActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText:      { fontSize: font.xs, color: colors.muted, textTransform: 'capitalize', fontWeight: '600' },
  pillTextActive:{ color: '#fff' },
  list:          { flex: 1 },
  empty:         { fontSize: font.sm, color: colors.muted, textAlign: 'center', marginTop: 60 },
})

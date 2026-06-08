import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { Feather } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { colors, font } from '../theme'

const CAT_COLORS = { health: colors.health, work: colors.work, content: colors.content, personal: colors.personal, finance: colors.finance, other: colors.other }
const STATUS_COLORS = { pending: colors.pending, fired: colors.pending, done: colors.done, missed: colors.missed, snoozed: colors.snoozed }

export default function NudgeCard({ nudge, onComplete, onSnooze, onDismiss, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const isDone   = nudge.status === 'done'
  const isMissed = nudge.status === 'missed'
  const isOver   = isDone || isMissed

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(e => !e)}
      style={[s.card, isOver && { opacity: 0.55 }]}>

      <View style={s.top}>
        <View style={[s.dot, { backgroundColor: CAT_COLORS[nudge.category] ?? colors.other }]} />
        <View style={{ flex: 1 }}>
          <Text style={[s.title, isDone && s.titleDone]}>{nudge.title}</Text>
          <View style={s.meta}>
            <Text style={s.time}>{dayjs(nudge.scheduled_for).format('h:mm A')}</Text>
            {nudge.recurrence && <Text style={s.badge}>{nudge.recurrence.replace(/_/g, ' ')}</Text>}
            <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[nudge.status] ?? colors.muted) + '22' }]}>
              <Text style={[s.statusText, { color: STATUS_COLORS[nudge.status] ?? colors.muted }]}>{nudge.status}</Text>
            </View>
          </View>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
      </View>

      {expanded && (
        <View style={s.expanded}>
          {nudge.nudge_copy && !isDone && (
            <Text style={s.copy}>{nudge.nudge_copy}</Text>
          )}
          <View style={s.actions}>
            {onComplete && (
              <TouchableOpacity style={[s.actionBtn, s.doneBtn]} onPress={onComplete}>
                <Feather name="check" size={13} color="#fff" />
                <Text style={s.actionBtnText}>Done</Text>
              </TouchableOpacity>
            )}
            {onSnooze && (
              <TouchableOpacity style={s.actionBtn} onPress={onSnooze}>
                <Feather name="clock" size={13} color={colors.foreground} />
                <Text style={[s.actionBtnText, { color: colors.foreground }]}>Snooze 1h</Text>
              </TouchableOpacity>
            )}
            {onDismiss && (
              <TouchableOpacity style={s.actionBtn} onPress={onDismiss}>
                <Feather name="x" size={13} color={colors.muted} />
                <Text style={[s.actionBtnText, { color: colors.muted }]}>Dismiss</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={[s.actionBtn, { marginLeft: 'auto' }]} onPress={onDelete}>
                <Feather name="trash-2" size={13} color={colors.missed} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card:       { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, marginBottom: 2 },
  top:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot:        { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  title:      { fontSize: font.sm, fontWeight: '600', color: colors.foreground, lineHeight: 20 },
  titleDone:  { textDecorationLine: 'line-through', color: colors.muted },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  time:       { fontSize: font.xs, color: colors.muted },
  badge:      { fontSize: 10, color: colors.muted, backgroundColor: colors.border, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  statusBadge:{ borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  expanded:   { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 8 },
  copy:       { fontSize: font.xs, color: colors.muted, lineHeight: 18 },
  actions:    { flexDirection: 'row', gap: 6 },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  doneBtn:    { backgroundColor: colors.done },
  actionBtnText: { fontSize: font.xs, fontWeight: '600', color: '#fff' },
})

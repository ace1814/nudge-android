import { createClient } from '@supabase/supabase-js'
import { storage } from './storage'

let client = null

export async function getSupabase() {
  if (client) return client
  const url = (await storage.get('supabase_url') || '').trim().replace(/\/+$/, '').replace(/\/(rest|auth|storage|realtime)(\/.*)?$/, '')
  const key = (await storage.get('supabase_key') || '').trim()
  if (!url || !key) return null
  client = createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  })
  return client
}

export function resetSupabase() { client = null }

// ── Days ─────────────────────────────────────────────────────────────────────

export async function getTodayEntry() {
  const db = await getSupabase()
  if (!db) return null
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await db.from('days').select('*').eq('date', today).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertDay(rawTranscript, parsedSummary) {
  const db = await getSupabase()
  if (!db) throw new Error('Supabase not configured')
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await db
    .from('days')
    .upsert({ date: today, raw_transcript: rawTranscript, parsed_summary: parsedSummary }, { onConflict: 'date' })
    .select().single()
  if (error) throw error
  return data
}

// ── Nudges ───────────────────────────────────────────────────────────────────

export async function getTodayNudges() {
  const db = await getSupabase()
  if (!db) return []
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const { data: todayData, error: e1 } = await db.from('nudges').select('*')
    .gte('scheduled_for', today).lt('scheduled_for', tomorrow).order('scheduled_for')
  if (e1) throw e1

  const { data: overdueData, error: e2 } = await db.from('nudges').select('*')
    .lt('scheduled_for', today).in('status', ['pending', 'fired', 'snoozed']).order('scheduled_for')
  if (e2) throw e2

  const seen = new Set()
  return [...(overdueData || []), ...(todayData || [])].filter(n => {
    if (seen.has(n.id)) return false
    seen.add(n.id)
    return true
  })
}

export async function insertNudges(nudges) {
  const db = await getSupabase()
  if (!db) throw new Error('Supabase not configured')
  const { data, error } = await db.from('nudges').insert(nudges).select()
  if (error) throw error
  return data
}

export async function updateNudgeStatus(id, status, extra = {}) {
  const db = await getSupabase()
  if (!db) throw new Error('Supabase not configured')
  const { error } = await db.from('nudges').update({ status, ...extra }).eq('id', id)
  if (error) throw error
}

export async function updateNudge(id, fields) {
  const db = await getSupabase()
  if (!db) throw new Error('Supabase not configured')
  const allowed = ['title', 'nudge_copy', 'category', 'scheduled_for', 'recurrence',
                   'recurrence_window_start', 'recurrence_window_end']
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))
  const { error } = await db.from('nudges').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteNudge(id) {
  const db = await getSupabase()
  if (!db) throw new Error('Supabase not configured')
  const { error } = await db.from('nudges').delete().eq('id', id)
  if (error) throw error
}

export async function completeNudge(id) {
  const db = await getSupabase()
  if (!db) throw new Error('Supabase not configured')
  await db.from('completions').insert({ nudge_id: id, completed_at: new Date().toISOString() })
  await updateNudgeStatus(id, 'done', { completed_at: new Date().toISOString() })
}

export async function snoozeNudge(id, minutes = 60) {
  const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString()
  await updateNudgeStatus(id, 'snoozed', { snoozed_until: snoozedUntil })
}

// ── Habits ───────────────────────────────────────────────────────────────────

export async function getActiveHabits() {
  const db = await getSupabase()
  if (!db) return []
  const { data, error } = await db.from('habits').select('*').eq('active', true).order('created_at')
  if (error) throw error
  return data || []
}

export async function upsertHabit(habit) {
  const db = await getSupabase()
  if (!db) throw new Error('Supabase not configured')
  const { data, error } = await db.from('habits').upsert(habit).select().single()
  if (error) throw error
  return data
}

export async function deleteHabit(id) {
  const db = await getSupabase()
  if (!db) throw new Error('Supabase not configured')
  const { error } = await db.from('habits').delete().eq('id', id)
  if (error) throw error
}

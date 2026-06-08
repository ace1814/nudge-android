import * as FileSystem from 'expo-file-system'
import { storage } from './storage'

async function getOpenAIKey() {
  const key = await storage.get('openai_key')
  if (!key) throw new Error('OpenAI API key not set. Go to Settings.')
  return key
}

export async function transcribeAudio(fileUri) {
  const key = await getOpenAIKey()

  // Use FileSystem.uploadAsync — React Native's fetch/FormData has a known bug
  // with file URIs on Android (RN 0.73+): "unsupported format data part implementation"
  const res = await FileSystem.uploadAsync(
    'https://api.openai.com/v1/audio/transcriptions',
    fileUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'audio/m4a',
      parameters: {
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
      },
      headers: {
        Authorization: `Bearer ${key}`,
      },
    }
  )
  if (res.status !== 200) throw new Error(`Whisper error: ${res.body}`)
  return res.body
}

const SYSTEM_PROMPT = `You are Nudge's intent parser. Extract actionable items from a casual voice dump.

Return ONLY valid JSON:
{
  "summary": "2-3 sentence summary",
  "items": [
    {
      "type": "nudge" | "task" | "habit" | "context",
      "title": "short action title",
      "category": "health" | "work" | "content" | "personal" | "finance" | "other",
      "scheduled_for": "ISO 8601 datetime",
      "recurrence": null | "daily" | "weekdays" | "weekends" | "every_2h" | "every_90m",
      "recurrence_window_start": "HH:MM" | null,
      "recurrence_window_end": "HH:MM" | null,
      "nudge_copy": "exact notification text — personal and contextual",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Rules:
- "context" = informational only (e.g. "going to the gym")
- "task" = one-time thing
- "nudge" = time-sensitive reminder, fires once
- "habit" = anything recurring daily/weekly — ALWAYS use "habit" not "nudge" for recurring things
- Water/hydration: recurrence "every_2h", window 09:00-21:00
- Work tasks with no time: schedule 10:00-12:00
- nudge_copy must be personal and reference what the user said
- Today's date: ${new Date().toISOString()}`

export async function parseTranscript(transcript) {
  const key = await getOpenAIKey()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Voice dump:\n\n"${transcript}"` }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })
  })
  if (!res.ok) throw new Error(`GPT error: ${await res.text()}`)
  const json = await res.json()
  return JSON.parse(json.choices[0].message.content)
}

export async function processVoiceDump(fileUri, textFallback = null) {
  const { upsertDay, insertNudges, upsertHabit } = await import('./supabase')

  const transcript = textFallback || await transcribeAudio(fileUri)
  const parsed = await parseTranscript(transcript)

  let day = null
  try { day = await upsertDay(transcript, parsed.summary) } catch (e) {
    throw new Error(`Supabase error: ${e.message}`)
  }

  const habitItems = parsed.items.filter(i => i.type === 'habit')
  const nudgeItems = parsed.items.filter(i => i.type !== 'context' && i.type !== 'habit')

  let stored = []
  if (day && nudgeItems.length > 0) {
    try {
      stored = await insertNudges(nudgeItems.map(item => ({
        day_id: day.id,
        title: item.title,
        type: item.type,
        category: item.category,
        scheduled_for: item.scheduled_for,
        recurrence: item.recurrence || null,
        recurrence_window_start: item.recurrence_window_start || null,
        recurrence_window_end: item.recurrence_window_end || null,
        nudge_copy: item.nudge_copy,
        status: 'pending'
      })))
    } catch (e) { console.warn('nudge insert failed:', e.message) }
  }

  const storedHabits = []
  for (const h of habitItems) {
    try {
      const freq = ['daily', 'weekdays', 'weekends'].includes(h.recurrence) ? h.recurrence : 'daily'
      storedHabits.push(await upsertHabit({ name: h.title, frequency: freq, active: true }))
    } catch (e) { console.warn('habit insert failed:', e.message) }
  }

  return { transcript, summary: parsed.summary, items: parsed.items, stored, storedHabits }
}

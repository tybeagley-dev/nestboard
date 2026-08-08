import { db } from '../db/client.js'

// Per-family screen-time tuning lives in families.settings.screenTime. Defaults
// mirror the generic core (FamilyContext.useSettings): 0 free daily minutes
// (opt-in), 5 tokens / 10 min. Beagley is backfilled to 30 via migration 022.
export async function getScreenTimeConfig(familyId) {
  const { rows } = await db.query('SELECT settings FROM families WHERE id = $1', [familyId])
  const st = rows[0]?.settings?.screenTime ?? {}
  return {
    dailyAllotmentMinutes: Number.isFinite(st.dailyAllotmentMinutes) ? st.dailyAllotmentMinutes : 0,
    tokensPerBlock: Number.isFinite(st.tokensPerBlock) ? st.tokensPerBlock : 5,
    blockMinutes:   Number.isFinite(st.blockMinutes) && st.blockMinutes > 0 ? st.blockMinutes : 10,
    ...abstinenceConfig(st),
  }
}

// Split out so the abstinence job can read it straight off a families row it
// already has, without a second query per family.
export function abstinenceConfig(st = {}) {
  return {
    abstinenceEnabled: st.abstinenceEnabled !== false,
    abstinenceTokens:  Number.isFinite(st.abstinenceTokens) && st.abstinenceTokens > 0 ? st.abstinenceTokens : 15,
  }
}

// `today` is the family-local date (utils/familyTime), not the server's.
export function calcFreeAvailable(row, allotment, today) {
  if (!row) return allotment
  return dateStr(row.daily_free_date) === today
    ? Math.max(0, allotment - Number(row.daily_free_used))
    : allotment
}

// pg returns DATE as a Date pinned to local midnight — formatting it back through
// toISOString() would shift the day west of UTC, so read the parts directly.
export function dateStr(value) {
  if (!(value instanceof Date)) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

// One row per timer that actually consumed minutes. Parent adjustments never
// land here, which is what keeps "watched TV" distinct from "lost time".
export async function recordSession(client, { familyId, childId, date, freeMinutes, bonusMinutes = 0, purchasedMinutes, startedAt }) {
  if (freeMinutes + bonusMinutes + purchasedMinutes <= 0) return
  await client.query(
    `INSERT INTO screen_time_sessions
       (family_id, child_id, date, free_minutes, bonus_minutes, purchased_minutes, started_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [familyId, childId, date, freeMinutes, bonusMinutes, purchasedMinutes, startedAt ?? null]
  )
}

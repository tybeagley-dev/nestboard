import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { broadcast } from './events.js'
import { resolveChildId } from '../db/resolveChild.js'
import { getScreenTimeConfig, recordSession } from '../utils/screenTime.js'
import { familyToday, getFamilyTimezone, localDate } from '../utils/familyTime.js'

const router = Router()

router.use(requireFamily)

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT t.family_id, t.end_time, t.duration_minutes, t.buffer_minutes,
            t.free_minutes, t.purchased_minutes, t.started_at, ch.name AS child
     FROM timers t
     JOIN children ch ON ch.id = t.child_id
     WHERE t.family_id = $1`,
    [req.familyId]
  )
  res.json(rows)
})

// POST /timers/:child/start  { durationMinutes, bufferMinutes }
router.post('/:child/start', async (req, res) => {
  const childName = req.params.child
  const { durationMinutes, bufferMinutes } = req.body
  if (!durationMinutes || isNaN(durationMinutes) || durationMinutes <= 0) {
    return res.status(400).json({ error: 'Invalid durationMinutes' })
  }

  const childId = await resolveChildId(req.familyId, childName)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { dailyAllotmentMinutes } = await getScreenTimeConfig(req.familyId)
  const today = await familyToday(req.familyId)

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows: balRows } = await client.query(
      `SELECT purchased_balance, bonus_balance, daily_free_used, daily_free_date,
              CASE WHEN daily_free_date = $4::date
                   THEN GREATEST(0, $3 - daily_free_used)
                   ELSE $3
              END AS free_available
       FROM screen_time_balance WHERE family_id = $1 AND child_id = $2 FOR UPDATE`,
      [req.familyId, childId, dailyAllotmentMinutes, today]
    )

    const purchased  = balRows.length ? Number(balRows[0].purchased_balance) : 0
    const bonus      = balRows.length ? Number(balRows[0].bonus_balance)     : 0
    const freeAvail  = balRows.length ? Number(balRows[0].free_available)    : dailyAllotmentMinutes
    const totalAvail = purchased + bonus + freeAvail

    // Spend the perishable and the parent's own first; the kid's token-bought
    // minutes are the last to go.
    const totalToDeduct = Math.min(totalAvail, durationMinutes)
    const freeToDeduct  = Math.min(freeAvail, totalToDeduct)
    const bonusToDeduct = Math.min(bonus, totalToDeduct - freeToDeduct)
    const purchToDeduct = totalToDeduct - freeToDeduct - bonusToDeduct

    if (balRows.length) {
      await client.query(
        `UPDATE screen_time_balance SET
           purchased_balance = GREATEST(0, purchased_balance - $1),
           bonus_balance     = GREATEST(0, bonus_balance - $6),
           daily_free_used   = CASE WHEN daily_free_date = $5::date
                                    THEN daily_free_used + $2
                                    ELSE $2
                               END,
           daily_free_date   = $5::date,
           updated_at        = NOW()
         WHERE family_id = $3 AND child_id = $4`,
        [purchToDeduct, freeToDeduct, req.familyId, childId, today, bonusToDeduct]
      )
    } else {
      await client.query(
        `INSERT INTO screen_time_balance (family_id, child_id, purchased_balance, daily_free_used, daily_free_date)
         VALUES ($1, $2, 0, $3, $4::date)`,
        [req.familyId, childId, freeToDeduct, today]
      )
    }

    const storedBuffer = (durationMinutes + (bufferMinutes ?? 5)) - totalToDeduct
    const endTime      = Date.now() + (totalToDeduct + storedBuffer) * 60 * 1000

    await client.query(
      `INSERT INTO timers (family_id, child_id, end_time, duration_minutes, buffer_minutes, free_minutes, bonus_minutes, purchased_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $8, $7)
       ON CONFLICT (family_id, child_id) DO UPDATE
         SET end_time = $3, duration_minutes = $4, buffer_minutes = $5,
             free_minutes = $6, bonus_minutes = $8, purchased_minutes = $7, started_at = NOW()`,
      [req.familyId, childId, endTime, totalToDeduct, storedBuffer, freeToDeduct, purchToDeduct, bonusToDeduct]
    )

    await client.query('COMMIT')

    const newBalance = (purchased - purchToDeduct) + (bonus - bonusToDeduct) + (freeAvail - freeToDeduct)
    broadcast('screen_time', { child: childName, balance: newBalance }, req.familyId)
    broadcast('timers', { child: childName }, req.familyId)
    res.json({ success: true, deducted: totalToDeduct, newBalance, endTime })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// POST /timers/:child/stop  { expired }
router.post('/:child/stop', async (req, res) => {
  const childName = req.params.child
  const { expired = false } = req.body

  const childId = await resolveChildId(req.familyId, childName)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rows } = await db.query(
    `SELECT * FROM timers WHERE family_id = $1 AND child_id = $2`,
    [req.familyId, childId]
  )
  if (!rows.length) return res.json({ success: true })

  const timer = rows[0]

  const freeMin  = Number(timer.free_minutes  ?? 0)
  const bonusMin = Number(timer.bonus_minutes ?? 0)
  const purchMin = Number(timer.purchased_minutes ?? timer.duration_minutes ?? 0)
  const totalMin = freeMin + bonusMin + purchMin

  // An expired timer ran its full length; a manual stop refunds the unused tail.
  let freeConsumed  = freeMin
  let bonusConsumed = bonusMin
  let purchConsumed = purchMin

  if (!expired && totalMin > 0) {
    const msLeft = Math.max(0, Number(timer.end_time) - Date.now())
    const paidMs = totalMin * 60 * 1000

    let refundTotal = 0
    if (msLeft >= paidMs) {
      refundTotal = totalMin
    } else if (msLeft > 0) {
      refundTotal = Math.round((msLeft / paidMs) * totalMin)
    }

    if (refundTotal > 0) {
      // Consumption ran free → bonus → purchased, so the unused tail refunds in
      // reverse: purchased comes back first, free last.
      const minutesConsumed = totalMin - refundTotal
      freeConsumed  = Math.min(minutesConsumed, freeMin)
      bonusConsumed = Math.min(minutesConsumed - freeConsumed, bonusMin)
      purchConsumed = minutesConsumed - freeConsumed - bonusConsumed

      await db.query(
        `UPDATE screen_time_balance SET
           daily_free_used   = GREATEST(0, daily_free_used - $1),
           bonus_balance     = bonus_balance + $5,
           purchased_balance = purchased_balance + $2,
           updated_at        = NOW()
         WHERE family_id = $3 AND child_id = $4`,
        [freeMin - freeConsumed, purchMin - purchConsumed, req.familyId, childId, bonusMin - bonusConsumed]
      )
      broadcast('screen_time', { child: childName }, req.familyId)
    }
  }

  // Dated to when the session started, so an evening run that crosses midnight
  // stays on the day the kid actually sat down.
  await recordSession(db, {
    familyId: req.familyId,
    childId,
    date: localDate(await getFamilyTimezone(req.familyId), timer.started_at ?? undefined),
    freeMinutes: freeConsumed,
    bonusMinutes: bonusConsumed,
    purchasedMinutes: purchConsumed,
    startedAt: timer.started_at,
  })

  await db.query(
    `DELETE FROM timers WHERE family_id = $1 AND child_id = $2`,
    [req.familyId, childId]
  )
  broadcast('timers', { child: childName }, req.familyId)
  res.json({ success: true })
})

// Called from index.js on startup — expires timers server-side every 30s
// Operates across all families intentionally (background job)
export function startExpiryJob() {
  setInterval(async () => {
    try {
      const { rows } = await db.query(
        `SELECT t.family_id, t.child_id, t.free_minutes, t.bonus_minutes, t.purchased_minutes,
                t.duration_minutes, t.started_at, ch.name AS child
         FROM timers t
         JOIN children ch ON ch.id = t.child_id
         WHERE t.end_time < $1`,
        [Date.now()]
      )
      for (const t of rows) {
        // These ran to completion, so the whole session counts as consumed.
        await recordSession(db, {
          familyId: t.family_id,
          childId:  t.child_id,
          date: localDate(await getFamilyTimezone(t.family_id), t.started_at ?? undefined),
          freeMinutes:      Number(t.free_minutes ?? 0),
          bonusMinutes:     Number(t.bonus_minutes ?? 0),
          purchasedMinutes: Number(t.purchased_minutes ?? t.duration_minutes ?? 0),
          startedAt: t.started_at,
        })
        await db.query(
          `DELETE FROM timers WHERE family_id = $1 AND child_id = $2`,
          [t.family_id, t.child_id]
        )
        broadcast('timers', { child: t.child }, t.family_id)
        broadcast('screen_time', { child: t.child }, t.family_id)
      }
    } catch (err) {
      console.error('Timer expiry job error:', err.message)
    }
  }, 30_000)
}

export default router

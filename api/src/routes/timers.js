import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { broadcast } from './events.js'
import { resolveChildId } from '../db/resolveChild.js'

const router = Router()

const DAILY_FREE_MINS = 30

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

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows: balRows } = await client.query(
      `SELECT purchased_balance, daily_free_used, daily_free_date,
              CASE WHEN daily_free_date = CURRENT_DATE
                   THEN GREATEST(0, $3 - daily_free_used)
                   ELSE $3
              END AS free_available
       FROM screen_time_balance WHERE family_id = $1 AND child_id = $2 FOR UPDATE`,
      [req.familyId, childId, DAILY_FREE_MINS]
    )

    const purchased  = balRows.length ? Number(balRows[0].purchased_balance) : 0
    const freeAvail  = balRows.length ? Number(balRows[0].free_available)    : DAILY_FREE_MINS
    const totalAvail = purchased + freeAvail

    const totalToDeduct = Math.min(totalAvail, durationMinutes)
    const freeToDeduct  = Math.min(freeAvail, totalToDeduct)
    const purchToDeduct = totalToDeduct - freeToDeduct

    if (balRows.length) {
      await client.query(
        `UPDATE screen_time_balance SET
           purchased_balance = GREATEST(0, purchased_balance - $1),
           daily_free_used   = CASE WHEN daily_free_date = CURRENT_DATE
                                    THEN daily_free_used + $2
                                    ELSE $2
                               END,
           daily_free_date   = CURRENT_DATE,
           updated_at        = NOW()
         WHERE family_id = $3 AND child_id = $4`,
        [purchToDeduct, freeToDeduct, req.familyId, childId]
      )
    } else {
      await client.query(
        `INSERT INTO screen_time_balance (family_id, child_id, purchased_balance, daily_free_used, daily_free_date)
         VALUES ($1, $2, 0, $3, CURRENT_DATE)`,
        [req.familyId, childId, freeToDeduct]
      )
    }

    const storedBuffer = (durationMinutes + (bufferMinutes ?? 5)) - totalToDeduct
    const endTime      = Date.now() + (totalToDeduct + storedBuffer) * 60 * 1000

    await client.query(
      `INSERT INTO timers (family_id, child_id, end_time, duration_minutes, buffer_minutes, free_minutes, purchased_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (family_id, child_id) DO UPDATE
         SET end_time = $3, duration_minutes = $4, buffer_minutes = $5,
             free_minutes = $6, purchased_minutes = $7, started_at = NOW()`,
      [req.familyId, childId, endTime, totalToDeduct, storedBuffer, freeToDeduct, purchToDeduct]
    )

    await client.query('COMMIT')

    const newPurchased = purchased - purchToDeduct
    const newFreeAvail = freeAvail - freeToDeduct
    const newBalance   = newPurchased + newFreeAvail
    broadcast('screen_time', { child: childName, balance: newBalance })
    broadcast('timers', { child: childName })
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

  if (!expired) {
    const freeMin  = Number(timer.free_minutes  ?? 0)
    const purchMin = Number(timer.purchased_minutes ?? timer.duration_minutes ?? 0)
    const totalMin = freeMin + purchMin

    if (totalMin > 0) {
      const msLeft = Math.max(0, Number(timer.end_time) - Date.now())
      const paidMs = totalMin * 60 * 1000

      let refundTotal = 0
      if (msLeft >= paidMs) {
        refundTotal = totalMin
      } else if (msLeft > 0) {
        refundTotal = Math.round((msLeft / paidMs) * totalMin)
      }

      if (refundTotal > 0) {
        // Free was consumed first, so refund in reverse: free refunded last consumed first
        const minutesConsumed = totalMin - refundTotal
        const freeConsumed    = Math.min(minutesConsumed, freeMin)
        const purchConsumed   = minutesConsumed - freeConsumed
        const freeRefund      = freeMin - freeConsumed
        const purchRefund     = purchMin - purchConsumed

        await db.query(
          `UPDATE screen_time_balance SET
             daily_free_used   = GREATEST(0, daily_free_used - $1),
             purchased_balance = purchased_balance + $2,
             updated_at        = NOW()
           WHERE family_id = $3 AND child_id = $4`,
          [freeRefund, purchRefund, req.familyId, childId]
        )
        broadcast('screen_time', { child: childName })
      }
    }
  }

  await db.query(
    `DELETE FROM timers WHERE family_id = $1 AND child_id = $2`,
    [req.familyId, childId]
  )
  broadcast('timers', { child: childName })
  res.json({ success: true })
})

// Called from index.js on startup — expires timers server-side every 30s
// Operates across all families intentionally (background job)
export function startExpiryJob() {
  setInterval(async () => {
    try {
      const { rows } = await db.query(
        `SELECT t.family_id, t.child_id, ch.name AS child
         FROM timers t
         JOIN children ch ON ch.id = t.child_id
         WHERE t.end_time < $1`,
        [Date.now()]
      )
      for (const { family_id, child_id, child } of rows) {
        await db.query(
          `DELETE FROM timers WHERE family_id = $1 AND child_id = $2`,
          [family_id, child_id]
        )
        broadcast('timers', { child })
        broadcast('screen_time', { child })
      }
    } catch (err) {
      console.error('Timer expiry job error:', err.message)
    }
  }, 30_000)
}

export default router

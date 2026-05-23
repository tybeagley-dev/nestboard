import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { broadcast } from './events.js'
import { resolveChildId } from '../db/resolveChild.js'

const router = Router()

router.use(requireFamily)

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT t.family_id, t.end_time, t.duration_minutes, t.buffer_minutes, t.started_at,
            ch.name AS child
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
      `SELECT balance FROM screen_time_balance WHERE family_id = $1 AND child_id = $2 FOR UPDATE`,
      [req.familyId, childId]
    )
    const currentBalance = balRows.length ? Number(balRows[0].balance) : 0
    const actualDeducted = Math.min(currentBalance, durationMinutes)

    const { rows: stRows } = await client.query(
      `INSERT INTO screen_time_balance (family_id, child_id, balance) VALUES ($1, $2, 0)
       ON CONFLICT (family_id, child_id) DO UPDATE
         SET balance = GREATEST(0, screen_time_balance.balance - $3), updated_at = NOW()
       RETURNING balance`,
      [req.familyId, childId, actualDeducted]
    )

    const storedBuffer = (durationMinutes + (bufferMinutes ?? 5)) - actualDeducted
    const endTime = Date.now() + (actualDeducted + storedBuffer) * 60 * 1000

    await client.query(
      `INSERT INTO timers (family_id, child_id, end_time, duration_minutes, buffer_minutes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (family_id, child_id) DO UPDATE
         SET end_time = $3, duration_minutes = $4, buffer_minutes = $5, started_at = NOW()`,
      [req.familyId, childId, endTime, actualDeducted, storedBuffer]
    )

    await client.query('COMMIT')

    broadcast('screen_time', { child: childName, balance: stRows[0].balance })
    broadcast('timers', { child: childName })
    res.json({ success: true, deducted: actualDeducted, newBalance: stRows[0].balance, endTime })
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
    const msLeft = Math.max(0, Number(timer.end_time) - Date.now())
    const paidMs = Number(timer.duration_minutes) * 60 * 1000

    let refund = 0
    if (msLeft >= paidMs) {
      refund = Number(timer.duration_minutes)
    } else if (msLeft > 0) {
      refund = Math.round((msLeft / paidMs) * Number(timer.duration_minutes))
    }

    if (refund > 0) {
      await db.query(
        `UPDATE screen_time_balance SET balance = balance + $1, updated_at = NOW()
         WHERE family_id = $2 AND child_id = $3`,
        [refund, req.familyId, childId]
      )
      broadcast('screen_time', { child: childName })
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

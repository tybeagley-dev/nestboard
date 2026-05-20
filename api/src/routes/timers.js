import { Router } from 'express'
import { db } from '../db/client.js'
import { broadcast } from './events.js'

const router = Router()

// GET /timers
router.get('/', async (_req, res) => {
  const { rows } = await db.query(`SELECT * FROM timers`)
  res.json(rows)
})

// POST /timers/:child/start  { durationMinutes, bufferMinutes }
// Atomically deducts balance and starts the timer in one transaction.
router.post('/:child/start', async (req, res) => {
  const { child } = req.params
  const { durationMinutes, bufferMinutes } = req.body
  if (!durationMinutes || isNaN(durationMinutes) || durationMinutes <= 0) {
    return res.status(400).json({ error: 'Invalid durationMinutes' })
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Lock the row so concurrent starts read a consistent balance
    const { rows: balRows } = await client.query(
      `SELECT balance FROM screen_time_balance WHERE child = $1 FOR UPDATE`,
      [child]
    )
    const currentBalance = balRows.length ? Number(balRows[0].balance) : 0
    const actualDeducted = Math.min(currentBalance, durationMinutes)

    const { rows: stRows } = await client.query(
      `INSERT INTO screen_time_balance (child, balance) VALUES ($1, 0)
       ON CONFLICT (child) DO UPDATE
         SET balance = GREATEST(0, screen_time_balance.balance - $2), updated_at = NOW()
       RETURNING balance`,
      [child, actualDeducted]
    )

    // Buffer absorbs the difference when balance < durationMinutes, keeping
    // the display duration consistent regardless of how much was paid.
    const storedBuffer = (durationMinutes + (bufferMinutes ?? 5)) - actualDeducted
    const endTime = Date.now() + (actualDeducted + storedBuffer) * 60 * 1000

    await client.query(
      `INSERT INTO timers (child, end_time, duration_minutes, buffer_minutes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (child) DO UPDATE
         SET end_time = $2, duration_minutes = $3, buffer_minutes = $4, started_at = NOW()`,
      [child, endTime, actualDeducted, storedBuffer]
    )

    await client.query('COMMIT')

    broadcast('screen_time', { child, balance: stRows[0].balance })
    broadcast('timers', { child })
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
  const { child } = req.params
  const { expired = false } = req.body

  const { rows } = await db.query(`SELECT * FROM timers WHERE child = $1`, [child])
  if (!rows.length) return res.json({ success: true })

  const timer = rows[0]

  if (!expired) {
    const msLeft  = Math.max(0, Number(timer.end_time) - Date.now())
    const paidMs  = Number(timer.duration_minutes) * 60 * 1000

    let refund = 0
    if (msLeft >= paidMs) {
      // Still in setup buffer — full refund
      refund = Number(timer.duration_minutes)
    } else if (msLeft > 0) {
      // In paid time — proportional refund
      refund = Math.round((msLeft / paidMs) * Number(timer.duration_minutes))
    }

    if (refund > 0) {
      await db.query(
        `UPDATE screen_time_balance SET balance = balance + $1, updated_at = NOW() WHERE child = $2`,
        [refund, child]
      )
      broadcast('screen_time', { child })
    }
  }

  await db.query(`DELETE FROM timers WHERE child = $1`, [child])
  broadcast('timers', { child })
  res.json({ success: true })
})

// Called from index.js on startup — expires timers server-side every 30s
export function startExpiryJob() {
  setInterval(async () => {
    try {
      const { rows } = await db.query(`SELECT child FROM timers WHERE end_time < $1`, [Date.now()])
      for (const { child } of rows) {
        await db.query(`DELETE FROM timers WHERE child = $1`, [child])
        broadcast('timers', { child })
        broadcast('screen_time', { child })
      }
    } catch (err) {
      console.error('Timer expiry job error:', err.message)
    }
  }, 30_000)
}

export default router

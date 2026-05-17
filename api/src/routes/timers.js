import { Router } from 'express'
import { db } from '../db/client.js'
import { broadcast } from './events.js'

const router = Router()

// GET /timers
router.get('/', async (_req, res) => {
  const { rows } = await db.query(`SELECT * FROM timers`)
  res.json(rows)
})

// POST /timers/:child/start  { endTime, deductedMinutes, totalMs }
router.post('/:child/start', async (req, res) => {
  const { child } = req.params
  const { endTime, deductedMinutes, totalMs } = req.body

  await db.query(
    `INSERT INTO timers (child, end_time, deducted_minutes, total_ms)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (child) DO UPDATE
       SET end_time = $2, deducted_minutes = $3, total_ms = $4, started_at = NOW()`,
    [child, endTime, deductedMinutes, totalMs]
  )
  broadcast('timers', { child })
  res.json({ success: true })
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
    const refund  = Math.round((msLeft / Number(timer.total_ms)) * timer.deducted_minutes)
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

export default router

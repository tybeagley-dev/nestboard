import { Router } from 'express'
import { db } from '../db/client.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'

const router = Router()

const TRADE_MINS_PER_BUCK = 10
const TRADE_DAILY_MAX     = 30

// GET /screen-time
router.get('/', async (_req, res) => {
  const { rows } = await db.query(`SELECT * FROM screen_time_balance ORDER BY child`)
  res.json(rows)
})

// POST /screen-time/:child/adjust  { delta }
router.post('/:child/adjust', async (req, res) => {
  const { delta } = req.body
  const { child } = req.params
  if (isNaN(delta)) return res.status(400).json({ error: 'Invalid delta' })

  const { rows } = await db.query(
    `INSERT INTO screen_time_balance (child, balance) VALUES ($1, GREATEST(0, $2))
     ON CONFLICT (child) DO UPDATE
       SET balance = GREATEST(0, screen_time_balance.balance + $2), updated_at = NOW()
     RETURNING balance`,
    [child, delta]
  )
  broadcast('screen_time', { child, balance: rows[0].balance })
  res.json({ success: true, balance: rows[0].balance })
})

// POST /screen-time/:child/trade  { amount, date }
router.post('/:child/trade', async (req, res) => {
  const { amount, date } = req.body
  const { child } = req.params
  if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })

  // Check daily trade limit
  const { rows: tradeRows } = await db.query(
    `SELECT COALESCE(SUM(ABS(amount)), 0) AS traded
     FROM spend_events
     WHERE child = $1 AND type = 'trade' AND created_at::date = $2`,
    [child, date]
  )
  const traded  = Number(tradeRows[0].traded)
  const allowed = Math.min(amount, TRADE_DAILY_MAX - traded)
  if (allowed <= 0) return res.status(400).json({ error: 'Daily trade limit reached' })

  // Deduct bucks
  await db.query(
    `UPDATE bucks_balance SET balance = GREATEST(0, balance - $1), updated_at = NOW() WHERE child = $2`,
    [allowed, child]
  )
  // Add screen time
  const { rows: stRows } = await db.query(
    `INSERT INTO screen_time_balance (child, balance) VALUES ($1, $2)
     ON CONFLICT (child) DO UPDATE
       SET balance = screen_time_balance.balance + $2, updated_at = NOW()
     RETURNING balance`,
    [child, allowed * TRADE_MINS_PER_BUCK]
  )
  await db.query(
    `INSERT INTO spend_events (child, amount, type) VALUES ($1, $2, 'trade')`,
    [child, -allowed]
  )

  broadcast('bucks',       { child })
  broadcast('screen_time', { child, balance: stRows[0].balance })
  res.json({ success: true, bucksTrade: allowed, minutesAdded: allowed * TRADE_MINS_PER_BUCK, newBalance: stRows[0].balance })
})

// GET /screen-time/:child/trade-count?date=YYYY-MM-DD
router.get('/:child/trade-count', async (req, res) => {
  const { child } = req.params
  const { date }  = req.query
  const { rows }  = await db.query(
    `SELECT COALESCE(SUM(ABS(amount)), 0) AS traded
     FROM spend_events
     WHERE child = $1 AND type = 'trade' AND created_at::date = $2`,
    [child, date]
  )
  const traded = Number(rows[0].traded)
  res.json({ traded, remaining: Math.max(0, TRADE_DAILY_MAX - traded) })
})

export default router

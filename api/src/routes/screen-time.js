import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { broadcast } from './events.js'
import { resolveChildId } from '../db/resolveChild.js'

const router = Router()

const TRADE_MINS_PER_BUCK = 10
const TRADE_DAILY_MAX     = 30

router.use(requireFamily)

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT stb.family_id, stb.balance, stb.updated_at, ch.name AS child
     FROM screen_time_balance stb
     JOIN children ch ON ch.id = stb.child_id
     WHERE stb.family_id = $1
     ORDER BY ch.sort_order`,
    [req.familyId]
  )
  res.json(rows)
})

// POST /screen-time/:child/adjust  { delta }
router.post('/:child/adjust', async (req, res) => {
  const { delta } = req.body
  const childName = req.params.child
  if (isNaN(delta)) return res.status(400).json({ error: 'Invalid delta' })

  const childId = await resolveChildId(req.familyId, childName)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rows } = await db.query(
    `INSERT INTO screen_time_balance (family_id, child_id, balance) VALUES ($1, $2, GREATEST(0, $3))
     ON CONFLICT (family_id, child_id) DO UPDATE
       SET balance = GREATEST(0, screen_time_balance.balance + $3), updated_at = NOW()
     RETURNING balance`,
    [req.familyId, childId, delta]
  )
  broadcast('screen_time', { child: childName, balance: rows[0].balance })
  res.json({ success: true, balance: rows[0].balance })
})

// POST /screen-time/:child/trade  { amount, date }
router.post('/:child/trade', async (req, res) => {
  const { amount, date } = req.body
  const childName = req.params.child
  if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })

  const childId = await resolveChildId(req.familyId, childName)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rows: tradeRows } = await db.query(
    `SELECT COALESCE(SUM(ABS(amount)), 0) AS traded
     FROM spend_events
     WHERE family_id = $1 AND child_id = $2 AND type = 'trade' AND created_at::date = $3`,
    [req.familyId, childId, date]
  )
  const traded  = Number(tradeRows[0].traded)
  const allowed = Math.min(amount, TRADE_DAILY_MAX - traded)
  if (allowed <= 0) return res.status(400).json({ error: 'Daily trade limit reached' })

  await db.query(
    `UPDATE bucks_balance SET balance = GREATEST(0, balance - $1), updated_at = NOW()
     WHERE family_id = $2 AND child_id = $3`,
    [allowed, req.familyId, childId]
  )
  const { rows: stRows } = await db.query(
    `INSERT INTO screen_time_balance (family_id, child_id, balance) VALUES ($1, $2, $3)
     ON CONFLICT (family_id, child_id) DO UPDATE
       SET balance = screen_time_balance.balance + $3, updated_at = NOW()
     RETURNING balance`,
    [req.familyId, childId, allowed * TRADE_MINS_PER_BUCK]
  )
  await db.query(
    `INSERT INTO spend_events (family_id, child_id, amount, type) VALUES ($1, $2, $3, 'trade')`,
    [req.familyId, childId, -allowed]
  )

  broadcast('bucks',       { child: childName })
  broadcast('screen_time', { child: childName, balance: stRows[0].balance })
  res.json({ success: true, bucksTrade: allowed, minutesAdded: allowed * TRADE_MINS_PER_BUCK, newBalance: stRows[0].balance })
})

// GET /screen-time/:child/trade-count?date=YYYY-MM-DD
router.get('/:child/trade-count', async (req, res) => {
  const childName = req.params.child
  const { date }  = req.query

  const childId = await resolveChildId(req.familyId, childName)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rows } = await db.query(
    `SELECT COALESCE(SUM(ABS(amount)), 0) AS traded
     FROM spend_events
     WHERE family_id = $1 AND child_id = $2 AND type = 'trade' AND created_at::date = $3`,
    [req.familyId, childId, date]
  )
  const traded = Number(rows[0].traded)
  res.json({ traded, remaining: Math.max(0, TRADE_DAILY_MAX - traded) })
})

export default router

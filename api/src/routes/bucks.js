import { Router } from 'express'
import { db } from '../db/client.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'

const router = Router()

// GET /bucks
router.get('/', async (_req, res) => {
  const { rows } = await db.query(`SELECT * FROM bucks_balance ORDER BY child`)
  res.json(rows)
})

// POST /bucks/:child/adjust  { delta, type }
router.post('/:child/adjust', requireParent, async (req, res) => {
  const { delta, type } = req.body
  const { child } = req.params
  if (!delta || isNaN(delta)) return res.status(400).json({ error: 'Invalid delta' })

  const { rows } = await db.query(
    `INSERT INTO bucks_balance (child, balance) VALUES ($1, GREATEST(0, $2))
     ON CONFLICT (child) DO UPDATE
       SET balance = GREATEST(0, bucks_balance.balance + $2), updated_at = NOW()
     RETURNING balance`,
    [child, delta]
  )
  await db.query(
    `INSERT INTO spend_events (child, amount, type) VALUES ($1, $2, $3)`,
    [child, delta, type ?? 'adjustment']
  )
  broadcast('bucks', { child, balance: rows[0].balance })
  res.json({ success: true, balance: rows[0].balance })
})

export default router

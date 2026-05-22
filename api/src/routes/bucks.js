import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'

const router = Router()

router.use(requireFamily)

// GET /bucks
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM bucks_balance WHERE family_id = $1 ORDER BY child`,
    [req.familyId]
  )
  res.json(rows)
})

// POST /bucks/:child/adjust  { delta, type }
router.post('/:child/adjust', requireParent, async (req, res) => {
  const { delta, type } = req.body
  const { child } = req.params
  if (!delta || isNaN(delta)) return res.status(400).json({ error: 'Invalid delta' })

  const { rows } = await db.query(
    `INSERT INTO bucks_balance (family_id, child, balance) VALUES ($1, $2, GREATEST(0, $3))
     ON CONFLICT (family_id, child) DO UPDATE
       SET balance = GREATEST(0, bucks_balance.balance + $3), updated_at = NOW()
     RETURNING balance`,
    [req.familyId, child, delta]
  )
  await db.query(
    `INSERT INTO spend_events (family_id, child, amount, type) VALUES ($1, $2, $3, $4)`,
    [req.familyId, child, delta, type ?? 'adjustment']
  )
  broadcast('bucks', { child, balance: rows[0].balance })
  res.json({ success: true, balance: rows[0].balance })
})

export default router

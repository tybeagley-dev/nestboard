import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'
import { resolveChildId } from '../db/resolveChild.js'

const router = Router()
router.use(requireFamily)

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT bb.family_id, bb.balance, bb.updated_at, ch.name AS child
     FROM bucks_balance bb
     JOIN children ch ON ch.id = bb.child_id
     WHERE bb.family_id = $1
     ORDER BY ch.sort_order`,
    [req.familyId]
  )
  res.json(rows)
})

// POST /bucks/:child/adjust  { delta, type }
router.post('/:child/adjust', requireParent, async (req, res) => {
  const { delta, type } = req.body
  const childName = req.params.child
  if (!delta || isNaN(delta)) return res.status(400).json({ error: 'Invalid delta' })

  const childId = await resolveChildId(req.familyId, childName)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rows } = await db.query(
    `INSERT INTO bucks_balance (family_id, child_id, balance) VALUES ($1, $2, GREATEST(0, $3))
     ON CONFLICT (family_id, child_id) DO UPDATE
       SET balance = GREATEST(0, bucks_balance.balance + $3), updated_at = NOW()
     RETURNING balance`,
    [req.familyId, childId, delta]
  )
  await db.query(
    `INSERT INTO spend_events (family_id, child_id, amount, type) VALUES ($1, $2, $3, $4)`,
    [req.familyId, childId, delta, type ?? 'adjustment']
  )
  broadcast('bucks', { child: childName, balance: rows[0].balance })
  res.json({ success: true, balance: rows[0].balance })
})

export default router

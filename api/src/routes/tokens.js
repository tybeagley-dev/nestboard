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
    `SELECT tb.family_id, tb.balance, tb.updated_at, ch.name AS child
     FROM token_balance tb
     JOIN children ch ON ch.id = tb.child_id
     WHERE tb.family_id = $1
     ORDER BY ch.sort_order`,
    [req.familyId]
  )
  res.json(rows)
})

// GET /tokens/:child/history — recent ledger entries for the kid-facing list.
// Chore earnings were only added to spend_events in Aug 2026, so history simply
// starts wherever the data starts.
router.get('/:child/history', async (req, res) => {
  const childId = await resolveChildId(req.familyId, req.params.child)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '10', 10) || 10))
  const { rows } = await db.query(
    `SELECT id, amount, type, created_at
     FROM spend_events
     WHERE family_id = $1 AND child_id = $2
     ORDER BY created_at DESC, id DESC
     LIMIT $3`,
    [req.familyId, childId, limit]
  )
  res.json(rows)
})

// POST /tokens/:child/adjust  { delta, type }
router.post('/:child/adjust', requireParent, async (req, res) => {
  const { delta, type } = req.body
  const childName = req.params.child
  if (!delta || isNaN(delta)) return res.status(400).json({ error: 'Invalid delta' })

  const childId = await resolveChildId(req.familyId, childName)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rows } = await db.query(
    `INSERT INTO token_balance (family_id, child_id, balance) VALUES ($1, $2, GREATEST(0, $3))
     ON CONFLICT (family_id, child_id) DO UPDATE
       SET balance = GREATEST(0, token_balance.balance + $3), updated_at = NOW()
     RETURNING balance`,
    [req.familyId, childId, delta]
  )
  await db.query(
    `INSERT INTO spend_events (family_id, child_id, amount, type) VALUES ($1, $2, $3, $4)`,
    [req.familyId, childId, delta, type ?? 'adjustment']
  )
  broadcast('tokens', { child: childName, balance: rows[0].balance }, req.familyId)
  res.json({ success: true, balance: rows[0].balance })
})

export default router

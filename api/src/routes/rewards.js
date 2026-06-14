import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'
import { resolveChildId } from '../db/resolveChild.js'

const router = Router()

router.use(requireFamily)

router.get('/', async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true'
  const { rows } = await db.query(
    `SELECT * FROM rewards WHERE family_id = $1 ${includeInactive ? '' : 'AND active = true'} ORDER BY label`,
    [req.familyId]
  )
  res.json(rows)
})

router.post('/:id/buy', async (req, res) => {
  const { child } = req.body
  const { id }    = req.params
  if (!child) return res.status(400).json({ error: 'Missing child' })

  const childId = await resolveChildId(req.familyId, child)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rows } = await db.query(
    `SELECT * FROM rewards WHERE id = $1 AND family_id = $2 AND active = true`,
    [id, req.familyId]
  )
  if (!rows.length) return res.status(404).json({ error: 'Item not found' })

  const item = rows[0]

  await db.query(
    `UPDATE token_balance SET balance = GREATEST(0, balance - $1), updated_at = NOW()
     WHERE family_id = $2 AND child_id = $3`,
    [item.cost, req.familyId, childId]
  )
  await db.query(
    `INSERT INTO purchases (id, family_id, child_id, item_id, item_label, cost)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [`${Date.now()}-${childId}`, req.familyId, childId, id, item.label, item.cost]
  )
  await db.query(
    `INSERT INTO spend_events (family_id, child_id, amount, type) VALUES ($1, $2, $3, 'rewards')`,
    [req.familyId, childId, -item.cost]
  )

  broadcast('tokens', { child })
  res.json({ success: true })
})

router.get('/purchases', async (req, res) => {
  const { child, includeRedeemed } = req.query
  let query = `SELECT p.id, p.family_id, p.child_id, p.item_id, p.item_label, p.cost,
                      p.redeemed, p.redeemed_at, p.created_at, ch.name AS child
               FROM purchases p
               JOIN children ch ON ch.id = p.child_id
               WHERE p.family_id = $1`
  const params = [req.familyId]
  if (child) {
    const childId = await resolveChildId(req.familyId, child)
    if (!childId) return res.status(400).json({ error: 'Unknown child' })
    params.push(childId)
    query += ` AND p.child_id = $${params.length}`
  }
  if (includeRedeemed !== 'true') { query += ` AND p.redeemed = false` }
  query += ` ORDER BY p.created_at DESC`
  const { rows } = await db.query(query, params)
  res.json(rows)
})

router.post('/purchases/:id/redeem', requireParent, async (req, res) => {
  const { rowCount } = await db.query(
    `UPDATE purchases SET redeemed = true, redeemed_at = NOW()
     WHERE id = $1 AND family_id = $2`,
    [req.params.id, req.familyId]
  )
  if (!rowCount) return res.status(404).json({ error: 'Purchase not found' })
  res.json({ success: true })
})

// ── Admin ─────────────────────────────────────────────────────────────────────

router.post('/', requireParent, async (req, res) => {
  const { id, label, icon, cost, requires_approval } = req.body
  await db.query(
    `INSERT INTO rewards (id, family_id, label, icon, cost, requires_approval) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, req.familyId, label, icon, cost, requires_approval ?? false]
  )
  res.json({ success: true })
})

router.put('/:id', requireParent, async (req, res) => {
  const { label, icon, cost, requires_approval, active } = req.body
  await db.query(
    `UPDATE rewards SET label=$1, icon=$2, cost=$3, requires_approval=$4, active=$5
     WHERE id=$6 AND family_id=$7`,
    [label, icon, cost, requires_approval, active ?? true, req.params.id, req.familyId]
  )
  res.json({ success: true })
})

router.delete('/:id', requireParent, async (req, res) => {
  await db.query(
    `DELETE FROM rewards WHERE id = $1 AND family_id = $2`,
    [req.params.id, req.familyId]
  )
  res.json({ success: true })
})

export default router

import { Router } from 'express'
import { db } from '../db/client.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'

const router = Router()

router.get('/', async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true'
  const { rows } = await db.query(
    `SELECT * FROM mom_store ${includeInactive ? '' : 'WHERE active = true'} ORDER BY label`
  )
  res.json(rows)
})

router.post('/:id/buy', async (req, res) => {
  const { child } = req.body
  const { id }    = req.params
  if (!child) return res.status(400).json({ error: 'Missing child' })

  const { rows } = await db.query(`SELECT * FROM mom_store WHERE id = $1 AND active = true`, [id])
  if (!rows.length) return res.status(404).json({ error: 'Item not found' })

  const item = rows[0]

  await db.query(
    `UPDATE bucks_balance SET balance = GREATEST(0, balance - $1), updated_at = NOW() WHERE child = $2`,
    [item.cost, child]
  )
  await db.query(
    `INSERT INTO purchases (id, child, item_id, item_label, cost)
     VALUES ($1,$2,$3,$4,$5)`,
    [`${Date.now()}-${child}`, child, id, item.label, item.cost]
  )
  await db.query(
    `INSERT INTO spend_events (child, amount, type) VALUES ($1, $2, 'mom_store')`,
    [child, -item.cost]
  )

  broadcast('bucks', { child })
  res.json({ success: true })
})

router.get('/purchases', async (req, res) => {
  const { child, includeRedeemed } = req.query
  let query = `SELECT * FROM purchases`
  const params = []
  const conditions = []
  if (child) { conditions.push(`child = $${params.push(child)}`); }
  if (includeRedeemed !== 'true') { conditions.push('redeemed = false') }
  if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`
  query += ` ORDER BY created_at DESC`
  const { rows } = await db.query(query, params)
  res.json(rows)
})

router.post('/purchases/:id/redeem', requireParent, async (req, res) => {
  const { rowCount } = await db.query(
    `UPDATE purchases SET redeemed = true, redeemed_at = NOW() WHERE id = $1`,
    [req.params.id]
  )
  if (!rowCount) return res.status(404).json({ error: 'Purchase not found' })
  res.json({ success: true })
})

// ── Admin ─────────────────────────────────────────────────────────────────────

router.post('/', requireParent, async (req, res) => {
  const { id, label, icon, cost, requires_approval } = req.body
  await db.query(
    `INSERT INTO mom_store (id, label, icon, cost, requires_approval) VALUES ($1,$2,$3,$4,$5)`,
    [id, label, icon, cost, requires_approval ?? false]
  )
  res.json({ success: true })
})

router.put('/:id', requireParent, async (req, res) => {
  const { label, icon, cost, requires_approval, active } = req.body
  await db.query(
    `UPDATE mom_store SET label=$1, icon=$2, cost=$3, requires_approval=$4, active=$5 WHERE id=$6`,
    [label, icon, cost, requires_approval, active ?? true, req.params.id]
  )
  res.json({ success: true })
})

router.delete('/:id', requireParent, async (req, res) => {
  await db.query(`DELETE FROM mom_store WHERE id = $1`, [req.params.id])
  res.json({ success: true })
})

export default router

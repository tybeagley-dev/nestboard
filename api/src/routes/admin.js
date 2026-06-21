import { Router } from 'express'
import { db } from '../db/client.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()
router.use(requireAdmin)

// Family-scoped tables to clear before a family row can be deleted. Ordered so
// child_id-referencing rows go before children. children/memberships/invites and
// the families row are handled explicitly after this list.
const FAMILY_TABLES = [
  'announcements', 'calendars', 'chore_events', 'chores', 'grocery', 'meals',
  'micro_zones', 'notes', 'purchases', 'push_subscriptions', 'rewards',
  'routine_defs', 'routine_log', 'screen_time_balance',
  'screentime_abstinence_requests', 'screentime_purchase_requests',
  'spend_events', 'timers', 'token_balance', 'zone_assignments',
  'zone_check_log', 'zones',
]

// GET /admin/families → all families with member/child counts
router.get('/families', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT f.id, f.name, f.slug, f.onboarded, f.created_at,
              (SELECT count(*) FROM family_memberships m WHERE m.family_id = f.id) AS member_count,
              (SELECT count(*) FROM children c WHERE c.family_id = f.id) AS child_count
       FROM families f
       ORDER BY f.created_at DESC`
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /admin/families/:id → one family with its members + children
router.get('/families/:id', async (req, res) => {
  try {
    const fam = await db.query(
      'SELECT id, name, slug, onboarded, created_at FROM families WHERE id = $1',
      [req.params.id]
    )
    if (!fam.rows.length) return res.status(404).json({ error: 'Not found' })
    const members = await db.query(
      `SELECT fm.user_id, fm.role, u.email
       FROM family_memberships fm JOIN users u ON u.id = fm.user_id
       WHERE fm.family_id = $1
       ORDER BY (fm.role = 'owner') DESC, u.email`,
      [req.params.id]
    )
    const children = await db.query(
      'SELECT id, name, icon, color FROM children WHERE family_id = $1 ORDER BY sort_order',
      [req.params.id]
    )
    res.json({ ...fam.rows[0], members: members.rows, children: children.rows })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /admin/families/:id/members/:userId → remove a member from any family
router.delete('/families/:id/members/:userId', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM family_memberships WHERE family_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /admin/families/:id → delete a family and ALL its data (transactional)
router.delete('/families/:id', async (req, res) => {
  const { id } = req.params
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    for (const t of FAMILY_TABLES) {
      await client.query(`DELETE FROM ${t} WHERE family_id = $1`, [id])
    }
    await client.query('DELETE FROM children WHERE family_id = $1', [id])
    await client.query('DELETE FROM family_invites WHERE family_id = $1', [id])
    await client.query('DELETE FROM family_memberships WHERE family_id = $1', [id])
    const { rowCount } = await client.query('DELETE FROM families WHERE id = $1', [id])
    await client.query('COMMIT')
    if (!rowCount) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

export default router

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { broadcast } from './events.js'

const router = Router()

router.use(requireFamily)

// A note renders on one line under the dashboard greeting, so long text wrecks
// that layout. Enforced here as well as in the input's maxLength — the client is
// a suggestion, not a constraint.
export const NOTE_MAX_LENGTH = 80

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM announcements WHERE family_id = $1 ORDER BY added_at ASC`,
    [req.familyId]
  )
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { text } = req.body
  if (typeof text !== 'string') return res.status(400).json({ error: 'Missing params' })

  const trimmed = text.trim()
  if (!trimmed) return res.status(400).json({ error: 'Note cannot be empty' })
  if (trimmed.length > NOTE_MAX_LENGTH) {
    return res.status(400).json({ error: `Note must be ${NOTE_MAX_LENGTH} characters or fewer` })
  }

  // Server-generated, same reasoning as grocery: a client-supplied id could
  // collide and surface as a 500.
  const id = `a_${nanoid(12)}`
  await db.query(
    `INSERT INTO announcements (id, family_id, text) VALUES ($1, $2, $3)`,
    [id, req.familyId, trimmed]
  )
  broadcast('announcements', {}, req.familyId)
  res.status(201).json({ success: true, id })
})

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query(
    `DELETE FROM announcements WHERE id = $1 AND family_id = $2`,
    [req.params.id, req.familyId]
  )
  if (!rowCount) return res.status(404).json({ error: 'Announcement not found' })
  broadcast('announcements', {}, req.familyId)
  res.json({ success: true })
})

export default router

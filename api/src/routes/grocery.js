import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'

const router = Router()

router.use(requireFamily)

export const ITEM_MAX_LENGTH = 120
export const STORE_MAX_LENGTH = 40
const STORE_HISTORY_MAX = 20

// Items carry a free-text store name; NULL means unassigned. Normalising to a
// trimmed string (or null) here keeps '' and '   ' from becoming a third,
// invisible bucket alongside "unassigned".
function normalizeStore(raw) {
  if (raw === null || raw === undefined) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, error: 'Store must be text' }
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, value: null }
  if (trimmed.length > STORE_MAX_LENGTH) {
    return { ok: false, error: `Store must be ${STORE_MAX_LENGTH} characters or fewer` }
  }
  return { ok: true, value: trimmed }
}

async function readStoreHistory(familyId) {
  const { rows } = await db.query('SELECT settings FROM families WHERE id = $1', [familyId])
  const stores = rows[0]?.settings?.grocery_stores
  return Array.isArray(stores) ? stores.filter(s => typeof s === 'string') : []
}

// Clear All deletes every row, so the item table can't be the source of truth
// for "stores this family shops at". Mirror each new name onto the family row,
// most-recent-first, so the picker still suggests Costco next week.
//
// Read-only. Returns the name to actually store on the item: typing "costco"
// when the family already has a "Costco" must reuse the existing casing, or the
// two differ only by case and the list renders two separate Costco groups.
// `isNew` tells the caller whether the name still needs persisting.
async function canonicalStore(familyId, store) {
  if (!store) return { name: null, isNew: false, existing: [] }
  const existing = await readStoreHistory(familyId)
  const match = existing.find(s => s.toLowerCase() === store.toLowerCase())
  return { name: match ?? store, isNew: !match, existing }
}

// Called only after the item write actually landed — a store typed into a PATCH
// against a deleted item must not leave its name in the family's suggestions.
async function persistStore(familyId, { name, isNew, existing }) {
  if (!name || !isNew) return
  const next = [name, ...existing].slice(0, STORE_HISTORY_MAX)
  await db.query(
    `UPDATE families
     SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('grocery_stores', $1::jsonb)
     WHERE id = $2`,
    [JSON.stringify(next), familyId]
  )
  broadcast('family', {}, familyId)
}

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM grocery WHERE family_id = $1 ORDER BY added_at ASC`,
    [req.familyId]
  )
  res.json(rows)
})

// The known store names, including ones whose items have all been cleared.
router.get('/stores', async (req, res) => {
  res.json(await readStoreHistory(req.familyId))
})

// Create a store up front, without having to file an item under it first.
// Parent-only, like every other store write.
router.post('/stores', requireParent, async (req, res) => {
  const parsed = normalizeStore(req.body?.name)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  if (!parsed.value) return res.status(400).json({ error: 'Store name cannot be empty' })

  const resolved = await canonicalStore(req.familyId, parsed.value)
  await persistStore(req.familyId, resolved)
  // Already-known names are a no-op rather than an error: the button is next to
  // the list showing them, and re-adding one is a slip, not a failure.
  res.status(201).json({ success: true, store: resolved.name, stores: await readStoreHistory(req.familyId) })
})

// Anyone in the family can add an item — the kiosk and the child views run on
// device tokens, and capture has to stay frictionless. Everything lands
// unassigned; filing it under a store is a parent action (see PATCH below).
//
// A `store` in the body is deliberately ignored rather than rejected: kiosks run
// as cached PWAs and an old bundle may keep sending one for a while after this
// deploys. Ignoring it costs a parent one refile; a 400 would stop the fridge
// display adding groceries at all.
router.post('/', async (req, res) => {
  const { item } = req.body
  if (typeof item !== 'string') return res.status(400).json({ error: 'Missing params' })

  const trimmed = item.trim()
  if (!trimmed) return res.status(400).json({ error: 'Item cannot be empty' })
  if (trimmed.length > ITEM_MAX_LENGTH) {
    return res.status(400).json({ error: `Item must be ${ITEM_MAX_LENGTH} characters or fewer` })
  }

  // Server-generated: the id used to come from the request body, so a colliding
  // id threw a primary-key error the caller saw as a 500, and it doubled as an
  // oracle for whether an id existed in some other family.
  const id = `g_${nanoid(12)}`
  await db.query(
    `INSERT INTO grocery (id, family_id, item) VALUES ($1, $2, $3)`,
    [id, req.familyId, trimmed]
  )
  broadcast('grocery', {}, req.familyId)
  res.status(201).json({ success: true, id, store: null })
})

// Refile an item. Parent-only: store management lives exclusively in the parent
// portal, so this is the single write path that can set a store at all.
router.patch('/:id', requireParent, async (req, res) => {
  const parsedStore = normalizeStore(req.body?.store)
  if (!parsedStore.ok) return res.status(400).json({ error: parsedStore.error })

  const resolved = await canonicalStore(req.familyId, parsedStore.value)
  const { rowCount } = await db.query(
    `UPDATE grocery SET store = $1 WHERE id = $2 AND family_id = $3`,
    [resolved.name, req.params.id, req.familyId]
  )
  if (!rowCount) return res.status(404).json({ error: 'Item not found' })

  await persistStore(req.familyId, resolved)
  broadcast('grocery', {}, req.familyId)
  res.json({ success: true, store: resolved.name })
})

router.delete('/', async (req, res) => {
  await db.query(`DELETE FROM grocery WHERE family_id = $1`, [req.familyId])
  broadcast('grocery', {}, req.familyId)
  res.json({ success: true })
})

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query(
    `DELETE FROM grocery WHERE id = $1 AND family_id = $2`,
    [req.params.id, req.familyId]
  )
  if (!rowCount) return res.status(404).json({ error: 'Item not found' })
  broadcast('grocery', {}, req.familyId)
  res.json({ success: true })
})

export default router

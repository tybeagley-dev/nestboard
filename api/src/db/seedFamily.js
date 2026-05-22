/**
 * Seeds the initial Beagley family and backfills family_id on all existing rows.
 * Run once after migration 006: node src/db/seedFamily.js
 *
 * Reads from env: SEED_FAMILY_SLUG (optional, generates if absent), PARENT_PIN (required)
 */
import { db } from './client.js'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const FAMILY_ID = 'fam_beagley'
const FAMILY_NAME = 'Beagley'
const slug = process.env.SEED_FAMILY_SLUG || nanoid(12)
const pin = process.env.PARENT_PIN
if (!pin) { console.error('PARENT_PIN env var required'); process.exit(1) }

const hash = await bcrypt.hash(pin, 12)

// Insert family (skip if already exists)
await db.query(`
  INSERT INTO families (id, name, slug, parent_pin_hash)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (id) DO NOTHING
`, [FAMILY_ID, FAMILY_NAME, slug, hash])

// Insert children (skip if already exist)
const children = [
  { id: 'child_paige', name: 'Paige', color: '#C4837A', emoji: '🐱', sort_order: 0 },
  { id: 'child_nolan', name: 'Nolan', color: '#6B8BA4', emoji: '🧑🏼‍🚀', sort_order: 1 },
  { id: 'child_jonah', name: 'Jonah', color: '#7D9B76', emoji: '⚾️',  sort_order: 2 },
]
for (const c of children) {
  await db.query(`
    INSERT INTO children (id, family_id, name, color, emoji, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO NOTHING
  `, [c.id, FAMILY_ID, c.name, c.color, c.emoji, c.sort_order])
}

// Backfill family_id on all existing rows
const tables = [
  'chores', 'routine_defs', 'mom_store', 'chore_events', 'spend_events',
  'grocery', 'notes', 'announcements', 'purchases', 'calendars',
  'bucks_balance', 'screen_time_balance', 'timers', 'meals', 'routine_log',
]
for (const t of tables) {
  const { rowCount } = await db.query(
    `UPDATE ${t} SET family_id = $1 WHERE family_id IS NULL`,
    [FAMILY_ID]
  )
  if (rowCount > 0) console.log(`  backfilled ${rowCount} rows in ${t}`)
}

// Seed initial balances for each child (if not already present)
for (const c of children) {
  await db.query(
    `INSERT INTO bucks_balance (family_id, child, balance)
     VALUES ($1, $2, 0)
     ON CONFLICT (family_id, child) DO NOTHING`,
    [FAMILY_ID, c.name]
  )
  await db.query(
    `INSERT INTO screen_time_balance (family_id, child, balance)
     VALUES ($1, $2, 0)
     ON CONFLICT (family_id, child) DO NOTHING`,
    [FAMILY_ID, c.name]
  )
}

// Enforce NOT NULL now that all rows are backfilled
const alterTables = [
  'chores', 'routine_defs', 'mom_store', 'chore_events', 'spend_events',
  'grocery', 'notes', 'announcements', 'purchases', 'calendars',
  'bucks_balance', 'screen_time_balance', 'timers', 'meals', 'routine_log',
]
for (const t of alterTables) {
  await db.query(`ALTER TABLE ${t} ALTER COLUMN family_id SET NOT NULL`)
  console.log(`  family_id NOT NULL enforced on ${t}`)
}

console.log(`\nFamily slug: ${slug}`)
console.log('Set DEFAULT_FAMILY_SLUG=' + slug + ' in your API env vars.')

await db.end()

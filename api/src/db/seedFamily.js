/**
 * Creates the initial family record, children, and starting balances.
 * Run once after migrations: node src/db/seedFamily.js
 *
 * Required env: PARENT_PIN
 * Optional env: SEED_FAMILY_SLUG (generates a nanoid if absent)
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

await db.query(`
  INSERT INTO families (id, name, slug, parent_pin_hash)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (id) DO NOTHING
`, [FAMILY_ID, FAMILY_NAME, slug, hash])
console.log(`family ${FAMILY_ID} inserted (or already existed)`)

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
console.log(`${children.length} children inserted (or already existed)`)

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
console.log('initial balances seeded')

console.log(`\nFamily slug: ${slug}`)
console.log('Set DEFAULT_FAMILY_SLUG=' + slug + ' in your API env vars.')

await db.end()

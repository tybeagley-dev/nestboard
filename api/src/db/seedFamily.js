/**
 * Seeds the Beagley family: family row, children, initial balances, and chores.
 * Safe to re-run — everything uses ON CONFLICT DO NOTHING.
 *
 * Reads from env: SEED_FAMILY_SLUG (optional, generates if absent), PARENT_PIN (required)
 */
import { db } from './client.js'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const FAMILY_ID   = 'fam_beagley'
const FAMILY_NAME = 'Beagley'
const slug = process.env.SEED_FAMILY_SLUG || nanoid(12)
const pin  = process.env.PARENT_PIN
if (!pin) { console.error('PARENT_PIN env var required'); process.exit(1) }

const hash = await bcrypt.hash(pin, 12)

// ── Family ────────────────────────────────────────────────────────────────────
await db.query(
  `INSERT INTO families (id, name, slug, parent_pin_hash)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (id) DO NOTHING`,
  [FAMILY_ID, FAMILY_NAME, slug, hash]
)
console.log('family seeded')

// ── Children ──────────────────────────────────────────────────────────────────
const children = [
  { id: 'child_paige', name: 'Paige', color: '#C4837A', emoji: '🐱',      sort_order: 0 },
  { id: 'child_nolan', name: 'Nolan', color: '#6B8BA4', emoji: '🧑🏼‍🚀', sort_order: 1 },
  { id: 'child_jonah', name: 'Jonah', color: '#7D9B76', emoji: '⚾️',      sort_order: 2 },
]
for (const c of children) {
  await db.query(
    `INSERT INTO children (id, family_id, name, color, emoji, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [c.id, FAMILY_ID, c.name, c.color, c.emoji, c.sort_order]
  )
}
console.log('children seeded')

// ── Initial balances ──────────────────────────────────────────────────────────
for (const c of children) {
  await db.query(
    `INSERT INTO bucks_balance (family_id, child_id, balance)
     VALUES ($1, $2, 0)
     ON CONFLICT (family_id, child_id) DO NOTHING`,
    [FAMILY_ID, c.id]
  )
  await db.query(
    `INSERT INTO screen_time_balance (family_id, child_id, balance)
     VALUES ($1, $2, 0)
     ON CONFLICT (family_id, child_id) DO NOTHING`,
    [FAMILY_ID, c.id]
  )
}
console.log('balances seeded')

// ── Chores ────────────────────────────────────────────────────────────────────
const chores = [
  { id: 'mpa8kvvz', label: 'Collect dirty clothes',              bucks: 1, icon: '🧺', active: true,  required: true,  days: ['Sunday'],   instructions: [],                                                                       max_per_week: null },
  { id: 'c1',       label: 'baby sitter',                        bucks: 1, icon: '👶🏼', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c2',       label: 'feed the cats',                      bucks: 2, icon: '😸', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c3',       label: 'treasure hunter',                    bucks: 1, icon: '🛋️', active: true,  required: false, days: [],           instructions: ['Toys out from under couches'],                                          max_per_week: null },
  { id: 'c4',       label: 'car detailer',                       bucks: 2, icon: '🚙', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c5',       label: 'sandbox supervisor',                  bucks: 1, icon: '🏖️', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c6',       label: 'wipe tables & counters',             bucks: 1, icon: '🧽', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c7',       label: 'unload dishwasher',                  bucks: 1, icon: '🧫', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c8',       label: 'nugget ninja',                       bucks: 1, icon: '🥷🏼', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c9',       label: 'wipe cabinets',                      bucks: 1, icon: '🧽', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c10',      label: 'transporter',                        bucks: 1, icon: '🚛', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c11',      label: 'clean door knobs',                   bucks: 1, icon: '🚪', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c12',      label: 'clean light switches',               bucks: 1, icon: '💡', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c13',      label: 'tidy room',                          bucks: 2, icon: '🛌', active: true,  required: false, days: [],           instructions: ['Toys out of room', 'Garbage cleaned', 'Clothes away', 'Bed made'],      max_per_week: null },
  { id: 'c14',      label: 'mailman',                            bucks: 1, icon: '📫', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c15',      label: 'wipe chairs',                        bucks: 1, icon: '🪑', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c16',      label: 'wash windows',                       bucks: 1, icon: '🪟', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c17',      label: 'dust the piano',                     bucks: 1, icon: '🎹', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c18',      label: 'collect dirty clothes',              bucks: 1, icon: '🧺', active: true,  required: false, days: ['Sunday'],   instructions: [],                                                                       max_per_week: null },
  { id: 'c19',      label: 'stepping stone stacker',             bucks: 1, icon: '🪨', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c20',      label: 'toilet team',                        bucks: 3, icon: '🚽', active: false, required: false, days: [],           instructions: ['Clean toilet', 'Scrub sink', 'Toilet paper rolls'],                     max_per_week: null },
  { id: 'c21',      label: 'lego leader',                        bucks: 1, icon: '🝚', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c22',      label: 'shoe sheriff',                       bucks: 1, icon: '👟', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c23',      label: 'couch blankets & pillows',           bucks: 1, icon: '🛋️', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c24',      label: 'vacuum couch',                       bucks: 1, icon: '🧹', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c25',      label: 'set the table',                      bucks: 1, icon: '🍽️', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c26',      label: 'water the plants',                   bucks: 1, icon: '🪴', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c27',      label: 'vacuum',                             bucks: 1, icon: '🧹', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c28',      label: 'sanitation team—garbage cans emptied', bucks: 2, icon: '🧼', active: false, required: false, days: ['Monday'], instructions: [],                                                                       max_per_week: null },
  { id: 'c29',      label: 'tech manager',                       bucks: 1, icon: '💻', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c30',      label: 'window opener',                      bucks: 1, icon: '🪟', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c31',      label: 'silk supervisor',                    bucks: 1, icon: '🎗️', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c32',      label: 'laundry aid',                        bucks: 1, icon: '🧺', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c33',      label: 'clear the table',                    bucks: 1, icon: '🍽️', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c34',      label: 'chef',                               bucks: 1, icon: '🧑🏼‍🍳', active: false, required: false, days: [],      instructions: [],                                                                       max_per_week: null },
  { id: 'c35',      label: 'sanitation worker—garbage pickup',   bucks: 1, icon: '🚮', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c36',      label: 'block boss',                         bucks: 1, icon: '🧱', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c37',      label: 'put clean clothes away',             bucks: 1, icon: '🧦', active: true,  required: false, days: ['Monday'],   instructions: [],                                                                       max_per_week: null },
  { id: 'c38',      label: 'stairs',                             bucks: 1, icon: '🪜', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c39',      label: 'hydration coordinator',              bucks: 1, icon: '💧', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c40',      label: 'litter box',                         bucks: 3, icon: '🙀', active: false, required: false, days: [],           instructions: ['Dirty litter removed', 'Bags in garbage', 'Filled with clean litter'],  max_per_week: null },
  { id: 'c41',      label: 'librarian',                          bucks: 1, icon: '📚', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c42',      label: 'mop',                                bucks: 1, icon: '🧹', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c43',      label: 'wipe banisters',                     bucks: 1, icon: '🧽', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c44',      label: 'dust appliances',                    bucks: 1, icon: '🧽', active: false, required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c45',      label: 'pick up toys',                       bucks: 1, icon: '🪀', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c46',      label: 'zookeeper',                          bucks: 1, icon: '🐾', active: true,  required: false, days: [],           instructions: [],                                                                       max_per_week: null },
  { id: 'c47',      label: 'garbage cans put away',              bucks: 2, icon: '🗑️', active: true,  required: false, days: ['Tuesday'],  instructions: [],                                                                       max_per_week: null },
  { id: 'c48',      label: 'garage grandmaster',                 bucks: 2, icon: '🚲', active: true,  required: false, days: [],           instructions: ['Bikes', 'Scooters', 'Helmets', 'Garage closed'],                        max_per_week: null },
]
for (const ch of chores) {
  await db.query(
    `INSERT INTO chores (id, family_id, label, bucks, icon, active, required, days, instructions, max_per_week)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO NOTHING`,
    [ch.id, FAMILY_ID, ch.label, ch.bucks, ch.icon, ch.active, ch.required, ch.days, ch.instructions, ch.max_per_week]
  )
}
console.log('chores seeded')

// ── Routine definitions ───────────────────────────────────────────────────────
const ALL = ['school', 'weekend', 'summer', 'holiday']
const routineDefs = [
  // Paige — morning
  { id: 'p-bed630',    childId: 'child_paige', label: 'Stayed in bed till 6:30', icon: '🛏️', schedules: ALL,                                        time: 'morning', sort_order: 0  },
  { id: 'p-hair',      childId: 'child_paige', label: 'Brush hair',              icon: '💇', schedules: ALL,                                        time: 'morning', sort_order: 1  },
  { id: 'p-breakfast', childId: 'child_paige', label: 'Breakfast',               icon: '🥣', schedules: ALL,                                        time: 'morning', sort_order: 2  },
  { id: 'p-lunch',     childId: 'child_paige', label: 'Pack lunch',              icon: '🥪', schedules: ['school'],                                 time: 'morning', sort_order: 3  },
  { id: 'p-reading',   childId: 'child_paige', label: 'Reading',                 icon: '📖', schedules: ['weekend', 'holiday', 'summer'],           time: 'morning', sort_order: 4  },
  { id: 'p-outside-m', childId: 'child_paige', label: 'Outside time',            icon: '🌳', schedules: ['summer', 'weekend', 'holiday'],           time: 'morning', sort_order: 5  },
  // Paige — evening
  { id: 'p-outside-e', childId: 'child_paige', label: 'Outside time',            icon: '🌳', schedules: ['school'],                                 time: 'evening', sort_order: 6  },
  { id: 'p-backpack',  childId: 'child_paige', label: 'Backpack away',           icon: '🎒', schedules: ['school'],                                 time: 'evening', sort_order: 7  },
  { id: 'p-lunchbox',  childId: 'child_paige', label: 'Lunchbox in sink',        icon: '🍱', schedules: ['school'],                                 time: 'evening', sort_order: 8  },
  { id: 'p-shoes',     childId: 'child_paige', label: 'Shoes away',              icon: '👟', schedules: ALL,                                        time: 'evening', sort_order: 9  },
  { id: 'p-clothes',   childId: 'child_paige', label: 'Clothes changed',         icon: '👕', schedules: ALL,                                        time: 'evening', sort_order: 10 },
  { id: 'p-teeth',     childId: 'child_paige', label: 'Teeth flossed & brushed', icon: '🦷', schedules: ALL,                                        time: 'evening', sort_order: 11 },
  // Nolan — morning
  { id: 'n-bed630',    childId: 'child_nolan', label: 'Stayed in bed till 6:30', icon: '🛏️', schedules: ALL,                                        time: 'morning', sort_order: 0  },
  { id: 'n-hair',      childId: 'child_nolan', label: 'Brush hair',              icon: '💇', schedules: ALL,                                        time: 'morning', sort_order: 1  },
  { id: 'n-breakfast', childId: 'child_nolan', label: 'Breakfast',               icon: '🥣', schedules: ALL,                                        time: 'morning', sort_order: 2  },
  { id: 'n-lunch',     childId: 'child_nolan', label: 'Pack lunch',              icon: '🥪', schedules: ['school'],                                 time: 'morning', sort_order: 3  },
  { id: 'n-reading',   childId: 'child_nolan', label: 'Reading',                 icon: '📖', schedules: ['weekend', 'holiday', 'summer'],           time: 'morning', sort_order: 4  },
  { id: 'n-outside-m', childId: 'child_nolan', label: 'Outside time',            icon: '🌳', schedules: ['summer', 'weekend', 'holiday'],           time: 'morning', sort_order: 5  },
  // Nolan — evening
  { id: 'n-outside-e', childId: 'child_nolan', label: 'Outside time',            icon: '🌳', schedules: ['school'],                                 time: 'evening', sort_order: 6  },
  { id: 'n-backpack',  childId: 'child_nolan', label: 'Backpack away',           icon: '🎒', schedules: ['school'],                                 time: 'evening', sort_order: 7  },
  { id: 'n-lunchbox',  childId: 'child_nolan', label: 'Lunchbox in sink',        icon: '🍱', schedules: ['school'],                                 time: 'evening', sort_order: 8  },
  { id: 'n-shoes',     childId: 'child_nolan', label: 'Shoes away',              icon: '👟', schedules: ALL,                                        time: 'evening', sort_order: 9  },
  { id: 'n-clothes',   childId: 'child_nolan', label: 'Clothes changed',         icon: '👕', schedules: ALL,                                        time: 'evening', sort_order: 10 },
  { id: 'n-teeth',     childId: 'child_nolan', label: 'Teeth flossed & brushed', icon: '🦷', schedules: ALL,                                        time: 'evening', sort_order: 11 },
  // Jonah — morning
  { id: 'jo-bed630',    childId: 'child_jonah', label: 'Stayed in bed till 6:30', icon: '🛏️', schedules: ALL,                                       time: 'morning', sort_order: 0  },
  { id: 'jo-hair',      childId: 'child_jonah', label: 'Brush hair',              icon: '💇', schedules: ALL,                                       time: 'morning', sort_order: 1  },
  { id: 'jo-breakfast', childId: 'child_jonah', label: 'Breakfast',               icon: '🥣', schedules: ALL,                                       time: 'morning', sort_order: 2  },
  { id: 'jo-lunch',     childId: 'child_jonah', label: 'Pack lunch',              icon: '🥪', schedules: ['school'],                                time: 'morning', sort_order: 3  },
  { id: 'jo-reading',   childId: 'child_jonah', label: 'Reading',                 icon: '📖', schedules: ['weekend', 'holiday', 'summer'],          time: 'morning', sort_order: 4  },
  { id: 'jo-outside-m', childId: 'child_jonah', label: 'Outside time',            icon: '🌳', schedules: ['summer', 'weekend', 'holiday'],          time: 'morning', sort_order: 5  },
  // Jonah — evening
  { id: 'jo-outside-e', childId: 'child_jonah', label: 'Outside time',            icon: '🌳', schedules: ['school'],                                time: 'evening', sort_order: 6  },
  { id: 'jo-backpack',  childId: 'child_jonah', label: 'Backpack away',           icon: '🎒', schedules: ['school'],                                time: 'evening', sort_order: 7  },
  { id: 'jo-lunchbox',  childId: 'child_jonah', label: 'Lunchbox in sink',        icon: '🍱', schedules: ['school'],                                time: 'evening', sort_order: 8  },
  { id: 'jo-shoes',     childId: 'child_jonah', label: 'Shoes away',              icon: '👟', schedules: ALL,                                       time: 'evening', sort_order: 9  },
  { id: 'jo-clothes',   childId: 'child_jonah', label: 'Clothes changed',         icon: '👕', schedules: ALL,                                       time: 'evening', sort_order: 10 },
  { id: 'jo-teeth',     childId: 'child_jonah', label: 'Teeth flossed & brushed', icon: '🦷', schedules: ALL,                                       time: 'evening', sort_order: 11 },
]
for (const r of routineDefs) {
  await db.query(
    `INSERT INTO routine_defs (id, family_id, child_id, label, icon, schedules, time, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, FAMILY_ID, r.childId, r.label, r.icon, r.schedules, r.time, r.sort_order]
  )
}
console.log('routine_defs seeded')

// ── Zones ─────────────────────────────────────────────────────────────────────

const zones = [
  {
    id: 'zone_boys_bedroom',
    label: 'Boys Bedroom',
    icon: '🛏️',
    eligible_child_ids: ['child_nolan', 'child_jonah'],
    sort_order: 0,
    items: [
      { id: 'zi_boys_chest',  label: 'Bed treasure chest reset', active: false, sort_order: 0 },
      { id: 'zi_boys_trash',  label: 'Trash',                    active: true,  sort_order: 1 },
      { id: 'zi_boys_toys',   label: 'Toy room toys',            active: true,  sort_order: 2 },
      { id: 'zi_boys_clothes', label: 'Clothes',                 active: true,  sort_order: 3 },
    ],
  },
  {
    id: 'zone_paige_bedroom',
    label: 'Paige\'s Bedroom',
    icon: '🐱',
    eligible_child_ids: ['child_paige'],
    sort_order: 1,
    items: [
      { id: 'zi_paige_dressing', label: 'Dressing area',            active: true,  sort_order: 0 },
      { id: 'zi_paige_chest',    label: 'Bed treasure chest reset', active: false, sort_order: 1 },
      { id: 'zi_paige_cozy',     label: 'Cozy area',                active: true,  sort_order: 2 },
      { id: 'zi_paige_creative', label: 'Creative',                 active: true,  sort_order: 3 },
      { id: 'zi_paige_kittys',   label: 'Kittys',                   active: true,  sort_order: 4 },
      { id: 'zi_paige_swing',    label: 'Swing',                    active: true,  sort_order: 5 },
    ],
  },
  {
    id: 'zone_upstairs_bath',
    label: 'Upstairs Bathroom',
    icon: '🚿',
    eligible_child_ids: [],
    sort_order: 2,
    items: [
      { id: 'zi_ubath_counters', label: 'Counters',      active: true, sort_order: 0 },
      { id: 'zi_ubath_floors',   label: 'Floors',        active: true, sort_order: 1 },
      { id: 'zi_ubath_tp',       label: 'Toilet paper',  active: true, sort_order: 2 },
      { id: 'zi_ubath_toys',     label: 'Bathtub toys',  active: true, sort_order: 3 },
    ],
  },
  {
    id: 'zone_toy_room',
    label: 'Toy Room',
    icon: '🧸',
    eligible_child_ids: [],
    sort_order: 3,
    items: [
      { id: 'zi_toy_garbage', label: 'Garbage', active: true, sort_order: 0 },
      { id: 'zi_toy_silks',   label: 'Silks',   active: true, sort_order: 1 },
      { id: 'zi_toy_nuggets', label: 'Nuggets', active: true, sort_order: 2 },
      { id: 'zi_toy_books',   label: 'Books',   active: true, sort_order: 3 },
    ],
  },
  {
    id: 'zone_stairs',
    label: 'Stairs',
    icon: '🪜',
    eligible_child_ids: [],
    sort_order: 4,
    items: [],
  },
  {
    id: 'zone_tv_room',
    label: 'TV Room',
    icon: '📺',
    eligible_child_ids: [],
    sort_order: 5,
    items: [
      { id: 'zi_tv_garbage', label: 'Garbage', active: true, sort_order: 0 },
      { id: 'zi_tv_dishes',  label: 'Dishes',  active: true, sort_order: 1 },
      { id: 'zi_tv_pillows', label: 'Pillows', active: true, sort_order: 2 },
    ],
  },
  {
    id: 'zone_dining_room',
    label: 'Dining Room',
    icon: '🍽️',
    eligible_child_ids: [],
    sort_order: 6,
    items: [
      { id: 'zi_dining_dishes',  label: 'Dishes',      active: true, sort_order: 0 },
      { id: 'zi_dining_art',     label: 'Art supplies', active: true, sort_order: 1 },
      { id: 'zi_dining_toys',    label: 'Toys',        active: true, sort_order: 2 },
    ],
  },
  {
    id: 'zone_main_bath',
    label: 'Main Floor Bathroom',
    icon: '🚽',
    eligible_child_ids: [],
    sort_order: 7,
    items: [
      { id: 'zi_mbath_counters', label: 'Counters',     active: true, sort_order: 0 },
      { id: 'zi_mbath_floors',   label: 'Floors',       active: true, sort_order: 1 },
      { id: 'zi_mbath_tp',       label: 'Toilet paper', active: true, sort_order: 2 },
    ],
  },
]

for (const zone of zones) {
  await db.query(
    `INSERT INTO zones (id, family_id, label, icon, eligible_child_ids, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [zone.id, FAMILY_ID, zone.label, zone.icon, zone.eligible_child_ids, zone.sort_order]
  )
  for (const item of zone.items) {
    await db.query(
      `INSERT INTO micro_zones (id, zone_id, family_id, label, active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [item.id, zone.id, FAMILY_ID, item.label, item.active, item.sort_order]
    )
  }
}
console.log('zones seeded')

// ── Calendars ─────────────────────────────────────────────────────────────────
const calendars = [
  { id: 'cal-nolan',    name: 'Nolan',          url: 'https://p118-caldav.icloud.com/published/2/MTY5MzEyODk0NjE2OTMxMoW06AapHVD6ytlRsuhNuM2QSFSLiAKLLXlokGOQX-9c',                                              color: '#3177e8', childId: 'child_nolan' },
  { id: 'cal-paige',    name: 'Paige',          url: 'https://p118-caldav.icloud.com/published/2/MTY5MzEyODk0NjE2OTMxMoW06AapHVD6ytlRsuhNuM3tt4H2s8oHVICuxmZjlZw5',                                              color: '#ed02d6', childId: 'child_paige' },
  { id: 'cal-jonah',    name: 'Jonah',          url: 'https://p118-caldav.icloud.com/published/2/MTY5MzEyODk0NjE2OTMxMoW06AapHVD6ytlRsuhNuM2gPgqpt7fUeZrzensL0lj2cowNnhYkMQhYkMQwonO08nVhe5TwJQkCHuHE',          color: '#02e03a', childId: 'child_jonah' },
  { id: 'cal-family-1', name: 'Family',         url: 'https://p119-caldav.icloud.com/published/2/MTgwMDA2MTE0MDE4MDAwNsv_BNc9k7uQvjhj2Cr_-pBXT-pUG0Erd5OKpf_r8SfFXFirAmGcUI5Z66iKvpaLpg-UhoJn8TxFAttndI6VjDY', color: '#6319d1', childId: null },
  { id: 'cal-family-2', name: 'Family',         url: 'https://p118-caldav.icloud.com/published/2/MTY5MzEyODk0NjE2OTMxMoW06AapHVD6ytlRsuhNuM3aUSDgKsxbojz80oW22UFJVG9apmKzuW_87TBoHaqaAnG_5TTHSytYdzw_UIgZuSI', color: '#f20717', childId: null },
  { id: 'cal-jack',     name: 'Jack',           url: 'https://p118-caldav.icloud.com/published/2/MTY5MzEyODk0NjE2OTMxMoW06AapHVD6ytlRsuhNuM1noE7vMVFJ6FDNhx3s9tJgddgZjwGGmZ_zKSXgrIJx3spyJCuNhytSN4YJ9xaKdwg', color: '#fa8f02', childId: null },
  { id: 'cal-mom',      name: 'Mom',            url: 'https://p118-caldav.icloud.com/published/2/MTY5MzEyODk0NjE2OTMxMoW06AapHVD6ytlRsuhNuM3mscQRBX0IM5TRukxOMVYJt_8sVv0-K0AfpaKSHrTnyv8QAWkU2qCZIvxvh1LoYnA', color: '#4f1073', childId: null },
  { id: 'cal-nest',     name: 'Nest Collective', url: 'https://p118-caldav.icloud.com/published/2/MTY5MzEyODk0NjE2OTMxMoW06AapHVD6ytlRsuhNuM1bSB_CQH9nRkwYY6MQ9970SdANrhMJzCNI6uga-hg21grXO4ZQTLV5YVxtNeLUgQ0', color: '#fabd5a', childId: null },
]
for (const cal of calendars) {
  await db.query(
    `INSERT INTO calendars (id, family_id, name, url, color, child_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [cal.id, FAMILY_ID, cal.name, cal.url, cal.color, cal.childId]
  )
}
console.log('calendars seeded')

console.log(`\nFamily slug: ${slug}`)
console.log(`Set DEFAULT_FAMILY_SLUG=${slug} in your API .env`)

await db.end()

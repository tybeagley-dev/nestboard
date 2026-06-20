import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'
import { resolveChildId } from '../db/resolveChild.js'
import { notifyParent, notifyChild } from '../utils/push.js'

const router = Router()

const DAILY_FREE_MINS  = 30
const TOKENS_PER_10_MIN = 5   // 5 tokens buys 10 minutes
const ABSTINENCE_TOKENS = 15

router.use(requireFamily)

function calcFreeAvailable(row) {
  if (!row) return DAILY_FREE_MINS
  const today = new Date().toISOString().split('T')[0]
  const rowDate = row.daily_free_date instanceof Date
    ? row.daily_free_date.toISOString().split('T')[0]
    : String(row.daily_free_date)
  return rowDate === today ? Math.max(0, DAILY_FREE_MINS - Number(row.daily_free_used)) : DAILY_FREE_MINS
}

// GET /screen-time
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT stb.family_id, stb.purchased_balance, stb.daily_free_used, stb.daily_free_date,
            stb.updated_at, ch.name AS child
     FROM screen_time_balance stb
     JOIN children ch ON ch.id = stb.child_id
     WHERE stb.family_id = $1
     ORDER BY ch.sort_order`,
    [req.familyId]
  )
  const result = rows.map(row => {
    const dailyFreeAvailable = calcFreeAvailable(row)
    return {
      family_id:           row.family_id,
      child:               row.child,
      purchased_balance:   Number(row.purchased_balance),
      daily_free_available: dailyFreeAvailable,
      balance:             Number(row.purchased_balance) + dailyFreeAvailable,
      updated_at:          row.updated_at,
    }
  })
  res.json(result)
})

// POST /screen-time/:child/adjust  { delta }  — parent manual adjustment (today's free allotment)
router.post('/:child/adjust', async (req, res) => {
  const { delta } = req.body
  const childName = req.params.child
  if (isNaN(delta)) return res.status(400).json({ error: 'Invalid delta' })

  const childId = await resolveChildId(req.familyId, childName)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rows } = await db.query(
    `INSERT INTO screen_time_balance (family_id, child_id, daily_free_used, daily_free_date)
     VALUES ($1, $2, GREATEST(0, LEAST($3, -$4::integer)), CURRENT_DATE)
     ON CONFLICT (family_id, child_id) DO UPDATE
       SET daily_free_used = GREATEST(0, LEAST($3,
             CASE WHEN screen_time_balance.daily_free_date = CURRENT_DATE
                  THEN screen_time_balance.daily_free_used - $4::integer
                  ELSE -$4::integer
             END)),
           daily_free_date = CURRENT_DATE,
           updated_at = NOW()
     RETURNING purchased_balance, daily_free_used, daily_free_date`,
    [req.familyId, childId, DAILY_FREE_MINS, delta]
  )
  const free = calcFreeAvailable(rows[0])
  const balance = Number(rows[0].purchased_balance) + free
  broadcast('screen_time', { child: childName, balance }, req.familyId)
  res.json({ success: true, balance })
})

// POST /screen-time/:child/request-purchase  { minutesAmount }
router.post('/:child/request-purchase', async (req, res) => {
  const { minutesAmount } = req.body
  const childName = req.params.child

  if (!minutesAmount || isNaN(minutesAmount) || minutesAmount <= 0 || minutesAmount % 10 !== 0) {
    return res.status(400).json({ error: 'minutesAmount must be a positive multiple of 10' })
  }

  const childId = await resolveChildId(req.familyId, childName)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const tokensAmount = (minutesAmount / 10) * TOKENS_PER_10_MIN

  const { rows: tokenRows } = await db.query(
    `SELECT balance FROM token_balance WHERE family_id = $1 AND child_id = $2`,
    [req.familyId, childId]
  )
  const tokens = tokenRows.length ? Number(tokenRows[0].balance) : 0
  if (tokens < tokensAmount) return res.status(400).json({ error: 'Insufficient tokens' })

  const { rows: existing } = await db.query(
    `SELECT id FROM screentime_purchase_requests WHERE family_id = $1 AND child_id = $2 AND status = 'pending'`,
    [req.familyId, childId]
  )
  if (existing.length > 0) return res.status(409).json({ error: 'A request is already pending approval' })

  const { rows } = await db.query(
    `INSERT INTO screentime_purchase_requests (family_id, child_id, tokens_amount, minutes_amount)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [req.familyId, childId, tokensAmount, minutesAmount]
  )

  broadcast('screen_time_requests', { type: 'purchase_requested', child: childName }, req.familyId)
  notifyParent(req.familyId, { title: 'Screen time requested', body: `${childName} wants to trade ${tokensAmount} tokens for ${minutesAmount} minutes` })
  res.json({ success: true, requestId: rows[0].id, tokensAmount, minutesAmount })
})

// GET /screen-time/:child/pending-purchase-request
router.get('/:child/pending-purchase-request', async (req, res) => {
  const childId = await resolveChildId(req.familyId, req.params.child)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rows } = await db.query(
    `SELECT id, tokens_amount, minutes_amount, created_at
     FROM screentime_purchase_requests
     WHERE family_id = $1 AND child_id = $2 AND status = 'pending'
     LIMIT 1`,
    [req.familyId, childId]
  )
  res.json(rows[0] || null)
})

// GET /screen-time/purchase-requests  — parent view
router.get('/purchase-requests', async (req, res) => {
  const { rows } = await db.query(
    `SELECT spr.id, spr.created_at, spr.tokens_amount, spr.minutes_amount,
            ch.name AS child
     FROM screentime_purchase_requests spr
     JOIN children ch ON ch.id = spr.child_id
     WHERE spr.family_id = $1 AND spr.status = 'pending'
     ORDER BY spr.created_at ASC`,
    [req.familyId]
  )
  res.json(rows)
})

// POST /screen-time/purchase-requests/:id/approve
router.post('/purchase-requests/:id/approve', requireParent, async (req, res) => {
  const { rows: reqRows } = await db.query(
    `SELECT * FROM screentime_purchase_requests WHERE id = $1 AND family_id = $2 AND status = 'pending'`,
    [Number(req.params.id), req.familyId]
  )
  if (!reqRows.length) return res.status(404).json({ error: 'Request not found or already processed' })
  const request = reqRows[0]

  const { rows: tokenRows } = await db.query(
    `SELECT balance FROM token_balance WHERE family_id = $1 AND child_id = $2`,
    [req.familyId, request.child_id]
  )
  const tokens = tokenRows.length ? Number(tokenRows[0].balance) : 0
  if (tokens < request.tokens_amount) {
    return res.status(400).json({ error: 'Child no longer has sufficient tokens' })
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `UPDATE token_balance SET balance = GREATEST(0, balance - $1), updated_at = NOW()
       WHERE family_id = $2 AND child_id = $3`,
      [request.tokens_amount, req.familyId, request.child_id]
    )
    await client.query(
      `INSERT INTO screen_time_balance (family_id, child_id, purchased_balance)
       VALUES ($1, $2, $3)
       ON CONFLICT (family_id, child_id) DO UPDATE
         SET purchased_balance = screen_time_balance.purchased_balance + $3, updated_at = NOW()`,
      [req.familyId, request.child_id, request.minutes_amount]
    )
    await client.query(
      `INSERT INTO spend_events (family_id, child_id, amount, type) VALUES ($1, $2, $3, 'trade')`,
      [req.familyId, request.child_id, -request.tokens_amount]
    )
    await client.query(
      `UPDATE screentime_purchase_requests SET status = 'approved' WHERE id = $1`,
      [request.id]
    )

    await client.query('COMMIT')

    const { rows: childRows } = await db.query(`SELECT name FROM children WHERE id = $1`, [request.child_id])
    const childName = childRows[0]?.name
    broadcast('tokens', { child: childName }, req.familyId)
    broadcast('screen_time', { child: childName }, req.familyId)
    notifyChild(req.familyId, request.child_id, { title: 'Screen time approved!', body: `${request.minutes_amount} minutes added to your balance` })
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// POST /screen-time/purchase-requests/:id/reject
router.post('/purchase-requests/:id/reject', requireParent, async (req, res) => {
  const { rows } = await db.query(
    `UPDATE screentime_purchase_requests SET status = 'rejected'
     WHERE id = $1 AND family_id = $2 AND status = 'pending' RETURNING id`,
    [Number(req.params.id), req.familyId]
  )
  if (!rows.length) return res.status(404).json({ error: 'Request not found' })
  res.json({ success: true })
})

// GET /screen-time/abstinence-requests  — parent view
router.get('/abstinence-requests', async (req, res) => {
  const { rows } = await db.query(
    `SELECT sar.id, sar.date, sar.tokens_awarded, sar.status, sar.created_at,
            ch.name AS child
     FROM screentime_abstinence_requests sar
     JOIN children ch ON ch.id = sar.child_id
     WHERE sar.family_id = $1 AND sar.status = 'pending'
     ORDER BY sar.date DESC, ch.name ASC`,
    [req.familyId]
  )
  res.json(rows)
})

// POST /screen-time/abstinence-requests/:id/approve
router.post('/abstinence-requests/:id/approve', requireParent, async (req, res) => {
  const { rows: reqRows } = await db.query(
    `SELECT * FROM screentime_abstinence_requests WHERE id = $1 AND family_id = $2 AND status = 'pending'`,
    [Number(req.params.id), req.familyId]
  )
  if (!reqRows.length) return res.status(404).json({ error: 'Request not found' })
  const request = reqRows[0]

  await db.query(
    `UPDATE token_balance SET balance = balance + $1, updated_at = NOW()
     WHERE family_id = $2 AND child_id = $3`,
    [request.tokens_awarded, req.familyId, request.child_id]
  )
  await db.query(
    `INSERT INTO spend_events (family_id, child_id, amount, type) VALUES ($1, $2, $3, 'abstinence_reward')`,
    [req.familyId, request.child_id, request.tokens_awarded]
  )
  await db.query(
    `UPDATE screentime_abstinence_requests SET status = 'approved' WHERE id = $1`,
    [request.id]
  )

  const { rows: childRows } = await db.query(`SELECT name FROM children WHERE id = $1`, [request.child_id])
  broadcast('tokens', { child: childRows[0]?.name }, req.familyId)
  res.json({ success: true })
})

// POST /screen-time/abstinence-requests/:id/reject
router.post('/abstinence-requests/:id/reject', requireParent, async (req, res) => {
  const { rows } = await db.query(
    `UPDATE screentime_abstinence_requests SET status = 'rejected'
     WHERE id = $1 AND family_id = $2 AND status = 'pending' RETURNING id`,
    [Number(req.params.id), req.familyId]
  )
  if (!rows.length) return res.status(404).json({ error: 'Request not found' })
  res.json({ success: true })
})

// GET /screen-time/pending-count  — combined count for parent badge
router.get('/pending-count', async (req, res) => {
  const [{ rows: pr }, { rows: ar }] = await Promise.all([
    db.query(
      `SELECT COUNT(*) AS count FROM screentime_purchase_requests WHERE family_id = $1 AND status = 'pending'`,
      [req.familyId]
    ),
    db.query(
      `SELECT COUNT(*) AS count FROM screentime_abstinence_requests WHERE family_id = $1 AND status = 'pending'`,
      [req.familyId]
    ),
  ])
  res.json({ count: Number(pr[0].count) + Number(ar[0].count) })
})

export default router

// ── Background job: daily abstinence request creation ────────────────────────

async function processAbstinenceRequests() {
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  try {
    const { rows } = await db.query(
      `SELECT c.id AS child_id, c.family_id,
              stb.daily_free_used, stb.daily_free_date
       FROM children c
       JOIN screen_time_balance stb ON stb.child_id = c.id AND stb.family_id = c.family_id`
    )

    for (const row of rows) {
      const rowDate = row.daily_free_date instanceof Date
        ? row.daily_free_date.toISOString().split('T')[0]
        : String(row.daily_free_date)
      const usedFreeYesterday = rowDate === yesterdayStr && Number(row.daily_free_used) > 0
      if (usedFreeYesterday) continue

      await db.query(
        `INSERT INTO screentime_abstinence_requests (family_id, child_id, date, status, tokens_awarded)
         VALUES ($1, $2, $3, 'pending', $4)
         ON CONFLICT (family_id, child_id, date) DO NOTHING`,
        [row.family_id, row.child_id, yesterdayStr, ABSTINENCE_TOKENS]
      )
    }
  } catch (err) {
    console.error('Abstinence job error:', err.message)
  }
}

export async function startAbstinenceJob() {
  await processAbstinenceRequests()

  function scheduleNext() {
    const now = new Date()
    const nextMidnight = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1,
      0, 0, 30
    ))
    setTimeout(async () => {
      await processAbstinenceRequests()
      scheduleNext()
    }, nextMidnight - now)
  }
  scheduleNext()
}

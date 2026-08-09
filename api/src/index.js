import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { clerkMiddleware } from '@clerk/express'
import { db } from './db/client.js'

import choreRoutes from './routes/chores.js'
import tokensRoutes from './routes/tokens.js'
import screenTimeRoutes, { startAbstinenceJob } from './routes/screen-time.js'
import routineRoutes from './routes/routines.js'
import timerRoutes, { startExpiryJob } from './routes/timers.js'
import groceryRoutes from './routes/grocery.js'
import mealRoutes from './routes/meals.js'
import noteRoutes from './routes/notes.js'
import announcementRoutes from './routes/announcements.js'
import rewardsRoutes from './routes/rewards.js'
import authRoutes from './routes/auth.js'
import eventsRoutes from './routes/events.js'
import calendarRoutes from './routes/calendar.js'
import childrenRoutes from './routes/children.js'
import zoneRoutes from './routes/zones.js'
import pushRoutes from './routes/push.js'
import scheduleRoutes from './routes/schedule.js'
import adminRoutes from './routes/admin.js'

const app = express()

app.set('trust proxy', 1)

// CORS_ORIGINS is a comma-separated allowlist. Unset = allow any origin, which is
// the old behaviour — kept as the fallback so deploying this can't black out the
// dashboard before the variable is set in Railway. Set it and this tightens.
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean)
if (CORS_ORIGINS.length) {
  console.log(`CORS restricted to: ${CORS_ORIGINS.join(', ')}`)
} else {
  console.warn('CORS_ORIGINS unset — allowing all origins. Set it to the dashboard origin(s).')
}
app.use(cors({
  origin: CORS_ORIGINS.length ? CORS_ORIGINS : true,
  credentials: false,
}))

app.use(express.json())
app.use(clerkMiddleware())

// General rate limit — 300 requests per minute per IP
app.use(rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }))

// Strict limit on any request carrying a parent token — 20 per minute per IP
const parentLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // SSE ticket minting is exempt: an unlocked kiosk sends the parent token on
  // every request, and a reconnect storm would otherwise burn this budget and
  // start blocking real parent writes.
  skip: req => !req.headers['x-parent-token'] || req.path.startsWith('/events/'),
})
app.use(parentLimit)

app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ ok: true })
  } catch {
    res.status(500).json({ ok: false })
  }
})

app.use('/auth',          authRoutes)
app.use('/chores',        choreRoutes)
app.use('/tokens',        tokensRoutes)
app.use('/screen-time',   screenTimeRoutes)
app.use('/routines',      routineRoutes)
app.use('/timers',        timerRoutes)
app.use('/grocery',       groceryRoutes)
app.use('/meals',         mealRoutes)
app.use('/notes',         noteRoutes)
app.use('/announcements', announcementRoutes)
app.use('/rewards',       rewardsRoutes)
app.use('/events',        eventsRoutes)
app.use('/calendar',      calendarRoutes)
app.use('/children',      childrenRoutes)
app.use('/zones',         zoneRoutes)
app.use('/push',          pushRoutes)
app.use('/schedule',      scheduleRoutes)
app.use('/admin',         adminRoutes)

// Global error handler — any error surfaced to Express returns JSON instead of hanging.
app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err?.message ?? err)
  if (res.headersSent) return next(err)
  res.status(500).json({ error: 'Server error' })
})

// Safety net: a failed async handler or background job must never crash the whole API.
// A single bad request returning an error is fine; taking down every family's app is not.
process.on('unhandledRejection', reason => console.error('Unhandled rejection:', reason))
process.on('uncaughtException',  err    => console.error('Uncaught exception:', err?.message ?? err))

const PORT = process.env.PORT ?? 3001
const adminCount = (process.env.ADMIN_USER_IDS ?? '').split(',').filter(s => s.trim()).length
app.listen(PORT, () => console.log(`nestboard API running on port ${PORT} (${adminCount} admin id${adminCount === 1 ? '' : 's'})`))

startExpiryJob()
startAbstinenceJob()

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { db } from './db/client.js'

import choreRoutes from './routes/chores.js'
import bucksRoutes from './routes/bucks.js'
import screenTimeRoutes from './routes/screen-time.js'
import routineRoutes from './routes/routines.js'
import timerRoutes, { startExpiryJob } from './routes/timers.js'
import groceryRoutes from './routes/grocery.js'
import mealRoutes from './routes/meals.js'
import noteRoutes from './routes/notes.js'
import announcementRoutes from './routes/announcements.js'
import momStoreRoutes from './routes/mom-store.js'
import authRoutes from './routes/auth.js'
import eventsRoutes from './routes/events.js'
import calendarRoutes from './routes/calendar.js'
import childrenRoutes from './routes/children.js'
import zoneRoutes from './routes/zones.js'

const app = express()

app.set('trust proxy', 1)
app.use(cors())
app.use(express.json())

// General rate limit — 300 requests per minute per IP
app.use(rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }))

// Strict limit on any request carrying a parent token — 20 per minute per IP
const parentLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => !req.headers['x-parent-token'],
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
app.use('/bucks',         bucksRoutes)
app.use('/screen-time',   screenTimeRoutes)
app.use('/routines',      routineRoutes)
app.use('/timers',        timerRoutes)
app.use('/grocery',       groceryRoutes)
app.use('/meals',         mealRoutes)
app.use('/notes',         noteRoutes)
app.use('/announcements', announcementRoutes)
app.use('/mom-store',     momStoreRoutes)
app.use('/events',        eventsRoutes)
app.use('/calendar',      calendarRoutes)
app.use('/children',      childrenRoutes)
app.use('/zones',         zoneRoutes)

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`Hearthboard API running on port ${PORT}`))

startExpiryJob()

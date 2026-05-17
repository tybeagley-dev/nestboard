import { Router } from 'express'

const router = Router()

// POST /auth/parent  { pin } → { token } or 401
// For now the token IS the pin — simple shared secret.
// Swap for JWT when multi-tenant auth is added.
router.post('/parent', (req, res) => {
  const { pin } = req.body
  if (!pin || pin !== process.env.PARENT_PIN) {
    return res.status(401).json({ error: 'Invalid PIN' })
  }
  res.json({ token: process.env.PARENT_PIN })
})

export default router

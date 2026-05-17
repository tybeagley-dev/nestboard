export function requireParent(req, res, next) {
  const token = req.headers['x-parent-token']
  if (!token || token !== process.env.PARENT_PIN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

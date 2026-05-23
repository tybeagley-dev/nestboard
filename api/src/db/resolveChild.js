import { db } from './client.js'

export async function resolveChildId(familyId, childName) {
  if (!childName) return null
  const { rows } = await db.query(
    `SELECT id FROM children WHERE family_id = $1 AND name = $2`,
    [familyId, childName]
  )
  return rows[0]?.id ?? null
}

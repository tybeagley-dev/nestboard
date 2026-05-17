import { db } from './client.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8')

try {
  await db.query(sql)
  console.log('Migration complete.')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await db.end()
}

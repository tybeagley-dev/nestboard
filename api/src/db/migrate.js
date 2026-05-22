import { db } from './client.js'
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function run() {
  // Ensure migration tracking table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Run schema.sql (idempotent CREATE TABLE IF NOT EXISTS)
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  await db.query(schema)
  console.log('schema.sql applied')

  // Run numbered migration files in order, skipping already-applied ones
  const migrationsDir = join(__dirname, 'migrations')
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const { rows } = await db.query('SELECT 1 FROM _migrations WHERE name = $1', [file])
    if (rows.length) {
      console.log(`${file} already applied, skipping`)
      continue
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    await db.query(sql)
    await db.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
    console.log(`${file} applied`)
  }

  console.log('Migration complete.')
}

run().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
}).finally(() => db.end())

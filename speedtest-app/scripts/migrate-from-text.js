#!/usr/bin/env node

import os from 'os'
import path from 'path'
import fs from 'fs'
import { execFileSync } from 'child_process'

const ENTRY_SEPARATOR = '============================================'

function parseArgs(argv) {
  const args = {
    input: path.join(os.homedir(), '.speedtest_res.txt'),
    db: path.join(os.homedir(), '.local', 'share', 'SpeedtestMonitor', 'data', 'speedtest.db'),
    dryRun: false,
    limit: null
  }

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--dry-run') {
      args.dryRun = true
    } else if (token === '--input' && argv[i + 1]) {
      args.input = argv[i + 1]
      i += 1
    } else if (token === '--db' && argv[i + 1]) {
      args.db = argv[i + 1]
      i += 1
    } else if (token === '--limit' && argv[i + 1]) {
      const n = parseInt(argv[i + 1], 10)
      if (!Number.isNaN(n) && n > 0) args.limit = n
      i += 1
    }
  }

  return args
}

function parseServerLine(serverLine) {
  const match = serverLine.match(/^(.+?)\s*-\s*(.+?)\s*\(id:\s*([^)]+)\)$/)
  if (!match) {
    return {
      server_name: serverLine.trim() || null,
      server_location: null,
      server_id: null
    }
  }

  return {
    server_name: match[1].trim(),
    server_location: match[2].trim(),
    server_id: match[3].trim()
  }
}

function parsePacketLoss(line) {
  if (!line) return null
  if (line.toLowerCase().includes('not available')) return null
  const match = line.match(/packet\s+loss:\s*([\d.]+)\s*%/i)
  return match ? Number.parseFloat(match[1]) : null
}

function normalizeTimestamp(rawTs) {
  if (!rawTs) return null
  const normalized = rawTs.trim().replace(' ', 'T')
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function parseEntry(block) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return null

  const valueAfter = (prefix) => {
    const line = lines.find((l) => l.startsWith(prefix))
    if (!line) return null
    return line.slice(prefix.length).trim() || null
  }

  const numberAfter = (prefix) => {
    const line = lines.find((l) => l.startsWith(prefix))
    if (!line) return null
    const match = line.match(/([\d.]+)/)
    return match ? Number.parseFloat(match[1]) : null
  }

  const timestampRaw = valueAfter('Timestamp:')
  const timestamp = normalizeTimestamp(timestampRaw)
  if (!timestamp) return null

  const serverRaw = valueAfter('Server:')
  const serverInfo = serverRaw ? parseServerLine(serverRaw) : {
    server_name: null,
    server_location: null,
    server_id: null
  }

  const wifiName = valueAfter('Wi-Fi Name:') || valueAfter('WiFi Name:')

  const result = {
    timestamp,
    download_mbps: numberAfter('Download:'),
    upload_mbps: numberAfter('Upload:'),
    ping_ms: numberAfter('Idle Latency:'),
    jitter_ms: numberAfter('Jitter:'),
    isp: valueAfter('ISP:'),
    hostname: valueAfter('Hostname:'),
    user_name: valueAfter('User:'),
    internal_ip: valueAfter('Local IP:'),
    uptime: valueAfter('Uptime:'),
    wifi_name: wifiName && wifiName !== 'Not Connected' ? wifiName : null,
    interface: wifiName && wifiName !== 'Not Connected' ? 'WiFi' : 'Ethernet',
    packet_loss_percent: parsePacketLoss(lines.find((l) => l.toLowerCase().startsWith('packet loss:'))),
    result_url: valueAfter('Result URL:'),
    test_type: 'legacy-text',
    source: 'text-import',
    error_message: null,
    raw_data: block
  }

  return {
    ...result,
    ...serverInfo
  }
}

async function getColumns(db) {
  const out = execFileSync('sqlite3', [db, 'PRAGMA table_info(speedtest_results);'], { encoding: 'utf8' })
  const names = out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|')[1])
    .filter(Boolean)
  return new Set(names)
}

function buildInsert(columns, row) {
  const availableKeys = Object.keys(row).filter((k) => columns.has(k))
  const esc = (v) => {
    if (v === null || v === undefined) return 'NULL'
    if (typeof v === 'number') return String(v)
    return `'${String(v).replace(/'/g, "''")}'`
  }
  const valueExpr = availableKeys.map((k) => esc(row[k])).join(', ')
  const sql = `INSERT INTO speedtest_results (${availableKeys.join(', ')}) VALUES (${valueExpr});`
  return sql
}

async function existsRecord(db, columns, row) {
  const esc = (v) => String(v ?? '').replace(/'/g, "''")

  if (columns.has('result_url') && row.result_url) {
    const q = `SELECT id FROM speedtest_results WHERE result_url = '${esc(row.result_url)}' LIMIT 1;`
    const out = execFileSync('sqlite3', [db, q], { encoding: 'utf8' }).trim()
    return out.length > 0
  }

  const q = `SELECT id FROM speedtest_results WHERE timestamp = '${esc(row.timestamp)}' AND download_mbps = ${row.download_mbps ?? 'NULL'} AND upload_mbps = ${row.upload_mbps ?? 'NULL'} AND ping_ms = ${row.ping_ms ?? 'NULL'} LIMIT 1;`
  const out = execFileSync('sqlite3', [db, q], { encoding: 'utf8' }).trim()
  return out.length > 0
}

async function main() {
  const args = parseArgs(process.argv)

  if (!fs.existsSync(args.input)) {
    throw new Error(`Input file not found: ${args.input}`)
  }

  const dbDir = path.dirname(args.db)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  execFileSync('sqlite3', [args.db, 'PRAGMA journal_mode = WAL;'], { encoding: 'utf8' })
  execFileSync('sqlite3', [args.db, 'PRAGMA synchronous = NORMAL;'], { encoding: 'utf8' })

  const columns = await getColumns(args.db)
  const fileContent = fs.readFileSync(args.input, 'utf8')
  const blocks = fileContent
    .split(ENTRY_SEPARATOR)
    .map((b) => b.trim())
    .filter(Boolean)

  const targetBlocks = args.limit ? blocks.slice(0, args.limit) : blocks

  let parsed = 0
  let inserted = 0
  let skipped = 0
  let parseErrors = 0

  try {
    for (const block of targetBlocks) {
      const row = parseEntry(block)
      if (!row || !row.timestamp) {
        parseErrors += 1
        continue
      }

      // Existing table has NOT NULL constraints for these three metrics.
      if (row.download_mbps === null || row.upload_mbps === null || row.ping_ms === null) {
        skipped += 1
        continue
      }

      parsed += 1

      if (await existsRecord(args.db, columns, row)) {
        skipped += 1
        continue
      }

      if (!args.dryRun) {
        const statement = buildInsert(columns, row)
        execFileSync('sqlite3', [args.db, statement], { encoding: 'utf8' })
      }

      inserted += 1
    }

  } catch (error) {
    throw error
  }

  console.log('Migration summary:')
  console.log(`  Input file: ${args.input}`)
  console.log(`  Database: ${args.db}`)
  console.log(`  Entries scanned: ${targetBlocks.length}`)
  console.log(`  Parsed entries: ${parsed}`)
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Skipped (already exists): ${skipped}`)
  console.log(`  Parse errors: ${parseErrors}`)
  console.log(`  Mode: ${args.dryRun ? 'DRY RUN' : 'WRITE'}`)
}

main().catch((error) => {
  console.error('Migration failed:', error.message)
  process.exit(1)
})

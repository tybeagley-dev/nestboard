// Safari < 16.2 (incl. iPadOS 15.8, the security-only branch older iPads are stuck on)
// has no color-mix(), and drops the whole declaration rather than degrading. These
// helpers do the blend in JS so dynamic child/calendar colors can ship as plain vars.

const BG = '#F2EDE4'
const SURFACE = '#FFFCF8'
const BORDER = '#E5D9C8'
const TEXT_PRIMARY = '#2A1F14'

function parseHex(hex) {
  if (typeof hex !== 'string') return null
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

// color-mix(in srgb, color pct%, transparent)
export function tint(color, pct) {
  const rgb = parseHex(color)
  if (!rgb) return null
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Math.round(pct) / 100})`
}

// color-mix(in srgb, color pct%, base) for an opaque base
export function mix(color, pct, base) {
  const a = parseHex(color)
  const b = parseHex(base)
  if (!a || !b) return null
  const w = pct / 100
  return `#${a.map((v, i) => Math.round(v * w + b[i] * (1 - w)).toString(16).padStart(2, '0')).join('')}`
}

// Returns {} for a missing/malformed color so the CSS var() fallbacks apply, matching
// the pre-existing behavior of `var(--child-color, …)`.
export function childColorVars(color) {
  if (!parseHex(color)) return {}
  return {
    '--child-color': color,
    '--child-card-bg': mix(color, 30, BG),
    '--child-soft': tint(color, 10),
    '--child-edge': tint(color, 50),
    '--child-press': tint(color, 18),
    '--child-ink': mix(color, 80, TEXT_PRIMARY),
    '--child-panel-bg': mix(color, 12, SURFACE),
    '--child-panel-border': mix(color, 25, BORDER),
  }
}

export function calColorVars(color) {
  if (!parseHex(color)) return {}
  return { '--cal-color': color, '--cal-soft': tint(color, 15) }
}

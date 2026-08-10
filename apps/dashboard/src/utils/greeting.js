// The board headline is "Good Morning," / "<second line>". `greeting` holds only
// that second line; NULL/empty derives it from the family name, which is what the
// board rendered before it was editable.
//
// Both the live preview and GreetingSection call this, so they can't drift.
export function greetingLine(family) {
  const custom = family?.greeting?.trim()
  if (custom) return custom
  return family?.name ? `${family.name}!` : ''
}

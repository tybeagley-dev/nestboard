export default function TokenBadge({ amount, size = 'md' }) {
  return (
    <span className={`token-badge token-badge-${size}`}>
      {amount}
    </span>
  )
}

import { User } from 'lucide-react'
import { ICON_MAP, DEFAULT_ICON } from '../config/childIcons'

// Renders a child's avatar icon by stored name. Defaults to a neutral user icon
// for missing/unknown names. Color defaults to white (icons sit on the child's
// colored avatar circle); pass color to override.
export default function ChildIcon({ name, size = 24, color = '#fff', strokeWidth = 2, ...rest }) {
  const Icon = ICON_MAP[name] ?? ICON_MAP[DEFAULT_ICON] ?? User
  return <Icon size={size} color={color} strokeWidth={strokeWidth} {...rest} />
}

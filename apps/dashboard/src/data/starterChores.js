// A neutral starting set, offered on the chores step and the empty Chores tab.
// Deliberately plain: the point is to turn "compose a chore list from nothing"
// into "edit this list", which is a much cheaper task for a parent who has
// already spent twenty minutes in setup.
//
// Kept boring on purpose — families rename these to suit. The playful examples in
// ParentChoresTab's guide exist to show that renaming is encouraged.
//
// Two-token chores are the longer or less pleasant ones. Nothing here is
// `required`, so every one lands in the spinner pool; families promote the ones
// they want assigned automatically.
export const STARTER_CHORES = [
  { label: 'Make your bed',        icon: '🛏️', tokens: 1 },
  { label: 'Dishes',               icon: '🍽️', tokens: 1 },
  { label: 'Vacuum',               icon: '🧹', tokens: 2 },
  { label: 'Pick up toys',         icon: '🧸', tokens: 1 },
  { label: 'Take out the trash',   icon: '🗑️', tokens: 1 },
  { label: 'Wipe the counters',    icon: '🧽', tokens: 1 },
  { label: 'Fold laundry',         icon: '🧺', tokens: 2 },
  { label: 'Put laundry away',     icon: '👕', tokens: 1 },
  { label: 'Clean the bathroom',   icon: '🚿', tokens: 2 },
  { label: 'Feed the pets',        icon: '🐾', tokens: 1 },
  { label: 'Tidy your room',       icon: '🚪', tokens: 2 },
  { label: 'Set the table',        icon: '🍴', tokens: 1 },
]

// Shown (not loadable) in the chores guide. These are real, and the pattern in
// them is the point: each one is a job title rather than a task, so the child
// holds a post for the week instead of being handed a task list.
export const PLAYFUL_EXAMPLES = [
  { label: 'Mailman',            icon: '📬' },
  { label: 'Librarian',          icon: '📚' },
  { label: 'Shoe Sheriff',       icon: '👟' },
  { label: 'Garage Grandmaster', icon: '🧰' },
  { label: 'Tech Manager',       icon: '🔌' },
]

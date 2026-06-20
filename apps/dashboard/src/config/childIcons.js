// Curated kid-friendly icon set for child avatars. DB stores the kebab `name`;
// ChildIcon and the picker both read from here. Keep names stable — they're
// persisted in children.icon.
import {
  Cat, Dog, Rabbit, Bird, Fish, Turtle, Squirrel, Bug, Snail, Bot,
  Rocket, Star, Sun, Moon, Cloud, Rainbow, Sparkles, Zap,
  Volleyball, Trophy, Dumbbell, Gamepad2, Drum, Guitar, Music,
  Flower, Leaf, MountainSnow, Waves, Tent,
  Car, Bike, Plane, Train, Sailboat,
  Apple, IceCreamCone, Cookie, Candy, Pizza, Gift, Crown, Ghost, Heart, Smile, Palette, BookOpen,
  User,
} from 'lucide-react'

export const CHILD_ICONS = [
  { name: 'cat', Icon: Cat }, { name: 'dog', Icon: Dog }, { name: 'rabbit', Icon: Rabbit },
  { name: 'bird', Icon: Bird }, { name: 'fish', Icon: Fish }, { name: 'turtle', Icon: Turtle },
  { name: 'squirrel', Icon: Squirrel }, { name: 'bug', Icon: Bug }, { name: 'snail', Icon: Snail },
  { name: 'bot', Icon: Bot },
  { name: 'rocket', Icon: Rocket }, { name: 'star', Icon: Star }, { name: 'sun', Icon: Sun },
  { name: 'moon', Icon: Moon }, { name: 'cloud', Icon: Cloud }, { name: 'rainbow', Icon: Rainbow },
  { name: 'sparkles', Icon: Sparkles }, { name: 'zap', Icon: Zap },
  { name: 'volleyball', Icon: Volleyball }, { name: 'trophy', Icon: Trophy }, { name: 'dumbbell', Icon: Dumbbell },
  { name: 'gamepad-2', Icon: Gamepad2 }, { name: 'drum', Icon: Drum }, { name: 'guitar', Icon: Guitar },
  { name: 'music', Icon: Music },
  { name: 'flower', Icon: Flower }, { name: 'leaf', Icon: Leaf }, { name: 'mountain-snow', Icon: MountainSnow },
  { name: 'waves', Icon: Waves }, { name: 'tent', Icon: Tent },
  { name: 'car', Icon: Car }, { name: 'bike', Icon: Bike }, { name: 'plane', Icon: Plane },
  { name: 'train', Icon: Train }, { name: 'sailboat', Icon: Sailboat },
  { name: 'apple', Icon: Apple }, { name: 'ice-cream-cone', Icon: IceCreamCone }, { name: 'cookie', Icon: Cookie },
  { name: 'candy', Icon: Candy }, { name: 'pizza', Icon: Pizza }, { name: 'gift', Icon: Gift },
  { name: 'crown', Icon: Crown }, { name: 'ghost', Icon: Ghost }, { name: 'heart', Icon: Heart },
  { name: 'smile', Icon: Smile }, { name: 'palette', Icon: Palette }, { name: 'book-open', Icon: BookOpen },
]

export const DEFAULT_ICON = 'user'

export const ICON_MAP = Object.fromEntries(CHILD_ICONS.map(i => [i.name, i.Icon]))
ICON_MAP[DEFAULT_ICON] = User

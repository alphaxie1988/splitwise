import {
  Utensils, Wine, PartyPopper, BedDouble, Car, Plane,
  Train, ShoppingBag, ArrowLeftRight, Package,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CategoryId } from './types'

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  meal:          Utensils,
  drink:         Wine,
  entertainment: PartyPopper,
  hotel:         BedDouble,
  taxi:          Car,
  flight:        Plane,
  train:         Train,
  shopping:      ShoppingBag,
  transfer:      ArrowLeftRight,
  misc:          Package,
}

export function CategoryIcon({ id, size = 18 }: { id: CategoryId; size?: number }) {
  const Icon = CATEGORY_ICONS[id] ?? Package
  return <Icon size={size} />
}

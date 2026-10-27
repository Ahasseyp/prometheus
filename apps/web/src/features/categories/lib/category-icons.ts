import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  Briefcase,
  Bus,
  Car,
  Clapperboard,
  Ellipsis,
  Flame,
  Fuel,
  HeartPulse,
  Home,
  Laptop,
  Lightbulb,
  Percent,
  PiggyBank,
  ShoppingCart,
  Tag,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';

// Curated icon set for categories, keyed by the kebab-case Lucide name stored
// on the Category. The picker in the category form offers exactly these.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'banknote-arrow-down': BanknoteArrowDown,
  'banknote-arrow-up': BanknoteArrowUp,
  briefcase: Briefcase,
  bus: Bus,
  car: Car,
  clapperboard: Clapperboard,
  ellipsis: Ellipsis,
  flame: Flame,
  fuel: Fuel,
  'heart-pulse': HeartPulse,
  home: Home,
  laptop: Laptop,
  lightbulb: Lightbulb,
  percent: Percent,
  'piggy-bank': PiggyBank,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  wifi: Wifi,
  zap: Zap,
};

export const CATEGORY_ICON_KEYS: string[] = Object.keys(CATEGORY_ICONS);

export function categoryIcon(icon: string | null): LucideIcon {
  if (icon !== null && icon in CATEGORY_ICONS) {
    return CATEGORY_ICONS[icon];
  }
  return Tag;
}

import {
  BookOpen,
  Briefcase,
  Code,
  Coffee,
  Dumbbell,
  GraduationCap,
  Heart,
  House,
  Leaf,
  Music,
  Palette,
  Rocket,
  ShoppingCart,
  Sparkles,
  Sun,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { SpaceColor } from '../data/types';

/** Soft, calm palette. None of these read as warning/alarm colors. */
export const SPACE_COLORS: Record<SpaceColor, { label: string; hex: string }> = {
  sage: { label: 'Sage', hex: '#7FA88B' },
  sky: { label: 'Sky', hex: '#7AA7C7' },
  lavender: { label: 'Lavender', hex: '#A497C9' },
  apricot: { label: 'Apricot', hex: '#E0A878' },
  blush: { label: 'Blush', hex: '#D49BB0' },
  sand: { label: 'Sand', hex: '#C2AE87' },
  teal: { label: 'Teal', hex: '#6AAFA8' },
  slate: { label: 'Slate', hex: '#8E99A8' },
};

export const SPACE_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  briefcase: { label: 'Briefcase', Icon: Briefcase },
  home: { label: 'Home', Icon: House },
  cart: { label: 'Shopping cart', Icon: ShoppingCart },
  rocket: { label: 'Rocket', Icon: Rocket },
  heart: { label: 'Heart', Icon: Heart },
  book: { label: 'Book', Icon: BookOpen },
  dumbbell: { label: 'Dumbbell', Icon: Dumbbell },
  palette: { label: 'Palette', Icon: Palette },
  leaf: { label: 'Leaf', Icon: Leaf },
  coffee: { label: 'Coffee', Icon: Coffee },
  music: { label: 'Music', Icon: Music },
  code: { label: 'Code', Icon: Code },
  school: { label: 'Graduation cap', Icon: GraduationCap },
  wrench: { label: 'Wrench', Icon: Wrench },
  sparkles: { label: 'Sparkles', Icon: Sparkles },
  sun: { label: 'Sun', Icon: Sun },
};

export function spaceHex(color: SpaceColor | undefined): string {
  return SPACE_COLORS[color ?? 'slate']?.hex ?? SPACE_COLORS.slate.hex;
}

export function SpaceIcon({
  icon,
  className = 'size-4',
}: {
  icon: string | undefined;
  className?: string;
}) {
  const Icon = SPACE_ICONS[icon ?? '']?.Icon ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}

/** A colored rounded badge with the space's icon. */
export function SpaceBadge({
  color,
  icon,
  size = 'md',
}: {
  color: SpaceColor | undefined;
  icon: string | undefined;
  size?: 'sm' | 'md' | 'lg';
}) {
  const hex = spaceHex(color);
  const box = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-10' : 'size-8';
  const ic = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4';
  return (
    <span
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-lg`}
      style={{ backgroundColor: hex + '2e', color: hex }}
    >
      <SpaceIcon icon={icon} className={ic} />
    </span>
  );
}

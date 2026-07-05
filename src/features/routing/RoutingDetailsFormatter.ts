import { RouteExtras } from '../../types/common';

export interface ProfileBadge {
  icon: string;
  label: string;
}

export interface RouteWarning {
  icon: string;
  label: string;
}

const PROFILE_BADGES: Record<string, ProfileBadge> = {
  'driving-car': { icon: 'fa-solid fa-car', label: 'Normalfahrt' },
  'driving-emergency': { icon: 'fa-solid fa-truck-medical', label: 'Blaulichtfahrt' },
};

export function getProfileBadge(profile: string): ProfileBadge {
  return PROFILE_BADGES[profile] ?? { icon: 'fa-solid fa-route', label: profile };
}

export function getRouteWarnings(extras: RouteExtras | undefined): RouteWarning[] {
  if (!extras) return [];

  const warnings: RouteWarning[] = [];

  const tollAmount = extras.tollways?.summary.find((s) => s.value === 1)?.amount ?? 0;
  if (tollAmount > 0) {
    warnings.push({ icon: 'fa-solid fa-triangle-exclamation', label: 'Enthält Mautstraßen' });
  }

  const restrictedAmount = extras.roadaccessrestrictions?.summary
    .filter((s) => s.value !== 0)
    .reduce((sum, s) => sum + s.amount, 0) ?? 0;
  if (restrictedAmount > 0) {
    warnings.push({ icon: 'fa-solid fa-triangle-exclamation', label: 'Zufahrtsbeschränkungen auf der Strecke' });
  }

  return warnings;
}

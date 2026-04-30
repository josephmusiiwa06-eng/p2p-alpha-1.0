// ============================================================
// P2P Alpha — Shared utilities
// ============================================================

import { type ClassValue, clsx } from 'clsx'
import { OverallRating } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  })
}

export function calcAgeYears(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export function ratingToColorClass(rating: OverallRating | string) {
  if (rating === 'Excellent') return 'badge-excellent'
  if (rating === 'On track')  return 'badge-ontrack'
  return 'badge-developing'
}

export function ratingToAvatarBg(rating: OverallRating | string) {
  if (rating === 'Excellent') return 'var(--good-bg)'
  if (rating === 'On track')  return 'var(--avg-bg)'
  return 'var(--needs-bg)'
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function motorScoreLabel(score: number): OverallRating {
  if (score >= 63) return 'Excellent'
  if (score >= 38) return 'On track'
  return 'Developing'
}

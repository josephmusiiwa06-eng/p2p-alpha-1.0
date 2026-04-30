// ============================================================
// P2P Alpha — Scoring Engine
// Converts raw test values → ratings → motor score
// ============================================================

import {
  AgeBand, TestInput, TestScore, ScoringResult,
  Rating, OverallRating, TestName
} from '@/types'

// ─────────────────────────────────────────
// Age band thresholds
// [good_threshold, average_min]
// For time-based tests (lower = better): [fast_cutoff, slow_cutoff]
// ─────────────────────────────────────────
const THRESHOLDS: Record<TestName, Record<AgeBand, [number, number]>> = {
  balance: {        // seconds (higher = better)
    3: [5, 3],
    4: [7, 4],
    5: [10, 6],
    6: [14, 9],
  },
  shuttle_run: {    // seconds (lower = better)
    3: [12, 16],
    4: [10, 14],
    5: [9, 12],
    6: [8, 11],
  },
  throw_catch: {    // score 0–10 (higher = better)
    3: [5, 3],
    4: [6, 4],
    5: [7, 5],
    6: [8, 6],
  },
  jump: {           // cm (higher = better)
    3: [60, 40],
    4: [75, 55],
    5: [90, 70],
    6: [105, 80],
  },
}

const TARGET_LABELS: Record<TestName, Record<AgeBand, string>> = {
  balance:     { 3: '≥ 5s', 4: '≥ 7s', 5: '≥ 10s', 6: '≥ 14s' },
  shuttle_run: { 3: '≤ 12s', 4: '≤ 10s', 5: '≤ 9s', 6: '≤ 8s' },
  throw_catch: { 3: '5+ / 10', 4: '6+ / 10', 5: '7+ / 10', 6: '8+ / 10' },
  jump:        { 3: '60cm+', 4: '75cm+', 5: '90cm+', 6: '105cm+' },
}

const UNITS: Record<TestName, string> = {
  balance: 'seconds',
  shuttle_run: 'seconds',
  throw_catch: 'score',
  jump: 'cm',
}

// Time-based tests where lower is better
const LOWER_IS_BETTER: TestName[] = ['shuttle_run']

// ─────────────────────────────────────────
// Rate a single test value
// ─────────────────────────────────────────
export function rateTest(
  test: TestName,
  value: number,
  ageBand: AgeBand
): { rating: Rating; score_points: number } {
  const [goodThreshold, avgMin] = THRESHOLDS[test][ageBand]

  if (LOWER_IS_BETTER.includes(test)) {
    if (value <= goodThreshold) return { rating: 'Good', score_points: 3 }
    if (value <= avgMin)        return { rating: 'Average', score_points: 2 }
    return { rating: 'Needs work', score_points: 1 }
  } else {
    if (value >= goodThreshold) return { rating: 'Good', score_points: 3 }
    if (value >= avgMin)        return { rating: 'Average', score_points: 2 }
    return { rating: 'Needs work', score_points: 1 }
  }
}

// ─────────────────────────────────────────
// Get age band from age in years
// ─────────────────────────────────────────
export function getAgeBand(ageYears: number): AgeBand {
  if (ageYears < 4) return 3
  if (ageYears < 5) return 4
  if (ageYears < 6) return 5
  return 6
}

// ─────────────────────────────────────────
// Calculate age from date of birth
// ─────────────────────────────────────────
export function calcAge(dob: string): { years: number; months: number } {
  const birth = new Date(dob)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0) { years--; months += 12 }
  return { years, months: years * 12 + months }
}

// ─────────────────────────────────────────
// Convert total points to motor score (0–100)
// Points range: 4 (all Needs work) → 12 (all Good)
// ─────────────────────────────────────────
export function calcMotorScore(totalPoints: number): number {
  return Math.round(((totalPoints - 4) / 8) * 100)
}

// ─────────────────────────────────────────
// Map motor score to overall rating
// ─────────────────────────────────────────
export function getOverallRating(motorScore: number): OverallRating {
  if (motorScore >= 63) return 'Excellent'
  if (motorScore >= 38) return 'On track'
  return 'Developing'
}

// ─────────────────────────────────────────
// Full scoring pipeline
// ─────────────────────────────────────────
export function scoreAssessment(
  inputs: TestInput,
  ageBand: AgeBand
): ScoringResult {
  const baseTests: Array<{ test: TestName; raw_value: number; unit: string }> = [
    { test: 'balance',     raw_value: inputs.balance,     unit: UNITS.balance },
    { test: 'shuttle_run', raw_value: inputs.shuttle_run, unit: UNITS.shuttle_run },
    { test: 'throw_catch', raw_value: inputs.throw_catch, unit: UNITS.throw_catch },
    { test: 'jump',        raw_value: inputs.jump,        unit: UNITS.jump },
  ]

  const tests: TestScore[] = baseTests.map(t => {
    const { rating, score_points } = rateTest(t.test, t.raw_value, ageBand)
    return {
      ...t,
      rating,
      score_points,
      target: TARGET_LABELS[t.test][ageBand],
    }
  })

  const total_points = tests.reduce((sum, t) => sum + t.score_points, 0)
  const motor_score = calcMotorScore(total_points)
  const overall_rating = getOverallRating(motor_score)

  return { tests, total_points, motor_score, overall_rating }
}

// ─────────────────────────────────────────
// Generate plain-language report text
// ─────────────────────────────────────────
export function generateReportText(
  childName: string,
  result: ScoringResult,
  ageYears: number
) {
  const firstName = childName.split(' ')[0]
  const good    = result.tests.filter(t => t.rating === 'Good')
  const needs   = result.tests.filter(t => t.rating === 'Needs work')
  const average = result.tests.filter(t => t.rating === 'Average')

  const testLabels: Record<TestName, string> = {
    balance:     'balance',
    shuttle_run: 'speed and agility',
    throw_catch: 'throwing and catching',
    jump:        'jumping power',
  }

  const strengthDescriptions: Record<TestName, string> = {
    balance:     `${firstName} can hold a one-legged balance well — this shows great body control and concentration for age ${ageYears}.`,
    shuttle_run: `${firstName} moves quickly and changes direction smoothly — a sign that legs and coordination are working well together.`,
    throw_catch: `${firstName} is tracking and catching the ball confidently — hand-eye coordination is developing strongly.`,
    jump:        `${firstName} jumps with power and uses arms well for distance — leg strength is a real standout.`,
  }

  const improveDescriptions: Record<TestName, string> = {
    balance:     `${firstName} is still building the ability to hold a balance on one leg. This is completely normal and improves quickly with regular practice.`,
    shuttle_run: `${firstName} is developing speed and quick direction changes. Simple running games at home will help a lot.`,
    throw_catch: `${firstName} is still building confidence tracking and catching a ball. Slower-moving objects like balloons are a great start.`,
    jump:        `${firstName} is developing jumping power and coordination. Hopping and skipping games will strengthen this quickly.`,
  }

  const recommendations: Record<TestName, string> = {
    balance:     `"Flamingo challenge": Stand on one foot while brushing teeth. Gradually increase the time. Try on both feet.`,
    shuttle_run: `"Tag and run": Set up two spots about 5m apart and race between them. Add direction changes to build agility.`,
    throw_catch: `"Balloon catch": Throw a balloon back and forth — its slow movement gives ${firstName} time to track and position hands.`,
    jump:        `"Frog jumps": Mark two lines on the floor and practice jumping from one to the other with both feet together.`,
  }

  const goodTests = good.map(t => testLabels[t.test])
  const strengthsText = good.length > 0
    ? good.map(t => strengthDescriptions[t.test]).join(' ')
    : `${firstName} is working hard across all areas and showing steady effort.`

  const improveText = needs.length > 0
    ? needs.map(t => improveDescriptions[t.test]).join(' ')
    : average.length > 0
    ? `${firstName} is progressing well. Continuing to practise ${average.map(t => testLabels[t.test]).join(' and ')} will push scores higher.`
    : `${firstName} is performing excellently across all areas. Keep up the great work!`

  const recsText = needs.length > 0
    ? needs.map(t => recommendations[t.test]).join('\n\n')
    : average.length > 0
    ? average.map(t => recommendations[t.test]).join('\n\n')
    : `Keep ${firstName} active with free play, swimming, and any sport they enjoy — they're thriving!`

  return {
    strengths_text: strengthsText,
    improve_text: improveText,
    recommendations: recsText,
  }
}

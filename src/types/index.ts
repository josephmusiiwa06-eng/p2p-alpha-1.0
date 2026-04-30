export type Gender = 'male' | 'female' | 'other'
export type Rating = 'Good' | 'Average' | 'Needs work'
export type OverallRating = 'Excellent' | 'On track' | 'Developing'
export type AgeBand = 3 | 4 | 5 | 6

export type TestName = 'balance' | 'shuttle' | 'throw_catch' | 'jump'

export interface School {
  id: string
  name: string
  location: string | null
  contact_email: string | null
  created_at: string
}

export interface Coach {
  id: string
  school_id: string | null
  full_name: string
  email: string
  role: string
  created_at: string
}

export interface Child {
  id: string
  school_id: string
  full_name: string
  date_of_birth: string
  gender: Gender | null
  unique_code: string
  notes: string | null
  created_at: string
}

export interface Assessment {
  id: string
  child_id: string
  coach_id: string
  assessed_on: string
  session_label: string | null
  motor_score: number | null
  overall_rating: OverallRating | null
  created_at: string
}

export interface AssessmentResult {
  id: string
  assessment_id: string
  test_name: TestName
  raw_value: number
  unit: string
  score_points: number
  rating: Rating
}

export interface Report {
  id: string
  assessment_id: string
  strengths_text: string | null
  improve_text: string | null
  recommendations: string | null
  share_token: string
  generated_at: string
}

export interface TestInput {
  balance: number
  shuttle: number
  throw_catch: number
  jump: number
}

export interface ScoredTest {
  test: TestName
  raw_value: number
  unit: string
  rating: Rating
  score_points: number
  target: string
}

export type TestScore = ScoredTest

export interface ScoringResult {
  tests: ScoredTest[]
  motor_score: number
  overall_rating: OverallRating
}

export interface ChildWithLatest extends Child {
  latest_assessment?: Assessment & { results: AssessmentResult[] }
  age_years: number
}

export interface AssessmentWithResults extends Assessment {
  results: AssessmentResult[]
  child?: Child
  report?: Report | null
}

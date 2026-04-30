// ============================================================
// P2P Alpha — Data Access Layer
// All DB operations go through here
// ============================================================

import { createClient } from './supabase'
import { Child, Assessment, AssessmentResult, Report, ScoringResult } from '@/types'
import { generateReportText, calcAge } from './scoring'

// ─────────────────────────────────────────
// CHILDREN
// ─────────────────────────────────────────
export async function getChildren(schoolId: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('children')
    .select('*')
    .eq('school_id', schoolId)
    .order('full_name')
  if (error) throw error
  return data as Child[]
}

export async function getChild(id: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('children')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Child
}

export async function createChild(payload: {
  school_id: string
  full_name: string
  date_of_birth: string
  gender?: string
  notes?: string
}) {
  const sb = createClient()
  const { data, error } = await sb
    .from('children')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data as Child
}

export async function searchChildren(schoolId: string, query: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('children')
    .select('*')
    .eq('school_id', schoolId)
    .or(`full_name.ilike.%${query}%,unique_code.ilike.%${query}%`)
    .order('full_name')
    .limit(20)
  if (error) throw error
  return data as Child[]
}

// ─────────────────────────────────────────
// ASSESSMENTS
// ─────────────────────────────────────────
export async function getAssessmentsForChild(childId: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('assessments')
    .select(`*, results:assessment_results(*), report:reports(*)`)
    .eq('child_id', childId)
    .order('assessed_on', { ascending: false })
  if (error) throw error
  return data as (Assessment & { results: AssessmentResult[]; report: Report })[]
}

export async function getTodaysAssessments(coachId: string) {
  const sb = createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await sb
    .from('assessments')
    .select(`*, child:children(*)`)
    .eq('coach_id', coachId)
    .eq('assessed_on', today)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getRecentAssessments(schoolId: string, limit = 20) {
  const sb = createClient()
  const { data, error } = await sb
    .from('assessments')
    .select(`*, child:children!inner(*), results:assessment_results(*)`)
    .eq('child.school_id', schoolId)
    .order('assessed_on', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ─────────────────────────────────────────
// SAVE FULL ASSESSMENT
// ─────────────────────────────────────────
export async function saveAssessment(payload: {
  child: Child
  coachId: string
  scoringResult: ScoringResult
  sessionLabel?: string
}) {
  const sb = createClient()
  const { child, coachId, scoringResult, sessionLabel } = payload

  // 1. Insert assessment
  const { data: assessment, error: aErr } = await sb
    .from('assessments')
    .insert([{
      child_id: child.id,
      coach_id: coachId,
      assessed_on: new Date().toISOString().split('T')[0],
      session_label: sessionLabel,
      motor_score: scoringResult.motor_score,
      overall_rating: scoringResult.overall_rating,
    }])
    .select()
    .single()
  if (aErr) throw aErr

  // 2. Insert results (one per test)
  const resultsPayload = scoringResult.tests.map(t => ({
    assessment_id: assessment.id,
    test_name: t.test,
    raw_value: t.raw_value,
    unit: t.unit,
    score_points: t.score_points,
    rating: t.rating,
  }))

  const { error: rErr } = await sb
    .from('assessment_results')
    .insert(resultsPayload)
  if (rErr) throw rErr

  // 3. Auto-generate report
  const { years } = calcAge(child.date_of_birth)
  const reportText = generateReportText(child.full_name, scoringResult, years)

  const { data: report, error: repErr } = await sb
    .from('reports')
    .insert([{ assessment_id: assessment.id, ...reportText }])
    .select()
    .single()
  if (repErr) throw repErr

  return { assessment, report }
}

// ─────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────
export async function getReportByToken(token: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('reports')
    .select(`
      *,
      assessment:assessments(
        *,
        child:children(*),
        results:assessment_results(*)
      )
    `)
    .eq('share_token', token)
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────
export async function getDashboardStats(coachId: string, schoolId: string) {
  const sb = createClient()
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0]

  const [todayRes, weekRes, allChildrenRes] = await Promise.all([
    sb.from('assessments')
      .select('motor_score, child:children(*)', { count: 'exact' })
      .eq('coach_id', coachId)
      .eq('assessed_on', today),
    sb.from('assessments')
      .select('motor_score', { count: 'exact' })
      .eq('coach_id', coachId)
      .gte('assessed_on', weekAgo),
    sb.from('children')
      .select('*, assessments(motor_score, assessed_on)')
      .eq('school_id', schoolId),
  ])

  const todayAssessments = todayRes.data ?? []
  const avgToday = todayAssessments.length > 0
    ? Math.round(todayAssessments.reduce((s: number, a: any) => s + (a.motor_score ?? 0), 0) / todayAssessments.length)
    : 0

  return {
    assessed_today: todayRes.count ?? 0,
    avg_motor_score: avgToday,
    sessions_this_week: weekRes.count ?? 0,
    recent_assessments: todayAssessments,
  }
}

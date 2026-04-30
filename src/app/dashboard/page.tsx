'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getTodaysAssessments } from '@/lib/data'
import { formatDate } from '@/lib/utils'

interface Assessment {
  id: string
  child: { id: string; full_name: string; date_of_birth: string }
  motor_score: number
  overall_rating: string
  assessed_on: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [coach, setCoach] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [todayList, setTodayList] = useState<Assessment[]>([])
  const [stats, setStats] = useState({ today: 0, avg: 0, week: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: coachData } = await sb
      .from('coaches')
      .select('*, school:schools(*)')
      .eq('id', user.id)
      .single()
    if (!coachData) { router.push('/login'); return }

    setCoach(coachData)
    setSchool(coachData.school)

    const today = await getTodaysAssessments(user.id)
    setTodayList(today as any ?? [])

    // Week stats
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0]
    const { count } = await sb.from('assessments')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user.id)
      .gte('assessed_on', weekAgo)

    const avg = today && today.length > 0
      ? Math.round(today.reduce((s: number, a: any) => s + (a.motor_score ?? 0), 0) / today.length)
      : 0

    setStats({ today: today?.length ?? 0, avg, week: count ?? 0 })
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function handleSignOut() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
  }

  const ratingClass = (r: string) =>
    r === 'Excellent' ? 'badge-excellent' : r === 'On track' ? 'badge-ontrack' : 'badge-developing'

  const initials = (name: string) =>
    name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const avatarColor = (r: string) =>
    r === 'Excellent' ? 'var(--good-bg)' : r === 'On track' ? 'var(--avg-bg)' : 'var(--needs-bg)'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* HEADER */}
      <div style={{ background: 'var(--ink)', padding: '1.25rem 1.25rem 3.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(74,222,128,.07)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} className="pulse-dot" />
            <span style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>P2P Alpha</span>
          </div>
          <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontFamily: 'var(--sans)', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 4 }}>Good morning,</p>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          Coach {coach?.full_name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
          {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })} · {school?.name}
        </p>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '0 1.25rem', marginTop: '-2.2rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Today', value: stats.today, sub: 'assessed' },
          { label: 'Avg score', value: stats.avg, sub: '+pts' },
          { label: 'This week', value: stats.week, sub: 'sessions' },
        ].map((s, i) => (
          <div key={i} className="card anim" style={{ animationDelay: `${i * 0.07}s`, padding: '14px 12px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 500, color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: 'var(--good)', fontWeight: 500 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div className="section">
        <div className="section-hdr">
          <span className="section-title">Quick actions</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Link href="/assess" style={{ gridColumn: '1/-1', textDecoration: 'none' }}>
            <div style={{ background: 'var(--ink)', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>New session</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Start assessment</p>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </Link>
          <Link href="/children/new" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/>
                  <line x1="12" y1="13" x2="12" y2="21"/><line x1="8" y1="17" x2="16" y2="17"/>
                </svg>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>Add child</p>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>Register profile</p>
            </div>
          </Link>
          <Link href="/children" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>Progress</p>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>Class trends</p>
            </div>
          </Link>
        </div>
      </div>

      {/* TODAY'S ASSESSMENTS */}
      <div className="section">
        <div className="section-hdr">
          <span className="section-title">Today&apos;s assessments</span>
          <Link href="/children" style={{ fontSize: 12, color: 'var(--good)', fontWeight: 500, textDecoration: 'none' }}>View all →</Link>
        </div>

        {todayList.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>No assessments yet today</p>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Tap &quot;Start assessment&quot; to begin</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayList.map((a, i) => (
              <Link key={a.id} href={`/children/${a.child.id}`} style={{ textDecoration: 'none' }}>
                <div className="card anim" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', animationDelay: `${i * 0.05}s` }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor(a.overall_rating), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--ink)', flexShrink: 0 }}>
                    {initials(a.child.full_name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{a.child.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>Balance · Run · Throw · Jump</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{a.motor_score}</span>
                    <span className={`badge ${ratingClass(a.overall_rating)}`}>{a.overall_rating}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .pulse-dot { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
      `}</style>
    </div>
  )
}

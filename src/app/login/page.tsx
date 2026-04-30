'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const sb = createClient()
    const { error: authError } = await sb.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      {/* Logo */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Play2Perform Alpha
          </span>
        </div>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Coach<br />login
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 8 }}>
          Kinder kinetics assessment platform
        </p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="coach@school.co.za"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-sm)', padding: '13px 14px',
              fontFamily: 'var(--sans)', fontSize: 15, color: '#fff', outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-sm)', padding: '13px 14px',
              fontFamily: 'var(--sans)', fontSize: 15, color: '#fff', outline: 'none',
            }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.15)', border: '0.5px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8, width: '100%', background: 'var(--accent)',
            color: 'var(--ink)', border: 'none', borderRadius: 'var(--radius)',
            padding: '16px', fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? <div className="spinner" style={{ borderTopColor: 'var(--ink)' }} /> : 'Sign in'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: '2rem' }}>
        P2P Alpha · Early childhood motor development
      </p>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
        input:focus { border-color: rgba(74,222,128,0.5) !important; }
      `}</style>
    </div>
  )
}

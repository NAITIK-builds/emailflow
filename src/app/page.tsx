'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { 
  Mail, Shield, Zap, ArrowRight, GitBranch, AlertCircle, CheckCircle2, 
  Command, Lock, Globe, Cpu
} from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      } else {
        setIsLoggedIn(false)
        setAuthChecked(true)
      }
    }
    checkSession()
  }, [])

  const handleLogin = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  const handleGoToDashboard = () => router.push('/dashboard')

  // Don't flash login UI while checking auth
  if (!authChecked) return (
    <div style={{ minHeight: '100vh', background: '#05050a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ background: '#05050a', color: '#fff', minHeight: '100vh', fontFamily: "'Outfit', sans-serif", overflowX: 'hidden' }}>

      {/* === AMBIENT BLOBS === */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', borderRadius: '50%', animation: 'pulse 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', borderRadius: '50%', animation: 'pulse 8s ease-in-out infinite 2s' }} />
      </div>

      {/* === NAVBAR === */}
      <nav style={{
        position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)', maxWidth: '1200px', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(5,5,10,0.85)' : 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '12px 24px',
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 8px 40px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
            <Mail size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.8px', background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.5))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MailFlow</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a href="#features" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', fontWeight: 500, padding: '8px 16px', textDecoration: 'none', borderRadius: '10px', transition: 'all 0.2s' }}>Features</a>
          <a href="#security" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', fontWeight: 500, padding: '8px 16px', textDecoration: 'none', borderRadius: '10px', transition: 'all 0.2s' }}>Security</a>
          {isLoggedIn ? (
            <button onClick={handleGoToDashboard} style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(59,130,246,0.2)', fontFamily: 'inherit' }}>
              Dashboard <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={handleLogin} style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(59,130,246,0.2)', fontFamily: 'inherit' }}>
              Sign In <ArrowRight size={14} />
            </button>
          )}
        </div>
      </nav>

      {/* === HERO SECTION === */}
      <section style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', padding: '200px 32px 120px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
        
        {/* LEFT: Copy */}
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '100px', padding: '6px 16px', marginBottom: '28px' }}>
            <div style={{ width: '6px', height: '6px', background: '#3b82f6', borderRadius: '50%' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px' }}>Next Gen Inbox</span>
          </div>

          <h1 style={{ fontSize: '72px', fontWeight: 900, lineHeight: 1, letterSpacing: '-3px', marginBottom: '24px' }}>
            Elevate your<br />
            <span style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              email flow
            </span>
          </h1>

          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '40px', maxWidth: '480px', fontWeight: 300 }}>
            The privacy-first email tool for power users. Connect Gmail securely, read metadata fast, and stay in control — always.
          </p>

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '16px', marginBottom: '32px', alignItems: 'flex-start' }}>
              <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 700, color: '#f87171', fontSize: '13px', marginBottom: '4px' }}>Provider Not Enabled</p>
                <p style={{ color: 'rgba(248,113,113,0.7)', fontSize: '12px', lineHeight: 1.5 }}>Enable Google in Supabase → Authentication → Providers → Google.</p>
              </div>
            </motion.div>
          )}

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={isLoggedIn ? handleGoToDashboard : handleLogin}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none', padding: '18px 36px', borderRadius: '16px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', boxShadow: '0 8px 40px rgba(59,130,246,0.3)', fontFamily: 'inherit', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 16px 50px rgba(59,130,246,0.4)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 40px rgba(59,130,246,0.3)'; }}
            >
              <Mail size={20} /> {isLoggedIn ? 'Open Dashboard' : 'Get Started'}
            </button>
            <a href="https://github.com/naitik-builds/mailflow" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', padding: '18px 36px', borderRadius: '16px', fontWeight: 700, fontSize: '16px', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.09)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              <GitBranch size={20} /> View Source
            </a>
          </div>

          <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex' }}>
              {['#3b82f6', '#6366f1', '#8b5cf6', '#a78bfa'].map((c, i) => (
                <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: '2px solid #05050a', marginLeft: i > 0 ? '-10px' : 0 }} />
              ))}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>2,400+ Early Users</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Joining during open beta</p>
            </div>
          </div>
        </motion.div>

        {/* RIGHT: Dashboard Mockup */}
        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }} style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', inset: '-30px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.2) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(30px)' }} />
          
          {/* Main mockup card */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 30px 100px rgba(0,0,0,0.5)', position: 'relative' }}>
            {/* Titlebar */}
            <div style={{ height: '46px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840' }} />
              </div>
              <div style={{ flex: 1, height: '22px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginLeft: '8px' }} />
            </div>

            {/* 3-pane layout */}
            <div style={{ display: 'flex', height: '460px' }}>
              {/* Sidebar */}
              <div style={{ width: '180px', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '20px 16px', flexShrink: 0 }}>
                <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: '10px', marginBottom: '24px' }} />
                {['Inbox', 'Starred', 'Sent', 'Drafts', 'Trash'].map((item, i) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', marginBottom: '4px', background: i === 0 ? 'rgba(59,130,246,0.12)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === 0 ? '#3b82f6' : 'rgba(255,255,255,0.15)' }} />
                    <span style={{ fontSize: '13px', fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#60a5fa' : 'rgba(255,255,255,0.3)' }}>{item}</span>
                    {i === 0 && <span style={{ marginLeft: 'auto', fontSize: '11px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '1px 8px', borderRadius: '100px', fontWeight: 700 }}>12</span>}
                  </div>
                ))}
              </div>

              {/* Email list */}
              <div style={{ width: '240px', borderRight: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '32px' }} />
                </div>
                {[
                  { name: 'GitHub', subject: 'Your daily digest', time: '9:12 AM', unread: true },
                  { name: 'Vercel', subject: 'Build succeeded ✅', time: 'Yesterday', unread: true },
                  { name: 'Supabase', subject: 'New signup alert', time: 'Mon', unread: false },
                  { name: 'Linear', subject: 'Issue assigned to you', time: 'Sun', unread: false },
                  { name: 'Stripe', subject: 'Payment confirmed', time: 'Sat', unread: false },
                ].map((email, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: i === 0 ? 'rgba(59,130,246,0.07)' : 'transparent', borderLeft: i === 0 ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: email.unread ? 700 : 500, color: email.unread ? '#fff' : 'rgba(255,255,255,0.5)' }}>{email.name}</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{email.time}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email.subject}</div>
                  </div>
                ))}
              </div>

              {/* Reading pane */}
              <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
                <div style={{ height: '20px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', width: '70%' }} />
                <div style={{ height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: '40%' }} />
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: 0.4 }}>
                  {[90, 100, 75, 100, 60, 80].map((w, i) => (
                    <div key={i} style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', width: `${w}%` }} />
                  ))}
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                  <div style={{ height: '34px', width: '80px', background: 'rgba(59,130,246,0.25)', borderRadius: '8px' }} />
                  <div style={{ height: '34px', width: '80px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Float badges */}
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: '40px', left: '-50px', background: 'rgba(5,5,10,0.9)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(20px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 5 }}>
            <div style={{ width: '36px', height: '36px', background: 'rgba(34,197,94,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="#4ade80" />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '1px' }}>Verified</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>OAuth Success</div>
            </div>
          </motion.div>

          <motion.div animate={{ y: [0, 14, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            style={{ position: 'absolute', bottom: '60px', right: '-40px', background: 'rgba(5,5,10,0.9)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(20px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 5 }}>
            <div style={{ width: '36px', height: '36px', background: 'rgba(99,102,241,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px' }}>Security</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>End-to-End Encrypted</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* === FEATURES === */}
      <section id="features" style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '52px', fontWeight: 900, letterSpacing: '-2px', marginBottom: '16px', lineHeight: 1.1 }}>
            Software that <span style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>respects</span> you.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '18px', fontWeight: 300, maxWidth: '600px', margin: '0 auto' }}>
            Everything you want from an email client, with nothing you don't.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          {[
            { icon: <Zap size={24} color="#fbbf24" />, color: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', title: 'Blazing Fast', desc: 'Emails fetched in under 100ms via Supabase Edge Functions distributed worldwide.' },
            { icon: <Shield size={24} color="#60a5fa" />, color: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', title: 'Privacy First', desc: 'Zero data extraction. Encrypted OAuth tokens. HIPAA & GDPR compliant by design.' },
            { icon: <Command size={24} color="#c084fc" />, color: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.2)', title: 'Power Interface', desc: 'A 3-pane email client built for keyboard warriors. No ads, clutter, or distractions.' },
            { icon: <Lock size={24} color="#34d399" />, color: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', title: 'Secure Auth', desc: 'Read-only Google OAuth scope. We only request what we absolutely need.' },
            { icon: <Cpu size={24} color="#f97316" />, color: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', title: 'Edge Runtime', desc: 'Next.js 15 with Turbopack. Every route is optimized for instant response times.' },
            { icon: <Globe size={24} color="#38bdf8" />, color: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)', title: 'Open Source', desc: 'Fully transparent codebase on GitHub. Fork it, host it yourself, trust your data.' },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '28px', cursor: 'default', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '48px', height: '48px', background: f.color, border: `1px solid ${f.border}`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, fontWeight: 300 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* === CTA === */}
      <section style={{ position: 'relative', zIndex: 10, maxWidth: '900px', margin: '0 auto', padding: '80px 32px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', padding: '80px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <h2 style={{ fontSize: '52px', fontWeight: 900, letterSpacing: '-2px', marginBottom: '20px', lineHeight: 1 }}>
            Ready to take <span style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Control?</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '18px', marginBottom: '48px', fontWeight: 300 }}>
            Free while in open beta. No credit card required.
          </p>
          <button
            onClick={isLoggedIn ? handleGoToDashboard : handleLogin}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none', padding: '20px 48px', borderRadius: '18px', fontWeight: 800, fontSize: '18px', cursor: 'pointer', boxShadow: '0 10px 50px rgba(59,130,246,0.35)', fontFamily: 'inherit' }}
          >
            <Mail size={22} /> {isLoggedIn ? 'Open Dashboard' : 'Get Started Free'}
          </button>
        </motion.div>
      </section>

      {/* === FOOTER === */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '48px 32px', maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>© 2026 MailFlow Inc.</span>
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          {['Privacy', 'Terms', 'Support'].map(l => (
            <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Mail, Inbox, Star, Send, File, Archive, Trash2, 
  Search, MoreVertical, RefreshCcw, LogOut, 
  ChevronRight, Reply, Forward, Shield, ExternalLink, AlertCircle 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isGmailConnected, setIsGmailConnected] = useState(false)
  const [emails, setEmails] = useState<any[]>([])
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [isFetchingEmails, setIsFetchingEmails] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('inbox')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [iframeHeights, setIframeHeights] = useState<Record<string, number>>({})
  const [viewingAsUser, setViewingAsUser] = useState<string | null>(null)

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (err) {
      return null
    }
  }

  const fetchEmails = async (isNextPage = false) => {
    if (isNextPage) setIsLoadingMore(true)
    else setIsFetchingEmails(true)
    
    setFetchError(null)

    try {
      const activeToken = await getAccessToken()
      if (!activeToken) throw new Error('No active session')

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) throw new Error('Supabase URL configuration missing')

      let fetchUrl = `${supabaseUrl}/functions/v1/get-emails?max=10`
      
      // If viewing as another user (Admin Audit Mode)
      if (viewingAsUser) {
        fetchUrl += `&userId=${viewingAsUser}`
      } else if (isNextPage && nextPageToken) {
        fetchUrl += `&pageToken=${nextPageToken}`
      }

      console.log('Fetching emails from:', fetchUrl)

      const response = await fetch(fetchUrl, {
        method: 'POST', // Use POST to allow userId in body as fallback
        headers: { 
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: viewingAsUser || user.id })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      if (data.emails) {
        if (isNextPage) {
          setEmails(prev => [...prev, ...data.emails])
        } else {
          setEmails(data.emails)
          if (data.emails.length > 0 && !selectedEmail) {
            setSelectedEmail(data.emails[0])
          }
        }
        setNextPageToken(data.nextPageToken || null)
      } else {
        console.warn('No emails array in response:', data)
      }
    } catch (err: any) {
      console.error('Fetch error caught:', err)
      let errorMsg = err?.message || 'Failed to fetch emails'
      setFetchError(errorMsg)
    } finally {
      setIsFetchingEmails(false)
      setIsLoadingMore(false)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 100 && !isFetchingEmails && !isLoadingMore && nextPageToken) {
      fetchEmails(true)
    }
  }

  const checkUser = async (u?: any) => {
    try {
      const currentUser = u || (await supabase.auth.getUser()).data.user
      if (!currentUser) {
        router.push('/')
        return
      }

      setUser(currentUser)
      
      // 1. Fetch own profile (always needed for admin check)
      const { data: ownProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (profileError) console.warn('Profile fetch error:', profileError)

      // 2. Check for "View As" mode via URL params
      const params = new URLSearchParams(window.location.search)
      const targetUserId = params.get('viewUser')
      
      if (targetUserId && (ownProfile?.role === 'admin' || currentUser.email === 'naitikwebdev001@gmail.com')) {
        setViewingAsUser(targetUserId)
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single()
        
        if (targetProfile) {
          console.log('AUDIT MODE ACTIVE: Targeting', targetUserId)
          // Set everything at once to prevent multiple effect triggers
          setIsGmailConnected(!!targetProfile.connected_gmail)
          setProfile({
            ...targetProfile,
            full_name: `AUDIT: ${targetProfile.full_name || 'User'}`,
            is_audit: true
          })
          setLoading(false)
          return
        }
      }
      
      const connected = !!ownProfile?.connected_gmail
      setIsGmailConnected(connected)
      setProfile(ownProfile)
      setLoading(false)
    } catch (err) {
      console.error('checkUser error:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        const hasConnectedParam = window.location.search.includes('connected=true')
        if (hasConnectedParam || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            checkUser(session.user)
        }
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        setUser(null)
        setProfile(null)
        router.push('/')
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Separate effect to trigger fetch ONLY after profile is set correctly
  useEffect(() => {
    if (profile && isGmailConnected) {
      fetchEmails()
    }
  }, [profile, isGmailConnected])

  const handleConnectGmail = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gmail-callback`
    const scopes = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email openid'
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${user.id}`
    window.location.href = url
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail?')) return
    const token = await getAccessToken()
    if (!token) return
    await supabase.functions.invoke('disconnect-gmail', { headers: { Authorization: `Bearer ${token}` } })
    setIsGmailConnected(false)
    setEmails([])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'resize-iframe' && event.data.height && event.data.emailId) {
        setIframeHeights(prev => ({ ...prev, [event.data.emailId]: event.data.height }))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const filteredEmails = useMemo(() => {
    return emails.filter(email => 
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
      email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.snippet.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [emails, searchQuery])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#05050a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', color: '#fff' }}>
      <RefreshCcw className="animate-spin" style={{ color: '#3b82f6' }} size={48} />
      <p style={{ opacity: 0.6, fontSize: '14px', letterSpacing: '1px' }}>SYNCHRONIZING INBOX...</p>
    </div>
  )

  return (
    <div className="dashboard-container" style={{ height: '100vh', background: '#05050a', color: '#fff', display: 'flex', overflow: 'hidden', fontFamily: "'Outfit', sans-serif", paddingTop: viewingAsUser ? '40px' : '0' }}>
      <div className="bg-mesh" />

      {/* Audit Mode Banner */}
      {viewingAsUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '40px', background: '#fbbf24', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
           <Shield style={{ marginRight: '10px' }} size={16} /> YOU ARE CURRENTLY AUDITING A USER ACCOUNT
           <button onClick={() => router.push('/admin')} style={{ marginLeft: '24px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 900, cursor: 'pointer' }}>RETURN TO ADMIN</button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar" style={{ width: '260px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', zIndex: 20, background: 'rgba(5,5,10,0.4)', backdropFilter: 'blur(20px)' }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', padding: '10px', borderRadius: '12px' }}><Mail size={20} color="#fff" /></div>
          <span style={{ fontWeight: 800, fontSize: '22px', background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.4))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MailFlow</span>
        </div>

        <div className="scrollbar-hide" style={{ flex: 1, overflowY: 'auto', padding: '0 12px', marginTop: '16px' }}>
          {[
            { id: 'inbox', icon: <Inbox size={18} />, label: 'Inbox', count: emails.length },
            { id: 'starred', icon: <Star size={18} />, label: 'Starred' },
            { id: 'sent', icon: <Send size={18} />, label: 'Sent' },
            { id: 'drafts', icon: <File size={18} />, label: 'Drafts' },
            { id: 'archive', icon: <Archive size={18} />, label: 'Archive' },
            { id: 'trash', icon: <Trash2 size={18} />, label: 'Trash' },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveCategory(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', marginBottom: '4px', border: 'none', cursor: 'pointer', background: activeCategory === item.id ? 'rgba(59,130,246,0.12)' : 'transparent', color: activeCategory === item.id ? '#60a5fa' : 'rgba(255,255,255,0.4)', fontWeight: activeCategory === item.id ? 600 : 400 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{item.icon}<span>{item.label}</span></div>
              {item.count ? <span style={{ fontSize: '11px', background: 'rgba(59,130,246,0.2)', padding: '2px 8px', borderRadius: '100px' }}>{item.count}</span> : null}
            </button>
          ))}
        </div>

        {/* Profile Card */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: 800 }}>{profile?.full_name?.charAt(0).toUpperCase() || (user?.email?.charAt(0).toUpperCase())}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || user?.email?.split('@')[0]}</p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: 0, textTransform: 'uppercase' }}>{profile?.role || 'User'}</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* LIST */}
      <main className="dashboard-list" style={{ width: '400px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} size={16} />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px 12px 42px', fontSize: '14px', color: '#fff' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Inbox</h3>
            <button onClick={() => fetchEmails()} disabled={isFetchingEmails} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)' }}><RefreshCcw size={16} className={isFetchingEmails ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        <div onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
          {!isGmailConnected ? (
             <div style={{ padding: '80px 48px', textAlign: 'center' }}>
                <button onClick={handleConnectGmail} style={{ width: '100%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: 700 }}>Connect Gmail</button>
             </div>
          ) : filteredEmails.length > 0 ? (
            filteredEmails.map((email) => (
              <div key={email.id} onClick={() => setSelectedEmail(email)} style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: selectedEmail?.id === email.id ? 'rgba(59,130,246,0.08)' : 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '14px', fontWeight: 700 }}>{email.sender.split('<')[0]}</span><span style={{ fontSize: '11px', opacity: 0.4 }}>{new Date(email.receivedAt).toLocaleDateString()}</span></div>
                <h4 style={{ fontSize: '13px', margin: '0 0 4px 0', opacity: 0.8 }}>{email.subject}</h4>
                <p style={{ fontSize: '12px', opacity: 0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email.snippet}</p>
              </div>
            ))
          ) : <div style={{ padding: '80px 24px', textAlign: 'center', opacity: 0.3 }}><p>No emails found</p></div>}
        </div>
      </main>

      {/* DETAIL */}
      <section className="dashboard-detail" style={{ flex: 1, display: 'flex', background: 'rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        {selectedEmail ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <header style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>{selectedEmail.subject}</h1>
              <p style={{ opacity: 0.5, fontSize: '14px' }}>From: {selectedEmail.sender}</p>
            </header>
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '24px', overflow: 'hidden' }}>
                {selectedEmail.html ? (
                   <iframe srcDoc={`<html><body style="font-family:sans-serif;padding:20px;">${selectedEmail.html}</body></html>`} style={{ width: '100%', height: '800px', border: 'none' }} />
                ) : (
                  <div style={{ padding: '40px', color: '#333', whiteSpace: 'pre-wrap' }}>{selectedEmail.text || selectedEmail.snippet}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
            <Mail size={80} />
            <h3 style={{ fontSize: '32px', fontWeight: 900 }}>Secure Inbox</h3>
          </div>
        )}
      </section>
    </div>
  )
}

'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Users, 
  ShieldCheck, 
  Mail, 
  RefreshCcw, 
  ExternalLink,
  ChevronRight,
  User as UserIcon,
  Search,
  CheckCircle2,
  AlertCircle,
  Inbox
} from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedEmails, setSelectedEmails] = useState<any[]>([])
  const [isFetchingEmails, setIsFetchingEmails] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Master Admin Lock: Allow Naitik as a fallback regardless of role
      const isMasterAdmin = user.email === 'naitikwebdev001@gmail.com'

      // Check if admin in DB
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin' && !isMasterAdmin) {
        console.warn('Unauthorized admin access attempt:', user.email)
        router.push('/dashboard')
        return
      }

      // Fetch all user profiles (Now fixed by the SQL RLS update)
      const { data: allUsers, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false })

      if (fetchError) {
        console.error('Registry Fetch Error:', fetchError.message)
        
        // Final desperate fallback: If they are the master admin, try to at least show their own entry
        if (isMasterAdmin) {
           const { data: myself } = await supabase
             .from('profiles')
             .select('*')
             .eq('id', user.id)
             .single()
           setUsers(myself ? [myself] : [])
        }
      } else {
        console.log('Successfully fetched users:', allUsers?.length || 0)
        setUsers(allUsers || [])
      }
      setLoading(false)
    }
    fetchUsers()
  }, [])

  const viewUserEmails = async (user: any) => {
    setSelectedUser(user)
    if (!user.connected_gmail) {
      setSelectedEmails([])
      return
    }

    setIsFetchingEmails(true)
    try {
      let sessionData = (await supabase.auth.getSession()).data.session
      
      if (!sessionData?.access_token) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !refreshed.session?.access_token) {
          throw new Error('Failed to get authentication token')
        }
        sessionData = refreshed.session
      }

      const activeToken = sessionData?.access_token

      console.log('Fetching emails for user:', user.id, 'with token length:', activeToken?.length)
      
      const { data, error } = await supabase.functions.invoke('get-emails', {
        headers: { 
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: { userId: user.id }
      })
      
      if (error) {
        console.error('Function invocation error:', error)
        throw error
      }
      
      if (data?.error) {
        console.error('API error response:', data.error)
        throw new Error(data.error)
      }
      
      if (data?.emails) {
        setSelectedEmails(data.emails)
      } else {
        setSelectedEmails([])
      }
    } catch (err: any) {
      console.error('Audit fetch error:', err)
      alert(`Failed to fetch emails: ${err?.message || 'Unknown error'}`)
      setSelectedEmails([])
    } finally {
      setIsFetchingEmails(false)
    }
  }

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.connected_gmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#05050a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <RefreshCcw className="animate-spin" style={{ color: '#3b82f6' }} size={32} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#05050a', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif", position: 'relative', overflowX: 'hidden' }}>
      {/* Mesh Background Accents */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(147,51,234,0.1) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      {/* Navbar */}
      <header style={{ height: '80px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', background: 'rgba(5,5,10,0.6)', backdropFilter: 'blur(30px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
             <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Inbox size={20} color="#fff" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.5px', lineHeight: 1 }}>MailFlow Admin</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>Control Center</span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ position: 'relative' }}>
             <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
             <input 
               type="text" 
               placeholder="Search registry..." 
               style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 16px 12px 42px', fontSize: '13px', color: '#fff', outline: 'none', width: '280px', transition: 'all 0.2s' }}
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               onFocus={e => e.target.style.background = 'rgba(255,255,255,0.04)'}
               onBlur={e => e.target.style.background = 'rgba(255,255,255,0.02)'}
             />
          </div>
          <button 
            onClick={() => window.location.reload()}
            title="Refresh Registry"
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
          >
             <RefreshCcw size={16} />
          </button>
          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} className="animate-pulse" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase' }}>System Healthy</span>
          </div>
        </div>
      </header>

      <main className="admin-main" style={{ flex: 1, padding: '40px', maxWidth: '1600px', margin: '0 auto', width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 10 }}>
        <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '40px', height: 'calc(100vh - 180px)', minHeight: '600px' }}>
          
          {/* User List Shell */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={20} style={{ color: '#3b82f6' }} />
                  Users
                  <span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px', marginLeft: '12px' }}>{filteredUsers.length} total</span>
                </h2>
            </div>
            
            <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredUsers.length > 0 ? filteredUsers.map((user: any) => (
                  <button 
                    key={user.id}
                    onClick={() => viewUserEmails(user)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '16px 20px', background: selectedUser?.id === user.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                      border: 'none', borderLeft: selectedUser?.id === user.id ? '4px solid #3b82f6' : '4px solid transparent',
                      cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '16px'
                    }}
                    onMouseEnter={e => { if (selectedUser?.id !== user.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (selectedUser?.id !== user.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px', borderRadius: '12px', flexShrink: 0, border: '1px solid rgba(255,255,255,0.05)' }}>
                      {user.avatar_url ? <img src={user.avatar_url} style={{ width: '24px', height: '24px', borderRadius: '50%' }} /> : <UserIcon size={20} style={{ color: selectedUser?.id === user.id ? '#3b82f6' : 'rgba(255,255,255,0.4)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <p style={{ fontWeight: 800, fontSize: '15px', margin: 0, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.full_name || 'Anonymous User'}
                        </p>
                        {user.role === 'admin' && <ShieldCheck size={14} style={{ color: '#fbbf24' }} />}
                      </div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {user.connected_gmail || 'No Gmail account linked'}
                      </p>
                    </div>
                    {user.connected_gmail ? (
                      <CheckCircle2 size={16} style={{ color: '#22c55e', opacity: 0.6 }} />
                    ) : (
                      <AlertCircle size={16} style={{ color: 'rgba(255,255,255,0.1)' }} />
                    )}
                  </button>
                )) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '14px', fontStyle: 'italic' }}>No users found.</div>
                )}
              </div>
            </div>
          </div>

          {/* User Detail Shell */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, minHeight: 0 }}>
            <div style={{ marginBottom: '16px' }}>
               <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', height: '32px' }}>
                 <Mail size={20} style={{ color: '#3b82f6' }} />
                 Email Audit Logs
               </h2>
            </div>

            <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
               {!selectedUser ? (
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px' }}>
                   <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                     <Users size={40} style={{ color: 'rgba(255,255,255,0.05)' }} />
                   </div>
                   <h3 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>Select a User</h3>
                   <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', maxWidth: '320px', lineHeight: 1.5 }}>
                     Choose a user from the left to audit their connected email metadata.
                   </p>
                 </div>
               ) : (
                 <>
                   <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <div style={{ width: '48px', height: '48px', background: 'rgba(59,130,246,0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <UserIcon style={{ color: '#3b82f6' }} size={24} />
                           </div>
                           <div>
                              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px 0' }}>{selectedUser.full_name || 'Anonymous User'}</h3>
                              <p style={{ fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {selectedUser.connected_gmail ? (
                                  <>
                                    <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                                    <span style={{ color: '#60a5fa' }}>{selectedUser.connected_gmail}</span>
                                  </>
                                ) : (
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No email connected</span>
                                )}
                              </p>
                           </div>
                        </div>
                        {selectedUser.connected_gmail && (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              onClick={() => router.push(`/dashboard?viewUser=${selectedUser.id}`)}
                              title="View Full Dashboard"
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                                borderRadius: '10px', padding: '8px 16px', color: '#60a5fa', cursor: 'pointer',
                                fontSize: '13px', fontWeight: 700, transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                            >
                               <ExternalLink size={14} /> Full View
                            </button>
                            <button 
                              onClick={() => viewUserEmails(selectedUser)}
                              disabled={isFetchingEmails}
                              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                               <RefreshCcw size={18} className={isFetchingEmails ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        )}
                      </div>
                   </div>

                   <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'rgba(0,0,0,0.1)' }}>
                      {isFetchingEmails ? (
                        <div style={{ padding: '80px 48px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                          <RefreshCcw className="animate-spin" style={{ color: '#3b82f6' }} size={40} />
                          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>FETCHING METADATA FOR AUDIT...</p>
                        </div>
                      ) : !selectedUser.connected_gmail ? (
                        <div style={{ padding: '80px 48px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                             <AlertCircle size={64} style={{ color: 'rgba(255,255,255,0.05)', marginBottom: '24px' }} />
                             <p style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0' }}>Access Denied</p>
                             <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', maxWidth: '280px', lineHeight: 1.5 }}>User has not granted access to their Gmail account.</p>
                        </div>
                      ) : selectedEmails.length > 0 ? (
                        selectedEmails.map((email: any) => (
                          <div key={email.id} style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '16px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                             <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', marginTop: '10px', flexShrink: 0 }} />
                             <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                   <span style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.sender}</span>
                                   <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                                      {new Date(email.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </span>
                                </div>
                                <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.subject}</p>
                                <p className="line-clamp-1" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0, fontStyle: 'italic' }}>{email.snippet}</p>
                             </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '80px 48px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.2 }}>
                           <Inbox size={64} style={{ marginBottom: '24px' }} />
                           <p style={{ fontSize: '16px', fontWeight: 700 }}>No messages retrieved for this user.</p>
                        </div>
                      )}
                   </div>
                 </>
               )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

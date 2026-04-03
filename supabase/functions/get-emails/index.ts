import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate Environment Variables
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const missingVars = []
    if (!GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID')
    if (!GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET')
    if (!SUPABASE_URL) missingVars.push('SUPABASE_URL')
    if (!SUPABASE_ANON_KEY) missingVars.push('SUPABASE_ANON_KEY')
    if (!SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')

    if (missingVars.length > 0) {
        throw new Error(`Edge Function missing environment variables: ${missingVars.join(', ')}. Please check your Supabase Secrets.`)
    }

    // 2. Validate Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create supabase clients
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
    
    // Verify user JWT
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      console.error('Auth error:', userError)
      throw new Error(`Unauthorized: ${userError?.message || 'Invalid token'}`)
    }

    // 3. Extract Parameters (Handle both POST body and GET query params)
    let body: any = {}
    if (req.method === 'POST') {
      try {
        body = await req.json()
      } catch (e) {
        console.warn('Empty or invalid JSON body')
      }
    }

    const url = new URL(req.url)
    const queryUserId = url.searchParams.get('userId')
    const targetUserId = body.userId || queryUserId || user.id
    const maxResults = Math.min(parseInt(url.searchParams.get('max') || body.max || '10'), 50)
    const pageToken = url.searchParams.get('pageToken') || body.pageToken || ''

    // 4. Validate Permissions
    const isMasterAdmin = user.email === 'naitikwebdev001@gmail.com'
    
    if (targetUserId !== user.id) {
        const { data: currentUserProfile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (currentUserProfile?.role !== 'admin' && !isMasterAdmin) {
          throw new Error('Forbidden: Only admins can perform audits on other users')
        }
    }

    // Get tokens for the target user from DB
    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', targetUserId)
      .single()

    if (tokenError || !tokens) {
        throw new Error('Gmail not connected for this user (no tokens found in database)')
    }

    let accessToken = tokens.access_token
    const expiresAt = new Date(tokens.expires_at).getTime()

    // Refresh token if expired or about to expire (2 minute buffer)
    if (expiresAt < (Date.now() + 120000)) {
        console.log(`Refreshing Gmail token for user ${targetUserId}...`)
        
        if (!tokens.refresh_token) {
            throw new Error('Refresh token missing. Please reconnect your Gmail account with consent.')
        }

        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        const refreshData = await refreshResponse.json()
        if (refreshData.error) {
            console.error('Google Refresh Error:', refreshData.error)
            throw new Error(`Failed to refresh Gmail token: ${refreshData.error_description || refreshData.error}`)
        }

        accessToken = refreshData.access_token
        
        // Update DB with new token
        await supabaseAdmin
          .from('gmail_tokens')
          .update({
            access_token: accessToken,
            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', targetUserId)
    }

    // Fetch emails list from GMAIL API
    let listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`
    if (pageToken) listUrl += `&pageToken=${pageToken}`

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!listRes.ok) {
        const listErr = await listRes.json()
        console.error('Gmail API list error:', listErr)
        throw new Error(`Gmail API Error (List): ${listErr.error?.message || listRes.statusText}`)
    }

    const listData = await listRes.json()

    if (!listData.messages || listData.messages.length === 0) {
      return new Response(JSON.stringify({ emails: [], nextPageToken: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch details for each message
    const emailDetails = await Promise.all(listData.messages.map(async (msg: any) => {
        try {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
            
            if (!detailRes.ok) return null
            
            const detail = await detailRes.json()
            if (!detail.payload) return null
            
            const headers = detail.payload.headers || []
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)'
            const from = headers.find((h: any) => h.name === 'From')?.value || '(No Sender)'
            const date = headers.find((h: any) => h.name === 'Date')?.value
            
            // Extract body (handling multipart mimeTypes)
            let textBody = ''
            let htmlBody = ''
                       const extractParts = (payload: any) => {
                const mimeType = payload.mimeType || ''
                if (payload.body?.data) {
                    try {
                        const base64 = payload.body.data.replace(/-/g, '+').replace(/_/g, '/')
                        // Convert base64 to Uint8Array for more robust multi-byte char handling
                        const binaryStr = atob(base64)
                        const bytes = new Uint8Array(binaryStr.length)
                        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
                        const decoded = new TextDecoder('utf-8').decode(bytes)

                        if (mimeType.startsWith('text/plain')) {
                            textBody += (textBody ? '\n' : '') + decoded
                        } else if (mimeType.startsWith('text/html')) {
                            htmlBody += (htmlBody ? '\n' : '') + decoded
                        }
                    } catch (e) {
                        console.error('Extraction error:', e)
                    }
                }
                
                // Recursively check parts
                if (payload.parts) {
                    payload.parts.forEach((part: any) => extractParts(part))
                }
            }
            
            extractParts(detail.payload)
            
            // Fallback to snippet if no body found
            if (!textBody && !htmlBody) textBody = detail.snippet || ''

            let receivedAtIso
            try {
                receivedAtIso = date ? new Date(date).toISOString() : new Date().toISOString()
            } catch (e) {
                receivedAtIso = new Date().toISOString()
            }
            
            return {
                id: detail.id,
                threadId: detail.threadId,
                sender: from,
                subject: subject,
                snippet: detail.snippet || '',
                text: textBody,
                html: htmlBody,
                receivedAt: receivedAtIso
            }
        } catch (err) {
            console.error(`Error fetching detail for message ${msg.id}:`, err)
            return null
        }
    }))

    const validEmails = emailDetails.filter(email => email !== null)

    return new Response(JSON.stringify({ 
      emails: validEmails,
      nextPageToken: listData.nextPageToken || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('FETCH_EMAILS_ERROR:', error.message)
    // We return 200 with an error object so the frontend can display the ACTUAL message
    // instead of the generic "non-2xx status code" error from the Supabase client.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    })
  }
})

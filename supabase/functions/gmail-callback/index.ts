import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const REDIRECT_URI = Deno.env.get('OAUTH_REDIRECT_URI') // This callback's URL

// DEBUG: Log what we have on startup
console.log('=== GMAIL CALLBACK FUNCTION STARTUP ===')
console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? '✓ SET' : '❌ MISSING')
console.log('GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? '✓ SET' : '❌ MISSING')
console.log('SUPABASE_URL:', SUPABASE_URL ? '✓ SET' : '❌ MISSING')
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓ SET' : '❌ MISSING')
console.log('REDIRECT_URI:', REDIRECT_URI ? '✓ SET' : '❌ MISSING')
console.log('====================================')

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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const REDIRECT_URI = Deno.env.get('OAUTH_REDIRECT_URI') || `${SUPABASE_URL}/functions/v1/gmail-callback`

    const missingVars = []
    if (!GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID')
    if (!GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET')
    if (!SUPABASE_URL) missingVars.push('SUPABASE_URL')
    if (!SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')

    if (missingVars.length > 0) {
        throw new Error(`Edge Function missing environment variables: ${missingVars.join(', ')}. Please check your Supabase Secrets.`)
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // Should be the user's UUID
    const oauthError = url.searchParams.get('error')

    console.log(`📨 Callback received - state: ${state}, hasCode: ${!!code}, hasError: ${!!oauthError}`)

    if (oauthError) {
      throw new Error(`Google OAuth Error: ${oauthError}`)
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter from Google redirect')
    }

    // 2. Exchange code for tokens
    console.log('🔄 Exchanging code for tokens...')
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()
    console.log('📡 Token exchange response status:', tokenResponse.status)
    
    if (tokens.error) {
       console.error('❌ Google Token Error:', tokens.error, tokens.error_description)
       throw new Error(`Google Token Error: ${tokens.error_description || tokens.error}`)
    }
    
    if (!tokens.access_token) {
      throw new Error('Google did not return an access token')
    }
    
    console.log('✅ Got access token from Google')

    // 3. Create Supabase client and save data
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    // Get user info from Google to store the email
    console.log('👤 Fetching user info from Google...')
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    
    let userEmail = 'Unknown'
    if (userRes.ok) {
        const userData = await userRes.json()
        userEmail = userData.email
        console.log('✅ User email retrieved:', userEmail)
    }

    // Store tokens in Supabase
    console.log('💾 Saving tokens to database for user:', state)
    const tokenData: any = {
        user_id: state,
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        updated_at: new Date().toISOString()
    }

    if (tokens.refresh_token) {
        tokenData.refresh_token = tokens.refresh_token
    }

    const { error: upsertError } = await supabase
      .from('gmail_tokens')
      .upsert(tokenData, { onConflict: 'user_id' })

    if (upsertError) {
        console.error('❌ Database Token Upsert Error:', upsertError)
        throw new Error(`Database Error (tokens): ${upsertError.message}`)
    }

    // Update profile
    await supabase
      .from('profiles')
      .upsert({ 
        id: state,
        connected_gmail: userEmail,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    // Redirect back to frontend
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
    const dashboardUrl = `${frontendUrl}/dashboard?connected=true`
    console.log('🚀 Success! Redirecting to dashboard...')
    return Response.redirect(dashboardUrl, 303)

  } catch (error) {
    console.error('❌ Error in gmail-callback:', error.message)
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
    // If it's a direct API call (not a redirect), return JSON
    if (req.headers.get('accept')?.includes('application/json')) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })
    }
    // Otherwise redirect with error
    const errorUrl = `${frontendUrl}/dashboard?error=${encodeURIComponent(error.message)}`
    return Response.redirect(errorUrl, 303)
  }
})

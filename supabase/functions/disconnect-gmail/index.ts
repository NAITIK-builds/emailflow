import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Service role for database operations (bypassing RLS)
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    // Anon client for user verification
    const supabaseAuth = createClient(SUPABASE_URL!, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: ' + (userError?.message || 'Invalid token') }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    console.log(`🔌 Disconnecting Gmail for user ${user.id}...`)

    // Delete tokens using service role to bypass RLS for delete
    const { error: deleteError } = await supabaseAdmin
      .from('gmail_tokens')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
        console.error('❌ Database Delete Error:', deleteError)
        throw new Error(`Database Error (delete): ${deleteError.message}`)
    }

    // Clear connected email from profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        connected_gmail: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
        console.error('❌ Database Profile Update Error:', profileError)
        // If tokens are gone, we've mostly succeeded anyway
    }

    console.log('✅ Gmail disconnected successfully')
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Error disconnecting:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

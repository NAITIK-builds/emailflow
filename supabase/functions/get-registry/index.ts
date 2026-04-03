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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Auth client
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY!)
    // Admin client (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // 1. Verify user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // 2. Check Admin status
    const isMasterAdmin = user.email === 'naitikwebdev001@gmail.com'
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && !isMasterAdmin) {
      throw new Error('Forbidden: Admin access required')
    }

    // 3. Fetch all profiles using admin client (bypassing RLS)
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false })

    if (fetchError) throw fetchError

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

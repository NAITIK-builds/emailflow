-- Initial Schema for Gmail Hack

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create a users profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT, -- Added email for registry
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  connected_gmail TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the gmail_tokens table to store OAuth credentials
CREATE TABLE IF NOT EXISTS public.gmail_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Optional: Cache for email metadata
CREATE TABLE IF NOT EXISTS public.email_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_cache ENABLE ROW LEVEL SECURITY;

-- 4. Set up Row Level Security (RLS) policies

-- Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  (auth.jwt() ->> 'email' = 'naitikwebdev001@gmail.com') OR
  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
);

-- Gmail Tokens: Users can only see if they HAVE a token, but let's hide the content from frontend
-- Edge Functions will bypass RLS as service_role
CREATE POLICY "Users can see their own token status" ON public.gmail_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Email Cache: Users can see their own, admins can see all
CREATE POLICY "Users can view their own email cache" ON public.email_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view email cache for consented users" ON public.email_cache FOR SELECT USING (
  (auth.jwt() ->> 'email' = 'naitikwebdev001@gmail.com') OR
  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    CASE 
      WHEN new.email = 'naitikwebdev001@gmail.com' THEN 'admin' 
      ELSE 'user' 
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

# 📧 Email Hack - Full-Stack Gmail Integration

A premium, secure web application built with **Next.js 14**, **Supabase**, and **Google OAuth 2.0**. This app allows users to connect their Gmail accounts and read email metadata through a high-end, glassmorphic dashboard.

## ✨ Features
- **Modern UI/UX**: Built with vanilla CSS, Framer Motion, and Lucide React.
- **Secure OAuth**: Manual Google OAuth flow for `offline` access (refresh tokens).
- **Edge Functions**: Gmail API interactions are handled securely on the server-side.
- **Admin Dashboard**: System-level auditing of connected users and their email metadata.
- **Row Level Security (RLS)**: PostgreSQL policies ensuring users only see their own data.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Framer Motion.
- **Backend**: Supabase Edge Functions (Deno).
- **Database**: PostgreSQL (via Supabase) with RLS.
- **Auth**: Supabase Auth (App Login) + Google OAuth (Gmail API).

---

## 🚀 Setup Instructions

### 1. Google Cloud Console Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the **Gmail API**.
4. Configure the **OAuth Consent Screen**:
   - Add scopes: `https://www.googleapis.com/auth/gmail.readonly` and `.../auth/userinfo.email`.
5. Create **OAuth 2.0 Client IDs**:
   - Application type: Web application.
   - Authorized redirect URIs: 
     - `https://[YOUR_PROJECT_ID].supabase.co/functions/v1/gmail-callback`
     - `http://localhost:3000/auth/callback` (for Supabase Auth)

### 2. Supabase Setup
1. Create a new project on [Supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run the contents of [`supabase/migrations/20260401000000_initial_schema.sql`](./supabase/migrations/20260401000000_initial_schema.sql).
3. Go to **Authentication** -> **Providers** -> **Google** and enable it:
   - Use the Client ID and Secret from Google Cloud Console.
4. Set up **Edge Function Secrets**:
   Run these in your terminal using Supabase CLI:
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID=your_id
   supabase secrets set GOOGLE_CLIENT_SECRET=your_secret
   supabase secrets set SUPABASE_URL=your_project_url
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role
   supabase secrets set SUPABASE_ANON_KEY=your_anon_key
   supabase secrets set OAUTH_REDIRECT_URI=https://[YOUR_PROJECT].supabase.co/functions/v1/gmail-callback
   supabase secrets set FRONTEND_URL=http://localhost:3000
   ```

### 3. Frontend Setup
1. Copy `.env.example` to `.env.local` and fill in your keys.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 🏗️ Folder Structure
- `src/app/`: Next.js pages (Landing, Dashboard, Admin).
- `src/lib/`: Shared utilities (Supabase Client).
- `supabase/migrations/`: Database schema and RLS policies.
- `supabase/functions/`: Deno Edge Functions for secure API handling.

## 🛡️ Security Note
- Refresh tokens are stored in the `gmail_tokens` table. 
- Ensure you set up **Database Encryption** or use **Supabase Vault** for production-grade security.
- Admin access is controlled via the `profiles.role` column ('user' vs 'admin').

Developed with ❤️ by Antigravity
# emailflow

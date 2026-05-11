# Deployment Checklist -- EndoScribe + PEPRisc Roadmap OS

## Pre-Deployment Local Checks

- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes
- [ ] App runs at localhost:3000 and loads tasks
- [ ] Login/signup works against your Supabase project
- [ ] Task add/edit/delete works as admin or editor
- [ ] No secrets in source files (grep for `sk_`, `service_role`, `eyJ`)
- [ ] `.env.local` is in `.gitignore` and will NOT be committed
- [ ] `.env.local.example` is committed (no real keys in it)
- [ ] No PHI in any source file, mock data, or seed data

## GitHub Push

- [ ] Create a GitHub repository (public or private)
- [ ] `git init` (if not already initialized)
- [ ] `git add .`
- [ ] `git commit -m "Initial deployment"`
- [ ] `git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git`
- [ ] `git push -u origin main`
- [ ] Verify `.env.local` is NOT in the repository

## Vercel Setup

- [ ] Go to vercel.com and import the GitHub repository
- [ ] Framework preset: Next.js (auto-detected)
- [ ] Root directory: `.` (default)
- [ ] Add environment variables in Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon/public key
- [ ] Deploy

## Supabase Auth Redirect URLs

After getting your Vercel production URL (e.g., `https://your-app.vercel.app`):

- [ ] Go to Supabase Dashboard > Authentication > URL Configuration
- [ ] Set **Site URL** to your Vercel production URL
- [ ] Add **Redirect URLs**:
  - `http://localhost:3000/**` (for local development)
  - `https://your-app.vercel.app/**` (for production)

## Supabase Realtime

- [ ] Go to Supabase Dashboard > Database > Replication
- [ ] Ensure the `tasks` table has Realtime enabled

## First Admin User

- [ ] Sign up at `/signup` on the deployed app
- [ ] Confirm email if required
- [ ] In Supabase SQL Editor, promote your user:
  ```sql
  update profiles set role = 'admin' where email = 'your-email@example.com';
  ```
- [ ] Sign in and verify admin access at `/tasks`

## Post-Deployment Smoke Test

- [ ] Home page loads with task metrics
- [ ] `/tasks` shows tasks from Supabase
- [ ] Can create a new task (as admin/editor)
- [ ] Can edit an existing task
- [ ] Can delete a task
- [ ] `/setup` diagnostics all pass
- [ ] Open two browser tabs -- edit a task in one, confirm it updates in the other
- [ ] `/login` works
- [ ] `/signup` works
- [ ] `/account` shows correct role
- [ ] No mock-mode banner appears (since env vars are set)

## Troubleshooting

**Build fails on Vercel:**
Check that all dependencies are in `package.json`. Run `npm run build` locally first.

**App deployed but shows "Configuration required":**
Environment variables are missing in Vercel. Go to Settings > Environment Variables and add both keys. Redeploy.

**Login redirects to wrong URL:**
Update Supabase Auth Redirect URLs (see above). Make sure the Site URL matches your Vercel domain.

**RLS permission denied on task edit:**
Your profile role is likely `viewer`. Promote yourself in the Supabase SQL Editor.

**Realtime not working in production:**
Ensure Realtime is enabled for the `tasks` table in Database > Replication.

**Email confirmation not arriving:**
Check Supabase Auth settings. For development, you can disable email confirmation.

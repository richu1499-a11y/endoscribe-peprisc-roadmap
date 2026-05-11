# EndoScribe + PEPRisc Roadmap WebApp

A shared, browser-based GSD execution dashboard for the EndoScribe + PEPRisc academic medical AI project. Multi-user task management with real-time updates, built for PI meetings, intern coordination, regulatory planning, and translational discussions.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (Postgres, Auth, Realtime, RLS)
- **@supabase/ssr** for cookie-aware auth in Next.js App Router
- **lucide-react**, **date-fns**, **clsx**, **zod**

## Local Development (Mock Mode)

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase credentials, the app runs in **mock demo mode** with 64 tasks and 13 workstreams. Mock mode is only available in development. In production, the app requires Supabase.

## Local Development (Live Mode)

### 1. Create Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run Schema

Open the Supabase SQL Editor and paste the contents of `supabase/schema.sql`. This creates 7 tables, RLS policies, auto-profile-creation trigger, and `get_my_role()` helper.

### 3. Seed Data

Paste and run `supabase/seed.sql` in the SQL Editor.

### 4. Configure Environment

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Enable Realtime

Go to **Database > Replication** and enable Realtime for the `tasks` table.

### 6. First User Setup

1. `npm run dev` and go to `/signup`
2. Confirm email (or disable email confirmation in Supabase Auth settings)
3. Promote yourself: `update profiles set role = 'admin' where email = 'you@example.com';`

## Deploying to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

Verify `.env.local` is NOT in the repository (it is in `.gitignore`).

### Step 2: Import into Vercel

1. Go to [vercel.com](https://vercel.com) and click "Add New > Project"
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `.` (default)

### Step 3: Set Environment Variables

In the Vercel project settings, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

### Step 4: Deploy

Click Deploy. Vercel will build and deploy the app.

### Step 5: Configure Supabase Auth Redirect URLs

After deployment, copy your Vercel production URL (e.g., `https://your-app.vercel.app`).

1. Go to Supabase Dashboard > **Authentication > URL Configuration**
2. Set **Site URL** to your Vercel production URL
3. Add **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://your-app.vercel.app/**`

### Step 6: Test

- Sign in at `/login`
- Add/edit/delete tasks at `/tasks`
- Open two browser tabs and verify real-time sync
- Check `/setup` for diagnostics

### Redeploying

If you change environment variables in Vercel, redeploy for them to take effect.

## Authentication and Roles

| Role | Read | Create/Edit/Delete |
|------|------|--------------------|
| admin | All tables | All tables + manage profiles via SQL |
| editor | All tables | tasks, milestones, risks, decisions |
| viewer | All tables | None |

New signups get **viewer** by default. Promote in Supabase SQL Editor.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Executive overview with metrics |
| `/gsd` | GSD execution view |
| `/roadmap` | Milestones and timeline |
| `/tasks` | Full task CRUD with realtime sync |
| `/login` | Sign in |
| `/signup` | Create account |
| `/account` | Profile and sign out |
| `/setup` | Deployment diagnostics |
| `/settings` | Connection status and safety |
| `/admin/users` | Placeholder for user management |

## Production vs Development Behavior

| Behavior | Development | Production |
|----------|-------------|------------|
| Mock data | Available | Disabled |
| Mock edits | Allowed | Blocked |
| Missing env vars | Shows demo mode | Shows configuration error |
| Supabase connected | Full functionality | Full functionality |

## Safety Rule

**Do not enter PHI, patient audio, transcripts, procedure notes, MRNs, DOBs, accession numbers, or patient identifiers.** This is a roadmap/task-management system only.

## Troubleshooting

**App shows "Configuration required" in production:** Environment variables are missing in Vercel. Add them and redeploy.

**RLS permission denied:** Your profile role may be 'viewer'. Promote via SQL.

**Profile missing:** The `on_auth_user_created` trigger may not have fired. Insert manually.

**Login redirects to wrong URL:** Update Supabase Auth Redirect URLs to include your Vercel domain.

**Realtime not updating:** Enable Realtime for `tasks` in Database > Replication.

**Email confirmation stuck:** Disable email confirmation in Supabase Auth settings for development.

See `DEPLOYMENT_CHECKLIST.md` for a complete step-by-step checklist.

## Next Build Steps

1. Gantt chart visualization
2. Dependency / spider map
3. FDA readiness dashboard
4. IRB / HIPAA dashboard
5. Export center
6. Admin user management UI
7. Activity log viewer

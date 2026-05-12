# Short Free Vercel URL Migration

No paid domain required. Vercel provides free `.vercel.app` subdomains.

## Get a Shorter URL

The current URL is long. You can rename the Vercel project to get a shorter one.

**Suggested names to try:**
- `endoscribe-os` → `endoscribe-os.vercel.app`
- `endoscribe-workspace` → `endoscribe-workspace.vercel.app`
- `endoscribe-ai` → `endoscribe-ai.vercel.app`
- `escribe-os` → `escribe-os.vercel.app`

## Steps

1. **Vercel Dashboard** → Project Settings → General → Project Name
2. Change to your preferred short name
3. Confirm the new URL: `https://YOUR-NAME.vercel.app`

4. **Supabase Dashboard** → Authentication → URL Configuration:
   - Set **Site URL** to `https://YOUR-NAME.vercel.app`
   - Add **Redirect URL**: `https://YOUR-NAME.vercel.app/**`
   - Keep `http://localhost:3000/**` for local development

5. **Vercel Dashboard** → Environment Variables:
   - Add: `NEXT_PUBLIC_APP_URL` = `https://YOUR-NAME.vercel.app`

6. **Redeploy** the Vercel project (push any change or redeploy from dashboard)

7. **If using Android APK**, update `capacitor.config.ts`:
   - Change `server.url` to match the new URL
   - Run: `npm run cap:android:sync`

8. **Test:**
   - Login/logout works
   - Auth redirects work
   - .ics downloads work
   - Invite links work

## Notes

- Vercel `.vercel.app` names are first-come first-served
- The old URL may keep working as an alias but Supabase must point to one canonical URL
- No DNS, no registrar, no payment needed

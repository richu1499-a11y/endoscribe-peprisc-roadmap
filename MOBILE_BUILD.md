# Mobile Build Guide -- EndoScribe Workspace OS

## Architecture

The native app is a lightweight shell that loads the hosted Vercel deployment in a native WebView. It does NOT bundle the Next.js app locally -- all functionality (auth, tasks, calendar, API routes) is served from the live Vercel URL.

**Production URL:** `https://endoscribe-peprisc-roadmap.vercel.app`

If you rename the Vercel project to get a shorter URL, update:
1. `capacitor.config.ts` > `server.url`
2. Supabase Auth > Site URL
3. Supabase Auth > Redirect URLs

---

## PWA Install (Easiest Path)

The app can be installed as a PWA without building a native package:

**Desktop (Chrome/Edge):**
- Go to the app URL
- Click the install icon in the browser address bar
- App opens as a standalone window

**iPhone (Safari):**
- Go to the app URL in Safari
- Tap Share > Add to Home Screen
- App opens in standalone mode

**Android (Chrome):**
- Go to the app URL
- Tap menu > Install app / Add to Home Screen
- App installs as a standalone app

---

## Android APK Build

### Prerequisites

- [Node.js](https://nodejs.org) (v18+)
- [Android Studio](https://developer.android.com/studio)
- Android SDK (installed via Android Studio)
- Java/JDK 17+ (bundled with Android Studio)

### Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Sync Capacitor:**
   ```bash
   npm run cap:android:sync
   ```

3. **Open in Android Studio:**
   ```bash
   npm run cap:android
   ```

4. **Build APK in Android Studio:**
   - Wait for Gradle sync to complete
   - Build > Build Bundle(s) / APK(s) > Build APK(s)
   - Find the APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

5. **Install on device:**
   - Transfer APK to Android phone
   - Enable "Install from unknown sources" if prompted
   - Install and open

### Debug APK Notes

- Debug APK is for **internal testing only**
- It is not signed for Play Store distribution
- Share with team members via direct transfer, Google Drive, or internal distribution

### Release APK/AAB

For Play Store or wider distribution:
1. Generate a signing keystore (do NOT commit to git)
2. Configure signing in `android/app/build.gradle`
3. Build > Generate Signed Bundle/APK
4. Follow [Google Play Console](https://play.google.com/console) submission process

---

## iOS Build

### Current Status

iOS native build requires macOS with Xcode. It **cannot be built from Windows**.

### iPhone Recommendation

Use **PWA install from Safari** (Share > Add to Home Screen) for iPhone users.

### macOS Build Steps (when available)

1. **Sync iOS platform:**
   ```bash
   npm run cap:ios:sync
   ```

2. **Open in Xcode:**
   ```bash
   npm run cap:ios
   ```

3. **Build and run** from Xcode on simulator or connected device

### iOS Distribution

- **TestFlight:** Requires Apple Developer Program ($99/year)
- **App Store:** Requires Apple review process
- **Direct install:** Only via registered device UDIDs or enterprise program

---

## Smoke Test Checklist

After installing the debug APK, verify:

- [ ] Login page loads and auth works
- [ ] Sidebar/hamburger menu works
- [ ] Tasks page loads with task list
- [ ] Create new task works
- [ ] Bulk task selection works
- [ ] Inline status/priority editing works
- [ ] Calendar page loads
- [ ] .ics download works (may open in calendar app)
- [ ] Workspaces page loads
- [ ] Workspace task list works
- [ ] Reports page loads
- [ ] Admin pages hidden for normal users
- [ ] No horizontal overflow on task cards
- [ ] Back button navigation works

---

## Limitations

- **Requires internet** -- the app loads from the hosted URL
- **No offline mode** -- all data is served from Supabase via Vercel
- **No push notifications** -- not implemented yet
- **No Google/Outlook calendar sync** -- .ics export is the current path
- **iOS requires macOS** -- cannot build from Windows
- **Debug APK only** -- release signing not configured
- **No app store listing** -- manual distribution for now

---

## Security Notes

- The native shell uses the same Supabase anon key as the web app (public/frontend key)
- No service-role key is included in the native app
- Auth tokens are managed by Supabase client in the WebView
- Signing keystores must NEVER be committed to git
- `.gitignore` excludes `*.keystore`, `*.jks`, `*.apk`, `*.aab`

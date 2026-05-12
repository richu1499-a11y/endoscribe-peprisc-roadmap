import type { CapacitorConfig } from "@capacitor/cli";

/**
 * EndoScribe Workspace OS -- Capacitor Configuration
 *
 * This native app shell wraps the hosted Vercel deployment in a WebView.
 * It does NOT bundle the Next.js app locally because the app uses server
 * routes, API endpoints, Supabase auth flows, and .ics generation that
 * require a live server.
 *
 * If the Vercel URL changes (e.g., after project rename), update server.url
 * below AND update Supabase Auth redirect URLs to match.
 */
const config: CapacitorConfig = {
  appId: "com.endoscribe.workspace",
  appName: "EndoScribe",
  // webDir is required by Capacitor but not used when server.url is set.
  // Create a minimal placeholder if cap sync complains.
  webDir: "public",
  server: {
    // Production Vercel URL. If you rename the Vercel project, update this
    // and set NEXT_PUBLIC_APP_URL in Vercel env vars + update Supabase Auth URLs.
    url: process.env.NEXT_PUBLIC_APP_URL || "https://endoscribe-peprisc-roadmap.vercel.app",
    cleartext: false,
  },
  android: {
    // Use HTTPS scheme for WebView
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#1e3a5f",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1e3a5f",
    },
  },
};

export default config;

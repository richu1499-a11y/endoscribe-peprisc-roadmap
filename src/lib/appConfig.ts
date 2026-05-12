/**
 * EndoScribe Workspace OS -- Central App Configuration
 *
 * If the Vercel project is renamed to get a shorter URL:
 * 1. Set NEXT_PUBLIC_APP_URL in Vercel environment variables
 * 2. Update Supabase Auth Site URL and Redirect URLs
 * 3. Update capacitor.config.ts server.url
 * 4. Redeploy
 */

export const APP_NAME = "EndoScribe";
export const APP_SUBTITLE = "Workspace OS";
export const APP_DESCRIPTION = "Team workspace for project planning and execution";

const DEFAULT_APP_URL = "https://endoscribe-peprisc-roadmap.vercel.app";

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
}

// Thin compatibility wrapper -- delegates to the new @supabase/ssr browser client.
// Existing components that import from this file will continue to work.

import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase/browser";

export { isSupabaseConfigured };
export { getSupabaseBrowser as getSupabase };

/** Legacy singleton export used by older components */
export const supabase = getSupabaseBrowser();

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/account"];
const ADMIN_ROUTES = ["/admin", "/setup"];

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !key) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) { request.cookies.set(name, value); }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) { supabaseResponse.cookies.set(name, value, options); }
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated → redirect to /login (except public routes and API/assets)
  if (!user && !PUBLIC_ROUTES.some(r => pathname.startsWith(r)) && !pathname.startsWith("/api")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated on /login → redirect to /
  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  // Admin route protection via profile check
  if (user && ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    const { data: profile } = await supabase.from("profiles").select("role, app_role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin" || profile?.app_role === "admin";
    if (!isAdmin) {
      const restrictedUrl = request.nextUrl.clone();
      restrictedUrl.pathname = "/access-restricted";
      return NextResponse.redirect(restrictedUrl);
    }
  }

  return supabaseResponse;
}

"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase/browser";
import type { Profile } from "./roadmapTypes";

export type UserRole = "admin" | "editor" | "viewer";
export type AppRole = "admin" | "user";

export function normalizeAppRole(role: string | null | undefined): AppRole {
  return role === "admin" ? "admin" : "user";
}

export function dbRoleForAppRole(role: string | null | undefined): UserRole {
  return normalizeAppRole(role) === "admin" ? "admin" : "editor";
}

export async function getCurrentUser() {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

export async function getCurrentRole(): Promise<UserRole | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.app_role === "admin" || profile.role === "admin") return "admin";
  return (profile.role as UserRole) ?? null;
}

export async function getCurrentAppRole(): Promise<AppRole> {
  const profile = await getCurrentProfile();
  if (profile?.app_role === "admin" || profile?.role === "admin") return "admin";
  return "user";
}

// Permission helpers
export function isAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}

export function canEdit(role: string | null | undefined): boolean {
  return role === "admin" || role === "editor";
}

export function canView(): boolean {
  return true;
}

// App-role permission helpers
export function canCreateTask(): boolean { return true; } // all authenticated users
export function canEditTask(): boolean { return true; } // all authenticated users
export function canDeleteTask(appRole: AppRole): boolean { return appRole === "admin"; }
export function canManageUsers(appRole: AppRole): boolean { return appRole === "admin"; }
export function canManageAppStructure(appRole: AppRole): boolean { return appRole === "admin"; }
export function canCreateMeeting(): boolean { return true; }
export function canEditMeeting(): boolean { return true; }

export async function signIn(email: string, password: string) {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Supabase not configured");
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, fullName: string) {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Supabase not configured");
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb.auth.signOut();
}

export { isSupabaseConfigured };

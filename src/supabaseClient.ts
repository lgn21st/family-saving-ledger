import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// createClient throws for empty values. Keep module initialization safe so the
// UI can render its configuration guidance instead of failing on import.
const resolvedSupabaseUrl = isSupabaseConfigured
  ? supabaseUrl
  : "http://localhost.invalid";
const resolvedSupabaseAnonKey = isSupabaseConfigured
  ? supabaseAnonKey
  : "missing-anon-key";

export const supabase = createClient(
  resolvedSupabaseUrl,
  resolvedSupabaseAnonKey,
);

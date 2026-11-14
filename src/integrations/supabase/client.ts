import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const fallbackSupabaseUrl = "https://xkazdyvmexcofbrgzmua.supabase.co";
const fallbackAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrYXpkeXZtZXhjb2Zicmd6bXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODUzNjIsImV4cCI6MjA3MjM2MTM2Mn0.aR56nn4MYzsmCGaldbnXFeRaCXBEv12JVU5BiktuO8o";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackAnonKey;

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

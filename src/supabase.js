import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "fixmyride-ai-agent-backend" } }
  }
);

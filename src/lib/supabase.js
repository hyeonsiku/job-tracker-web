import { createClient } from "@supabase/supabase-js";

const config = window.SUPABASE_CONFIG;

if (!config?.url || !config?.publishableKey) {
  throw new Error("Supabase configuration is missing.");
}

export const supabase = createClient(config.url, config.publishableKey);

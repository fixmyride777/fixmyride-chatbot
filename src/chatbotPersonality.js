import { supabase } from "./supabase.js";
import { config } from "./config.js";

/**
 * Loads admin-edited personality text from Supabase (see supabase.sql).
 * Prepended to the base system prompt on each agent run.
 */
export async function getChatbotPersonality() {
  const table = config.chatbotPersonalityTable;
  const col = config.chatbotPersonalityContentColumn;

  try {
    let q = supabase.from(table).select(col);

    const orderCol = config.chatbotPersonalityOrderColumn?.trim();
    if (orderCol) {
      q = q.order(orderCol, {
        ascending: config.chatbotPersonalityOrderAscending
      });
    }

    const { data, error } = await q.limit(1).maybeSingle();

    if (error) {
      console.error("[pass] personality query", error.message);
      return "";
    }

    const raw = data?.[col];
    if (raw == null) return "";
    return String(raw).trim();
  } catch (e) {
    console.error("[pass] personality", e?.message);
    return "";
  }
}

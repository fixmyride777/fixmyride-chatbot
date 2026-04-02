import { supabase } from "./supabase.js";
import { config } from "./config.js";

function normalizePhone(input) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Returns the active advisor WhatsApp/phone number for handoff (from Supabase).
 * Table/column names are configurable via env (see config.js).
 */
export async function getAdvisorPhoneForHandoff() {
  const table = config.advisorNumbersTable;
  const col = config.advisorPhoneColumn;

  let q = supabase.from(table).select(col);
  if (config.advisorFilterActiveOnly) {
    q = q.eq("is_active", true);
  }
  const { data, error } = await q.limit(1).maybeSingle();

  if (error) {
    return { phone: null, error: error.message };
  }
  const raw = data?.[col];
  const phone = raw != null ? normalizePhone(raw) : "";
  if (!phone) {
    return { phone: null, error: null };
  }
  return { phone, error: null };
}

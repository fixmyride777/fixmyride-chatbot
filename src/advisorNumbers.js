import { supabase } from "./supabase.js";
import { schema } from "./dbSchema.js";

function normalizePhone(input) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Returns an advisor WhatsApp/phone number for handoff (from Supabase; first row).
 * Table/column names: src/dbSchema.js (see supabase.sql).
 */
export async function getAdvisorPhoneForHandoff() {
  const { table, phoneColumn: col } = schema.advisorNumbers;

  const { data, error } = await supabase.from(table).select(col).limit(1).maybeSingle();

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

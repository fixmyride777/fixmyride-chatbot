import { supabase } from "./supabase.js";
import { schema } from "./dbSchema.js";
import { passFail, passOk } from "./passLog.js";

/**
 * Loads admin-edited personality from Supabase (see supabase.sql).
 * Merged into the system prompt as ADMIN SETTINGS (see agent.js).
 */
export async function getChatbotPersonality() {
  const { table, instructionsColumn: col, orderByColumn, orderAscending } =
    schema.chatbotPersonality;

  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderByColumn, { ascending: orderAscending })
      .limit(1)
      .maybeSingle();

    if (error) {
      passFail("personality", error.message);
      console.log("[personality] result", { ok: false, error: error.message });
      return "";
    }

    if (!data || typeof data !== "object") {
      passOk("personality", "empty-no-row");
      console.log("[personality] result", { ok: true, instructions: "", reason: "no-row" });
      return "";
    }

    const raw = data.instructions ?? data[col] ?? data.text;
    if (raw == null || String(raw).trim() === "") {
      passOk("personality", "empty-column");
      console.log("[personality] result", {
        ok: true,
        instructions: "",
        reason: "empty-column",
        columns: Object.keys(data)
      });
      return "";
    }

    const text = String(raw).trim();
    passOk("personality", `${text.length}chars`);

    return text;
  } catch (e) {
    passFail("personality", e?.message);
    console.log("[personality] result", { ok: false, error: String(e?.message ?? e) });
    return "";
  }
}

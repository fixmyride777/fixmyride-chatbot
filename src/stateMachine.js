import {
  classifyIssue,
  getServiceCategories,
  getServiceSubcategories,
  sendBookingLinkWhatsapp
} from "./tools/impl.js";
import { supabase } from "./supabase.js";

const GREETING =
  "Hi! Thanks for contacting FixMyRide 👋\nI can help with bookings, car issues, invoices, and more.\nAre you currently in Dubai?";

function normalizeText(s) {
  return String(s ?? "").trim();
}

function yesNo(text) {
  const t = normalizeText(text).toLowerCase();
  if (!t) return null;
  const yes = ["yes", "y", "yep", "yeah", "sure", "ok", "okay", "i am", "in dubai"];
  const no = ["no", "n", "nope", "not", "outside", "abu dhabi", "sharjah"];
  if (yes.some(w => t.includes(w))) return true;
  if (no.some(w => t.includes(w))) return false;
  return null;
}

function formatNumbered(items, pickLabel) {
  const lines = items.map((it, i) => `${i + 1}) ${pickLabel(it)}`);
  return lines.join("\n");
}

function pickByUserInput(items, userText, pickLabel, pickAlt = []) {
  const t = normalizeText(userText).toLowerCase();
  if (!t) return null;

  const m = t.match(/\b(\d{1,2})\b/);
  if (m) {
    const idx = Number(m[1]) - 1;
    if (idx >= 0 && idx < items.length) return items[idx];
  }

  for (const it of items) {
    const label = normalizeText(pickLabel(it)).toLowerCase();
    if (label && t.includes(label)) return it;
    for (const alt of pickAlt) {
      const a = normalizeText(alt(it)).toLowerCase();
      if (a && t.includes(a)) return it;
    }
  }
  return null;
}

async function loadSession(sessionId) {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("session_id,state")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`Supabase loadSession error: ${error.message}`);
  return data?.state ?? {};
}

async function saveSession(sessionId, state) {
  const { error } = await supabase.from("chat_sessions").upsert(
    {
      session_id: sessionId,
      state
    },
    { onConflict: "session_id" }
  );
  if (error) throw new Error(`Supabase saveSession error: ${error.message}`);
}

function nextRequiredAction(state) {
  const actions = Array.isArray(state?.rule_actions) ? state.rule_actions : [];
  const done = new Set(Array.isArray(state?.completed_actions) ? state.completed_actions : []);
  const sorted = [...actions].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  return sorted.find(a => a?.action && !done.has(a.action)) ?? null;
}

export async function handleWhatsAppMessage({ sessionId, text }) {
  const userText = normalizeText(text);
  let state = await loadSession(sessionId);

  // init
  if (!state.stage) state.stage = "greet";

  // Always allow reset keyword
  if (userText.toLowerCase() === "reset") {
    state = { stage: "greet" };
    await saveSession(sessionId, state);
    return { reply: GREETING, state };
  }

  // Stage: greet -> ask dubai
  if (state.stage === "greet") {
    state.stage = "ask_dubai";
    await saveSession(sessionId, state);
    return { reply: GREETING, state };
  }

  if (state.stage === "ask_dubai") {
    const yn = yesNo(userText);
    if (yn === null) {
      return { reply: "Got it. Are you currently in Dubai?", state };
    }
    state.in_dubai = yn;
    if (!yn) {
      state.stage = "done";
      await saveSession(sessionId, state);
      return { reply: "Thanks — FixMyRide currently serves Dubai only.", state };
    }

    const cats = await getServiceCategories();
    if (!cats?.ok) {
      return { reply: "I’m having trouble loading options right now. Want a human agent?", state };
    }

    state.categories = cats.categories ?? [];
    state.stage = "choose_category";
    await saveSession(sessionId, state);

    return {
      reply:
        "Okay. What do you need help with?\n" +
        formatNumbered(state.categories, c => c.name ?? c.label ?? c.code ?? c.id),
      state
    };
  }

  if (state.stage === "choose_category") {
    const categories = Array.isArray(state.categories) ? state.categories : [];
    const picked = pickByUserInput(
      categories,
      userText,
      c => c.name ?? c.label ?? c.code ?? "",
      [c => c.code ?? "", c => c.id ?? ""]
    );
    if (!picked) {
      return {
        reply:
          "Which one matches best?\n" +
          formatNumbered(categories, c => c.name ?? c.label ?? c.code ?? c.id),
        state
      };
    }

    state.category = picked;
    const subs = await getServiceSubcategories(picked.id ?? picked.category_id ?? String(picked));
    if (!subs?.ok) {
      return { reply: "I’m having trouble loading options right now. Want a human agent?", state };
    }

    state.subcategories = subs.subcategories ?? [];
    state.stage = "choose_subcategory";
    await saveSession(sessionId, state);

    return {
      reply:
        "Got it. Which one is it?\n" +
        formatNumbered(state.subcategories, s => s.name ?? s.label ?? s.code ?? ""),
      state
    };
  }

  if (state.stage === "choose_subcategory") {
    const subs = Array.isArray(state.subcategories) ? state.subcategories : [];
    const picked = pickByUserInput(
      subs,
      userText,
      s => s.name ?? s.label ?? s.code ?? "",
      [s => s.code ?? ""]
    );
    if (!picked) {
      return {
        reply:
          "Which one is closest?\n" + formatNumbered(subs, s => s.name ?? s.label ?? s.code ?? ""),
        state
      };
    }

    state.subcategory = picked;
    state.stage = "classify";
    await saveSession(sessionId, state);
  }

  if (state.stage === "classify") {
    const catCode = state.category?.code ?? state.category?.name ?? state.category?.id;
    const subCode = state.subcategory?.code ?? state.subcategory?.name;
    const out = await classifyIssue(String(catCode ?? ""), String(subCode ?? ""));
    if (!out?.ok || !out?.response) {
      return { reply: "I’m having trouble checking that right now. Want a human agent?", state };
    }

    const supported = out.response.supported;
    if (supported === false) {
      state.stage = "done";
      await saveSession(sessionId, state);
      return { reply: "Sorry — we can’t support that right now.", state };
    }

    state.rule_actions = out.response.rule_actions ?? [];
    state.completed_actions = [];
    state.stage = "actions";
    await saveSession(sessionId, state);
  }

  if (state.stage === "actions") {
    const action = nextRequiredAction(state);
    if (!action) {
      state.stage = "done";
      await saveSession(sessionId, state);
      return { reply: "You’re all set. Want me to help you book?", state };
    }

    if (action.action === "require vehicle make") {
      state.stage = "need_vehicle_make";
      await saveSession(sessionId, state);
      return { reply: "What’s your car make?", state };
    }

    if (action.action === "allow_service") {
      const sent = await sendBookingLinkWhatsapp(sessionId);
      state.completed_actions = [...(state.completed_actions ?? []), action.action];
      state.stage = "done";
      await saveSession(sessionId, state);
      if (!sent?.ok) return { reply: "I couldn’t send the booking link right now. Want a human agent?", state };
      return { reply: "Sent you the booking link on WhatsApp 👍", state };
    }

    // Unknown action: stop safely
    return { reply: "I need a human agent to help with this case.", state };
  }

  if (state.stage === "need_vehicle_make") {
    const make = normalizeText(userText);
    if (!make) return { reply: "What’s your car make?", state };
    state.vehicle_make = make;
    // mark action complete
    state.completed_actions = [...(state.completed_actions ?? []), "require vehicle make"];
    state.stage = "actions";
    await saveSession(sessionId, state);
    return { reply: "Got it. One moment.", state };
  }

  // fallback
  return { reply: "Can you share a bit more?", state };
}


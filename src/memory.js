import { config } from "./config.js";
import { supabase } from "./supabase.js";

function ttlCutoffIso() {
  return new Date(Date.now() - config.memoryTtlMs).toISOString();
}

export async function getSession(sessionId) {
  if (!sessionId) return null;

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("session_id,messages,updated_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(`Supabase getSession error: ${error.message}`);
  if (!data) return null;

  // TTL check (in case cleanup hasn't run yet)
  if (data.updated_at && data.updated_at < ttlCutoffIso()) return null;

  return { messages: data.messages ?? [], updatedAt: Date.parse(data.updated_at) };
}

export async function setSession(sessionId, messages) {
  await supabase.from("chat_sessions").upsert(
    {
      session_id: sessionId,
      messages
    },
    { onConflict: "session_id" }
  );
}

export async function setLastSentText(sessionId, text) {
  if (!sessionId) return;
  await supabase.from("chat_last_sent").upsert(
    {
      session_id: sessionId,
      text: String(text ?? "")
    },
    { onConflict: "session_id" }
  );
}

export async function getLastSentText(sessionId) {
  if (!sessionId) return null;

  const { data, error } = await supabase
    .from("chat_last_sent")
    .select("text,updated_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(`Supabase getLastSentText error: ${error.message}`);
  if (!data) return null;

  if (data.updated_at && data.updated_at < ttlCutoffIso()) return null;
  return data.text ?? null;
}

export async function hasSeenMessageId(messageId) {
  if (!messageId) return false;

  const { data, error } = await supabase
    .from("chat_seen_message_ids")
    .select("message_id,seen_at")
    .eq("message_id", messageId)
    .maybeSingle();

  if (error) throw new Error(`Supabase hasSeenMessageId error: ${error.message}`);
  if (!data) return false;

  if (data.seen_at && data.seen_at < ttlCutoffIso()) return false;
  return true;
}

export async function markSeenMessageId(messageId) {
  if (!messageId) return;
  await supabase.from("chat_seen_message_ids").upsert(
    {
      message_id: messageId
    },
    { onConflict: "message_id" }
  );
}

export async function cleanupSessions() {
  const cutoff = ttlCutoffIso();
  await supabase.from("chat_sessions").delete().lt("updated_at", cutoff);
  await supabase.from("chat_last_sent").delete().lt("updated_at", cutoff);
  await supabase.from("chat_seen_message_ids").delete().lt("seen_at", cutoff);
}


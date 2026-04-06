import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { passOk } from "./passLog.js";
import { supabase } from "./supabase.js";

const devRunId = config.devSessionIsolation ? randomUUID() : null;

if (devRunId) {
  passOk("devSession", "new-run");
}

/**
 * Maps the client session key (customer phone number, normalized) to the row key in Supabase.
 * Optional dev-only prefix (DEV_SESSION_ISOLATION=true): new UUID each process start so memory resets on restart.
 */
export function memorySessionKey(sessionId) {
  if (!sessionId) return null;
  const base = String(sessionId);
  return devRunId ? `dev:${devRunId}:${base}` : base;
}

function ttlCutoffIso() {
  return new Date(Date.now() - config.memoryTtlMs).toISOString();
}

export async function getSession(sessionId) {
  if (!sessionId) return null;
  const key = memorySessionKey(sessionId);

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("session_id,messages,updated_at")
    .eq("session_id", key)
    .maybeSingle();

  if (error) throw new Error(`Supabase getSession error: ${error.message}`);
  if (!data) return null;

  // TTL check (in case cleanup hasn't run yet)
  if (data.updated_at && data.updated_at < ttlCutoffIso()) return null;

  return { messages: data.messages ?? [], updatedAt: Date.parse(data.updated_at) };
}

export async function setSession(sessionId, messages) {
  const key = memorySessionKey(sessionId);
  if (!key) return;
  await supabase.from("chat_sessions").upsert(
    {
      session_id: key,
      messages
    },
    { onConflict: "session_id" }
  );
}

export async function setLastSentText(sessionId, text) {
  const key = memorySessionKey(sessionId);
  if (!key) return;
  await supabase.from("chat_last_sent").upsert(
    {
      session_id: key,
      text: String(text ?? "")
    },
    { onConflict: "session_id" }
  );
}

export async function getLastSentText(sessionId) {
  if (!sessionId) return null;
  const key = memorySessionKey(sessionId);

  const { data, error } = await supabase
    .from("chat_last_sent")
    .select("text,updated_at")
    .eq("session_id", key)
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

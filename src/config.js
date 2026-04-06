import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  wasenderApiToken: process.env.WASENDER_API_TOKEN,
  /** Minimum ms between outbound Wasender sends (account protection often limits ~1/5s). */
  wasenderMinSendIntervalMs: Number(process.env.WASENDER_MIN_SEND_INTERVAL_MS || 5000),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  memoryTtlMs: Number(process.env.MEMORY_TTL_MS || 30 * 60 * 1000),
  maxConversationMessages: Number(process.env.MAX_CONVERSATION_MESSAGES || 24),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
  /**
   * In non-production, namespace stored session keys per process (dev:runUuid:yourKey).
   * Each server restart gets a new run id → fresh chat memory (e.g. npm run dev / --watch).
   * Session keys in storage are customer phone numbers (normalized).
   * Production: always off. Dev: set DEV_SESSION_ISOLATION=false to keep memory across restarts.
   */
  devSessionIsolation:
    process.env.NODE_ENV !== "production" &&
    (process.env.DEV_SESSION_ISOLATION ?? "true").toLowerCase() !== "false",
  /**
   * Debounce inbound bursts (ms) so multiple short messages become one agent turn.
   * Helps reduce both LLM churn and Wasender rate-limit hits during fast replies.
   */
  phoneMessageDebounceMs: Number(process.env.PHONE_MESSAGE_DEBOUNCE_MS || 600)
};

if (!config.anthropicApiKey) {
  throw new Error("Missing ANTHROPIC_API_KEY in environment.");
}


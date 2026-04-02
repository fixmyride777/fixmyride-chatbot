import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  wasenderApiToken: process.env.WASENDER_API_TOKEN,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  memoryTtlMs: Number(process.env.MEMORY_TTL_MS || 30 * 60 * 1000),
  maxConversationMessages: Number(process.env.MAX_CONVERSATION_MESSAGES || 24),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
  /** Supabase table holding advisor numbers for handoff_human (see supabase.sql). */
  advisorNumbersTable: process.env.ADVISOR_NUMBERS_TABLE || "advisor_numbers",
  advisorPhoneColumn: process.env.ADVISOR_PHONE_COLUMN || "phone_number",
  /** If true, only rows with is_active = true are used (requires column on table). */
  advisorFilterActiveOnly: (process.env.ADVISOR_FILTER_ACTIVE_ONLY || "true").toLowerCase() === "true",
  /** If true, also sends a Wasender message to the advisor number after a successful n8n handoff. */
  handoffSendWasenderToAdvisor:
    (process.env.HANDOFF_SEND_WASENDER_TO_ADVISOR || "false").toLowerCase() === "true",
  /** Supabase: admin-edited bot tone/style (prepended to system prompt). */
  chatbotPersonalityTable: process.env.CHATBOT_PERSONALITY_TABLE || "chatbot_personality",
  chatbotPersonalityContentColumn: process.env.CHATBOT_PERSONALITY_COLUMN || "content",
  /** If set, rows are ordered by this column before limit(1). Empty = no order (any single row). */
  chatbotPersonalityOrderColumn: (process.env.CHATBOT_PERSONALITY_ORDER_BY || "").trim(),
  chatbotPersonalityOrderAscending: (process.env.CHATBOT_PERSONALITY_ORDER_ASC || "false").toLowerCase() === "true"
};

if (!config.anthropicApiKey) {
  throw new Error("Missing ANTHROPIC_API_KEY in environment.");
}


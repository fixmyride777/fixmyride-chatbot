import express from "express";
import cors from "cors";
import { z } from "zod";
import { config } from "./config.js";
import { runAgent } from "./agent.js";
import {
  cleanupSessions,
  getSession,
  getLastSentText,
  hasSeenMessageId,
  markSeenMessageId,
  setLastSentText,
  setSession
} from "./memory.js";
import { sendWasenderMessage } from "./wasender.js";

function trimConversation(messages) {
  const max = Number(config.maxConversationMessages || 0);
  if (!Array.isArray(messages)) return [];
  if (!Number.isFinite(max) || max <= 0) return messages;
  return sanitizeConversation(messages.slice(-max));
}

function sanitizeConversation(messages) {
  if (!Array.isArray(messages)) return [];
  const out = [];

  for (const msg of messages) {
    const role = msg?.role;
    const content = msg?.content;

    // Keep normal text user messages (content is a string)
    if (role === "user" && typeof content === "string") {
      out.push(msg);
      continue;
    }

    // Keep assistant messages as-is
    if (role === "assistant") {
      out.push(msg);
      continue;
    }

    // For tool_result blocks, Anthropic requires: previous message must contain tool_use blocks.
    if (role === "user" && Array.isArray(content)) {
      const toolResults = content.filter(b => b?.type === "tool_result");
      if (toolResults.length === 0) {
        out.push(msg);
        continue;
      }

      const prev = out[out.length - 1];
      const prevToolUses =
        prev?.role === "assistant" && Array.isArray(prev?.content)
          ? prev.content.filter(b => b?.type === "tool_use")
          : [];
      const allowedIds = new Set(prevToolUses.map(t => t?.id).filter(Boolean));

      const filtered = content.filter(block => {
        if (block?.type !== "tool_result") return true;
        return allowedIds.has(block.tool_use_id);
      });

      const keptToolResults = filtered.filter(b => b?.type === "tool_result");
      if (keptToolResults.length > 0) {
        out.push({ ...msg, content: filtered });
      } else {
        // Drop orphaned tool_result message (prevents Anthropic 400)
      }
      continue;
    }

    // Unknown shape, keep it
    out.push(msg);
  }

  return out;
}

function normalizePhone(input) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  // keep leading + if present, otherwise digits only
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman
      if (config.allowedOrigins.length === 0) return cb(null, true);
      if (config.allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS: origin not allowed"), false);
    }
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

const RunAgentBody = z.object({
  message: z.string().min(1),
  phone_number: z.string().min(1).optional(),
  session_id: z.string().min(1).optional(),
  conversation: z.array(z.any()).optional(),
  model: z.string().optional(),
  max_tokens: z.number().int().positive().max(4096).optional()
});

app.post("/agent/run", async (req, res) => {
  try {
    const body = RunAgentBody.parse(req.body);
    await cleanupSessions();

    const sessionId = body.phone_number || body.session_id || null;
    const session = sessionId ? await getSession(sessionId) : null;
    const conversation = trimConversation(body.conversation || session?.messages || []);

    console.log("[pass] agent/run", { sessionId, conversationLength: conversation.length });

    const result = await runAgent({
      userMessage: body.message,
      conversation,
      customerPhoneNumber: body.phone_number ? normalizePhone(body.phone_number) : undefined,
      model: body.model,
      maxTokens: body.max_tokens
    });

    if (sessionId) {
      await setSession(sessionId, trimConversation(result.messages));
    }

    console.log("[pass] agent/run done", {
      replyLength: result.reply?.length ?? 0,
      messagesLength: result.messages?.length ?? 0
    });

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pass] agent/run error", message);
    res.status(400).json({ ok: false, error: message });
  }
});

// n8n -> this backend: accepts your WhatsApp webhook payload shape
app.post("/webhook/get-whatsapp-message", async (req, res) => {
  try {
    await cleanupSessions();

    // Some providers wrap the incoming payload under "body"
    const payload = req.body?.body ?? req.body;
    const msg = payload?.data?.messages;

    const message = msg?.messageBody;
    const phoneNumberRaw = msg?.key?.cleanedSenderPn;
    const phoneNumber = normalizePhone(phoneNumberRaw);
    const fromMe = Boolean(msg?.key?.fromMe ?? msg?.fromMe);
    const messageId = msg?.key?.id ?? msg?.id ?? msg?.messageId;

    // Prevent infinite loops: ignore events for messages sent by our own number
    if (fromMe) {
      console.log("[pass] webhook skip", { reason: "fromMe" });
      return res.json({ ok: true, ignored: true, reason: "fromMe" });
    }

    // Prevent duplicates: same provider event may arrive twice
    if (messageId && (await hasSeenMessageId(messageId))) {
      console.log("[pass] webhook skip", { reason: "duplicate", messageId });
      return res.json({ ok: true, ignored: true, reason: "duplicate", messageId });
    }

    if (!message) {
      console.error("[pass] webhook error", "missing messageBody");
      return res.status(400).json({
        ok: false,
        error: "Missing data.messages.messageBody"
      });
    }
    if (!phoneNumber) {
      console.error("[pass] webhook error", "missing phone");
      return res.status(400).json({
        ok: false,
        error: "Missing data.messages.key.cleanedSenderPn"
      });
    }

    if (messageId) await markSeenMessageId(messageId);

    const lastSent = await getLastSentText(phoneNumber);

    // Extra loop protection: if provider echoes our own outgoing text back as an "incoming" event
    if (lastSent && String(message).trim() === String(lastSent).trim()) {
      console.log("[pass] webhook skip", { reason: "echo" });
      return res.json({ ok: true, ignored: true, reason: "echo" });
    }

    const session = await getSession(phoneNumber);
    const conversation = trimConversation(session?.messages || []);

    console.log("[pass] webhook", {
      messageId,
      phoneNumber,
      messageLength: message.length,
      conversationLength: conversation.length
    });

    const result = await runAgent({
      userMessage: message,
      conversation,
      customerPhoneNumber: phoneNumber
    });

    await setSession(phoneNumber, trimConversation(result.messages));

    const wasender = await sendWasenderMessage({
      to: phoneNumber,
      text: result.reply
    });

    console.log("[pass] webhook done", {
      replyLength: result.reply?.length ?? 0,
      messagesLength: result.messages?.length ?? 0
    });
    await setLastSentText(phoneNumber, result.reply);

    res.json({
      ok: true,
      phone_number: phoneNumber,
      reply: result.reply,
      sent: true,
      wasender
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pass] webhook error", message);
    res.status(400).json({ ok: false, error: message });
  }
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${config.port}`);
});


// Replace these implementations with your real integrations.
import axios from "axios";
import { getAdvisorPhoneForHandoff } from "../advisorNumbers.js";
import { config } from "../config.js";
import { passFail } from "../passLog.js";
import { sendWasenderMessage } from "../wasender.js";

function normalizeCustomerPhone(input) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export async function sayHoldOn({ phone, text }) {
  try {
    const response = await axios.post(`https://fixmyride.app.n8n.cloud/webhook/say-hold-on-w`, {
      phone,
      text
    });
    return { ok: response.status === 200, sent: response.status === 200 };
  } catch (error) {
    return { ok: false, sent: false, error: error.message };
  }
}

export async function getServiceCategories() {
  try {
    const response = await axios.get(`https://fixmyride.app.n8n.cloud/webhook/get-service-categories-w`);
    return { ok: response.status === 200, categories: response.data };
  } catch (error) {
    return { ok: false, categories: [], error: error.message };
  }
}

export async function getServiceSubcategories(categoryId) {
  try {
    const response = await axios.get(`https://fixmyride.app.n8n.cloud/webhook/get-service-subcategories-w`, {
      params: {
        category_id: categoryId
      }
    });
    return { ok: response.status === 200, subcategories: response.data };
  } catch (error) {
    return { ok: false, subcategory: [], error: error.message };
  }
}

export async function classifyIssue(category, subcategory) {
  try {
    const response = await axios.post(`https://fixmyride.app.n8n.cloud/webhook/classify-issue-w`, {
      category,
      subcategory
    });
    return { ok: response.status === 200, response: response.data };
  } catch (error) {
    return { ok: false, response: null, error: error.message };
  }
}

function formatAdvisorHandoffText(p) {
  const lines = [
    "FixMyRide — handoff",
    `Customer: ${p.customer_name}`,
    `Phone: ${p.phone_number}`,
    p.vehicle_info ? `Vehicle: ${p.vehicle_info}` : null,
    `Issue: ${p.issue}`,
    `Summary: ${p.bot_summary}`
  ].filter(Boolean);
  return lines.join("\n");
}

export async function handoffHuman(payload, ctx = {}) {
  try {
    const fromTool = normalizeCustomerPhone(payload.phone_number);
    const fromSession = normalizeCustomerPhone(ctx.customerPhoneNumber);
    const customerPhone = fromTool || fromSession;

    const { phone: advisorPhone, error: advisorErr } = await getAdvisorPhoneForHandoff();
    if (!advisorPhone) {
      const msg =
        advisorErr ||
        "No advisor number found in Supabase. Add a row to the advisor numbers table.";
      return { ok: false, result: null, error: msg };
    }

    if (!customerPhone) {
      return {
        ok: false,
        result: null,
        error:
          "Customer phone missing: pass phone_number or ensure the request includes the chat session phone (e.g. WhatsApp webhook)."
      };
    }

    const body = {
      customer_name: payload.customer_name,
      phone_number: customerPhone,
      vehicle_info: payload.vehicle_info ?? "",
      issue: payload.issue,
      bot_summary: payload.bot_summary,
      advisor_phone: advisorPhone
    };

    if (config.wasenderApiToken) {
      try {
        await sendWasenderMessage({
          to: advisorPhone,
          text: formatAdvisorHandoffText(body)
        });
      } catch (e) {
        passFail("handoff:advisorNotify", e?.message);
        return {
          ok: false,
          result: null,
          error: e?.message || "Failed to notify advisor via Wasender"
        };
      }
    }

    return { ok: true, result: body, advisor_phone: advisorPhone };
  } catch (error) {
    return { ok: false, result: null, error: error.message };
  }
}

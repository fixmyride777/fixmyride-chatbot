// Replace these implementations with your real integrations.
import axios from "axios";
import { getAdvisorPhoneForHandoff } from "../advisorNumbers.js";
import { config } from "../config.js";
import { sendWasenderMessage } from "../wasender.js";

export async function sayHoldOn({ phone, text }) {
  try {
    console.log("[sayHoldOn] sending", { phone, textLength: String(text ?? "").length });
    const response = await axios.post(`https://fixmyride.app.n8n.cloud/webhook/say-hold-on-w`, {
      phone,
      text
    });
    console.log("[sayHoldOn] response", { status: response.status });
    return { ok: response.status === 200, sent: response.status === 200 };
  } catch (error) {
    console.log("[sayHoldOn] error", error?.message);
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

export async function handoffHuman(payload) {
  try {
    const { phone: advisorPhone, error: advisorErr } = await getAdvisorPhoneForHandoff();
    if (!advisorPhone) {
      const msg =
        advisorErr ||
        "No advisor number found in Supabase. Add a row to the advisor numbers table.";
      console.log("[handoffHuman] missing advisor", { advisorErr });
      return { ok: false, result: null, error: msg };
    }

    console.log("[handoffHuman] sending", {
      hasName: Boolean(payload?.customer_name),
      hasPhone: Boolean(payload?.phone_number),
      hasAdvisor: true
    });

    const body = {
      customer_name: payload.customer_name,
      phone_number: payload.phone_number,
      vehicle_info: payload.vehicle_info ?? "",
      issue: payload.issue,
      bot_summary: payload.bot_summary,
      advisor_phone: advisorPhone
    };

    const response = await axios.post(`https://fixmyride.app.n8n.cloud/webhook/handoff-human-w`, body);

    if (response.status === 200 && config.handoffSendWasenderToAdvisor && config.wasenderApiToken) {
      try {
        await sendWasenderMessage({
          to: advisorPhone,
          text: formatAdvisorHandoffText(payload)
        });
      } catch (e) {
        console.log("[handoffHuman] advisor Wasender notify failed", e?.message);
      }
    }

    return { ok: response.status === 200, result: response.data, advisor_phone: advisorPhone };
  } catch (error) {
    console.log("[handoffHuman] error", error?.message);
    return { ok: false, result: null, error: error.message };
  }
}

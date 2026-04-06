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

export async function sayHoldOn({ phone, text }, ctx = {}) {
  const to =
    normalizeCustomerPhone(phone) || normalizeCustomerPhone(ctx.customerPhoneNumber);

  if (!to) {
    return { ok: true, sent: false, skipped: "no_customer_phone" };
  }

  if (!config.wasenderApiToken) {
    return { ok: true, sent: false, skipped: "no_wasender_token" };
  }

  try {
    await sendWasenderMessage({ to, text: String(text ?? "") });
    return { ok: true, sent: true };
  } catch (error) {
    return { ok: false, sent: false, error: error?.message || String(error) };
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

const FIELDD_BOOKING_URL =
  "https://fixmyride.app.n8n.cloud/webhook/get-fieldd-booking-w";
const FIELDD_INVOICE_URL =
  "https://fixmyride.app.n8n.cloud/webhook/get-fieldd-invoice-w";
const FIELDD_PAYMENT_URL =
  "https://fixmyride.app.n8n.cloud/webhook/get-fieldd-payment-w";

function fielddLookupPayload(input, ctx) {
  const fromTool = normalizeCustomerPhone(input?.phone_number);
  const fromSession = normalizeCustomerPhone(ctx?.customerPhoneNumber);
  const phone = fromTool || fromSession;
  const orderNum = String(input?.order_number ?? "").trim();
  return {
    phone_number: phone || undefined,
    order_number: orderNum || undefined
  };
}

async function callFielddLookup(url, input, ctx) {
  const raw = fielddLookupPayload(input, ctx);
  if (!raw.phone_number && !raw.order_number) {
    return {
      ok: false,
      result: null,
      error:
        "Need phone_number or order_number (e.g. JOB12) used for the booking/order. Ask the customer, then call again."
    };
  }
  const params = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v != null && String(v).trim() !== "")
  );
  try {
    const path = new URL(url).pathname;
    // eslint-disable-next-line no-console
    console.log("[fieldd]", path);

    const response = await axios.get(url, { params });
    return { ok: response.status === 200, result: response.data };
  } catch (error) {
    return { ok: false, result: null, error: error.message };
  }
}

export async function getFielddBooking(input, ctx) {
  return callFielddLookup(FIELDD_BOOKING_URL, input, ctx);
}

export async function getFielddInvoice(input, ctx) {
  return callFielddLookup(FIELDD_INVOICE_URL, input, ctx);
}

export async function getFielddPayment(input, ctx) {
  return callFielddLookup(FIELDD_PAYMENT_URL, input, ctx);
}

function formatAdvisorHandoffText(p) {
  const lines = [
    "FixMyRide — handoff",
    `Customer: ${p.customer_name}`,
    p.customer_email ? `Email: ${p.customer_email}` : null,
    `Phone: ${p.phone_number}`,
    p.vehicle_info ? `Vehicle: ${p.vehicle_info}` : null,
    `Issue: ${p.issue}`,
    `Summary: ${p.bot_summary}`,
    `Channel: WhatsApp chatbot`
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
      customer_email: payload.customer_email ?? "",
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

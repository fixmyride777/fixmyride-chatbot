// Replace these implementations with your real integrations.
import axios from "axios";

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

export async function searchPartsInventory(category, subcategory, vehicle_specs) {
  try {
    console.log("[searchPartsInventory] sending", { category, subcategory, vehicle_specs });
    const response = await axios.post(`https://fixmyride.app.n8n.cloud/webhook/search-parts-inventory-w`, {
      category,
      subcategory,
      vehicle_specs
    });
    return { ok: response.status === 200, inventory: response.data };
  } catch (error) {
    return { ok: false, response: null, error: error.message };
  }
}

export async function sendBookingLinkWhatsapp(phoneNumber) {
  try {
    const response = await axios.post(`https://fixmyride.app.n8n.cloud/webhook/send-link-whatsapp-w`, {
      phone_number: phoneNumber
    });
    return { ok: response.status === 200, response: response.data };
  } catch (error) {
    return { ok: false, response: null, error: error.message };
  }
}
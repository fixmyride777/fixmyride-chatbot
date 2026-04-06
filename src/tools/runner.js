import {
  sayHoldOn,
  getServiceCategories,
  getServiceSubcategories,
  classifyIssue,
  handoffHuman,
  getFielddBooking,
  getFielddInvoice,
  getFielddPayment
} from "./impl.js";
import { passFail, passOk } from "../passLog.js";

export async function runTool(name, input, ctx = {}) {
  let result;
  switch (name) {
    case "say_hold_on":
      result = await sayHoldOn(input, ctx);
      break;
    case "get_service_categories":
      result = await getServiceCategories();
      break;
    case "get_service_subcategory":
      result = await getServiceSubcategories(input.category_id);
      break;
    case "classify_issue":
      result = await classifyIssue(input.category, input.subcategory);
      break;
    case "handoff_human":
      result = await handoffHuman(input, ctx);
      break;
    case "get_fieldd_booking":
      result = await getFielddBooking(input, ctx);
      break;
    case "get_fieldd_invoice":
      result = await getFielddInvoice(input, ctx);
      break;
    case "get_fieldd_payment":
      result = await getFielddPayment(input, ctx);
      break;
    default:
      passFail(`tool:${name}`, "unknown tool");
      throw new Error(`Unknown tool: ${name}`);
  }

  const ok = result && typeof result === "object" && "ok" in result ? result.ok : true;
  const step = `tool:${name}`;
  if (ok === false) {
    passFail(step, result?.error || "ok=false");
  } else {
    passOk(step);
  }
  return result;
}

import {
  sayHoldOn,
  getServiceCategories,
  getServiceSubcategories,
  classifyIssue,
  handoffHuman
} from "./impl.js";

export async function runTool(name, input) {
  let result;
  switch (name) {
    case "say_hold_on":
      result = await sayHoldOn(input);
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
      result = await handoffHuman(input);
      break;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }

  const ok = result && typeof result === "object" && "ok" in result ? result.ok : undefined;
  console.log("[pass] tool", name, { ok });
  return result;
}


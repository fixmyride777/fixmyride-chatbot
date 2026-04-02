import {
  sayHoldOn,
  getServiceCategories,
  getServiceSubcategories,
  classifyIssue,
  handoffHuman
} from "./impl.js";

export async function runTool(name, input) {
  switch (name) {
    case "say_hold_on":
      return await sayHoldOn(input);
    case "get_service_categories":
      return await getServiceCategories();
    case "get_service_subcategory":
      return await getServiceSubcategories(input.category_id);
    case "classify_issue":
      return await classifyIssue(input.category, input.subcategory);
    case "handoff_human":
      return await handoffHuman(input);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}


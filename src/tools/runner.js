import {
  sayHoldOn,
  getServiceCategories,
  getServiceSubcategories,
  classifyIssue,
  searchPartsInventory,
  sendBookingLinkWhatsapp
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
    case "search_parts_inventory":
      return await searchPartsInventory(input.category, input.subcategory, input.vehicle_specs);
    case "send_booking_link_whatsapp":
      return await sendBookingLinkWhatsapp(input.phone_number);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}


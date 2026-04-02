export const tools = [
  {
    name: "say_hold_on",
    description: "Send a short wait message to the customer before a visible check.",
    input_schema: {
      type: "object",
      properties: {
        phone: { type: "string" },
        text: { type: "string" }
      },
      required: ["phone", "text"]
    }
  },
  {
    name: "get_service_categories",
    description: "Fetch all active service categories.",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_service_subcategory",
    description: "Fetch all active service subcategories for a category.",
    input_schema: {
      type: "object",
      properties: { category_id: { type: "string" } },
      required: ["category_id"]
    }
  },
  {
    name: "classify_issue",
    description: "Classifies the customer’s problem into a service category and get service rules and rule actions which the chatbot will act with.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string" },
        subcategory: { type: "string" }
      },
      required: ["category", "subcategory"]
    }
  },
  {
    name: "search_parts_inventory",
    description: "Checks whether the required part like tyre, battery, or compatible item is available.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string" },
        subcategory: { type: "string" },
        vehicle_specs: { type: "string" }
      },
      required: ["category", "subcategory", "vehicle_specs"]
    }
  },
  {
    name: "send_booking_link_whatsapp",
    description: "Send the FixMyRide booking website link and the Fieldd customer app download link to the caller via WhatsApp.",
    input_schema: {
      type: "object",
      properties: {
        phone_number: { type: "string" },
      },
      required: ["phone_number"]
    }
  }

];


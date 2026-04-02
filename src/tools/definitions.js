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
    name: "handoff_human",
    description:
      "Escalate to a human agent with collected customer details (use when the request is outside the chatbot scope and pricing is quote-based).",
    input_schema: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        phone_number: { type: "string" },
        vehicle_info: { type: "string" },
        issue: { type: "string" },
        bot_summary: { type: "string" }
      },
      required: ["customer_name", "phone_number", "issue", "bot_summary"]
    }
  }

];


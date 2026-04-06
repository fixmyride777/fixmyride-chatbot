export const tools = [
  {
    name: "say_hold_on",
    description:
      "Send a short wait message to the customer on WhatsApp (Wasender). Phone is taken from the chat session when omitted.",
    input_schema: {
      type: "object",
      properties: {
        phone: {
          type: "string",
          description:
            "Optional on WhatsApp: omit and the server uses the session customer phone from CONTEXT."
        },
        text: { type: "string" }
      },
      required: ["text"]
    }
  },
  {
    name: "get_service_categories",
    description:
      "Fetch active service areas for routing. Use to match the customer’s issue to options; do not dump the full list to the customer at the start—ask their issue first.",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_service_subcategory",
    description:
      "Fetch follow-up service options for one main area. Use results to match the customer’s issue and map to classify_issue—do not show a numbered list to the customer; confirm in natural language.",
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
      "Escalate to a human agent with collected customer details (use when the request is outside the chatbot scope and pricing is quote-based). On WhatsApp, the customer's number is already known to the system—omit phone_number unless you have no session phone in CONTEXT.",
    input_schema: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        phone_number: {
          type: "string",
          description:
            "Optional on WhatsApp: omit and the server uses the session phone from CONTEXT. Only supply if CONTEXT has no customer phone."
        },
        vehicle_info: { type: "string" },
        issue: { type: "string" },
        bot_summary: { type: "string" }
      },
      required: ["customer_name", "issue", "bot_summary"]
    }
  }

];


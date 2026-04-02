/**
 * Supabase table/column names (see supabase.sql).
 * Change here if you rename tables/columns in the database — not via .env.
 */
export const schema = {
  advisorNumbers: {
    table: "advisor_numbers",
    phoneColumn: "phone_number"
  },
  chatbotPersonality: {
    table: "chatbot_personality",
    instructionsColumn: "instructions",
    orderByColumn: "updated_at",
    orderAscending: false
  }
};

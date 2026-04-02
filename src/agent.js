import { anthropicMessages } from "./anthropic.js";
import { getChatbotPersonality } from "./chatbotPersonality.js";
import { passOk } from "./passLog.js";
import { tools } from "./tools/definitions.js";
import { runTool } from "./tools/runner.js";
import { prompt } from "./tools/prompt.js";

export async function runAgent({
  userMessage,
  conversation = [],
  customerPhoneNumber,
  model = "claude-sonnet-4-6",
  maxTokens = 1024
}) {
  const personality = await getChatbotPersonality();

  const adminBlock = personality
    ? `\n\n---\n\nADMIN SETTINGS (from dashboard)\n` +
      `The text below is edited by admins. It may include tone, style, greetings, or rules that overlap the instructions above.\n` +
      `When anything below conflicts with earlier instructions, follow this section for customer-facing wording and priorities.\n` +
      `Hard requirements that always apply: use tool results as truth; call tools when the flow requires; do not invent prices, availability, or facts that contradict tools.\n\n` +
      `${personality}\n`
    : "";

  const systemPrompt =
    prompt +
    (customerPhoneNumber
      ? `\n\nCONTEXT\nCustomer phone number: ${customerPhoneNumber}\n`
      : "") +
    adminBlock;

  const messages = [
    ...conversation,
    {
      role: "user",
      content: userMessage
    }
  ];

  let anthropicRound = 0;

  while (true) {
    anthropicRound += 1;

    const response = await anthropicMessages({
      model,
      max_tokens: maxTokens,
      cache_control: { type: "ephemeral" },
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
      tools,
      messages
    });

    passOk(`anthropic·${anthropicRound}`);

    const content = Array.isArray(response?.content) ? response.content : [];
    const toolUses = content.filter(block => block.type === "tool_use");
    const textBlocks = content.filter(block => block.type === "text");

    if (toolUses.length === 0) {
      messages.push({
        role: "assistant",
        content
      });

      passOk("agent");
      return {
        reply: textBlocks.map(t => t.text).join("\n").trim(),
        raw: response,
        messages
      };
    }

    messages.push({
      role: "assistant",
      content
    });

    const toolResults = [];
    for (const toolUse of toolUses) {
      const result = await runTool(toolUse.name, toolUse.input, {
        customerPhoneNumber
      });
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result)
      });
    }

    messages.push({
      role: "user",
      content: toolResults
    });
  }
}

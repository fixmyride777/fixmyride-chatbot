import { anthropicMessages } from "./anthropic.js";
import { getChatbotPersonality } from "./chatbotPersonality.js";
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

  console.log("[pass] agent", {
    model,
    personalityChars: personality.length,
    systemChars: systemPrompt.length,
    conversationLength: conversation.length,
    userMsgChars: String(userMessage ?? "").length
  });

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

    console.log("[pass] agent:round", {
      round: anthropicRound,
      id: response?.id,
      stopReason: response?.stop_reason,
      usage: response?.usage
    });

    const content = Array.isArray(response?.content) ? response.content : [];
    const toolUses = content.filter(block => block.type === "tool_use");
    const textBlocks = content.filter(block => block.type === "text");

    if (toolUses.length === 0) {
      messages.push({
        role: "assistant",
        content
      });

      const replyLen = textBlocks.map(t => t.text).join("\n").trim().length;
      console.log("[pass] agent:done", { rounds: anthropicRound, replyLength: replyLen });
      return {
        reply: textBlocks.map(t => t.text).join("\n").trim(),
        raw: response,
        messages
      };
    }

    console.log("[pass] agent:tools", {
      round: anthropicRound,
      names: toolUses.map(t => t.name)
    });

    messages.push({
      role: "assistant",
      content
    });

    const toolResults = [];
    for (const toolUse of toolUses) {
      const result = await runTool(toolUse.name, toolUse.input);
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

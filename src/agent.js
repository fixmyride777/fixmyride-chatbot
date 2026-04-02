import { anthropicMessages } from "./anthropic.js";
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
  const systemPrompt =
    prompt +
    (customerPhoneNumber
      ? `\n\nCONTEXT\nCustomer phone number: ${customerPhoneNumber}\n`
      : "");

  console.log("[agent] start", {
    model,
    maxTokens,
    conversationLength: conversation.length,
    userMessageLength: userMessage?.length ?? 0
  });

  const messages = [
    ...conversation,
    {
      role: "user",
      content: userMessage
    }
  ];

  while (true) {
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

    const content = Array.isArray(response?.content) ? response.content : [];
    const toolUses = content.filter(block => block.type === "tool_use");
    const textBlocks = content.filter(block => block.type === "text");

    if (toolUses.length === 0) {
      // IMPORTANT: persist the final assistant message into memory,
      // otherwise next request looks like "first assistant message" again.
      messages.push({
        role: "assistant",
        content
      });

      console.log("[agent] done", {
        replyLength: textBlocks.map(t => t.text).join("\n").trim().length
      });
      return {
        reply: textBlocks.map(t => t.text).join("\n").trim(),
        raw: response,
        messages
      };
    }

    console.log(
      "[agent] tool_use",
      toolUses.map(t => ({ name: t.name, id: t.id }))
    );

    messages.push({
      role: "assistant",
      content
    });

    const toolResults = [];
    for (const toolUse of toolUses) {
      console.log("[agent] tool_run", toolUse.name);
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


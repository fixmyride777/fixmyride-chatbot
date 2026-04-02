import { config } from "./config.js";
import { passFail } from "./passLog.js";

export async function anthropicMessages(body) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    passFail("anthropic", `${res.status} ${text.slice(0, 200)}`);
    throw new Error(`Anthropic error: ${res.status} ${text}`);
  }

  return res.json();
}

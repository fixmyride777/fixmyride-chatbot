import { config } from "./config.js";

export async function sendWasenderMessage({ to, text }) {
  if (!config.wasenderApiToken) {
    throw new Error("Missing WASENDER_API_TOKEN in environment.");
  }

  const res = await fetch("https://www.wasenderapi.com/api/send-message", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.wasenderApiToken}`
    },
    body: JSON.stringify({ to, text })
  });

  const rawText = await res.text();
  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    // leave json as null if response isn't JSON
  }

  if (!res.ok) {
    console.error("[pass] wasender", res.status, rawText.slice(0, 200));
    throw new Error(
      `Wasender error: ${res.status} ${json ? JSON.stringify(json) : rawText}`
    );
  }

  return json ?? { ok: true, status: res.status, body: rawText };
}


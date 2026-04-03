import { config } from "./config.js";
import { passFail, passOk } from "./passLog.js";

/** Serialize all sends so account-wide rate limits are respected. */
let sendChain = Promise.resolve();
let lastSendEndMs = 0;

function enqueueSend(fn) {
  const p = sendChain.then(() => fn());
  sendChain = p.catch(() => {});
  return p;
}

export async function sendWasenderMessage({ to, text }) {
  if (!config.wasenderApiToken) {
    passFail("wasender", "Missing WASENDER_API_TOKEN");
    throw new Error("Missing WASENDER_API_TOKEN in environment.");
  }

  const minMs = Math.max(0, Number(config.wasenderMinSendIntervalMs) || 0);

  return enqueueSend(async () => {
    const waitSpacing = Math.max(0, minMs - (Date.now() - lastSendEndMs));
    if (waitSpacing) {
      await new Promise(r => setTimeout(r, waitSpacing));
    }

    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        /* leave json null */
      }

      if (res.status === 429) {
        const retrySec = Number(json?.retry_after ?? 2);
        const delayMs = (Number.isFinite(retrySec) ? retrySec : 2) * 1000;
        passFail("wasender", `429 retry_after=${retrySec} attempt ${attempt}/${maxAttempts}`);
        if (attempt === maxAttempts) {
          throw new Error(
            `Wasender error: ${res.status} ${json ? JSON.stringify(json) : rawText}`
          );
        }
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      if (!res.ok) {
        passFail("wasender", `${res.status} ${rawText.slice(0, 200)}`);
        throw new Error(
          `Wasender error: ${res.status} ${json ? JSON.stringify(json) : rawText}`
        );
      }

      lastSendEndMs = Date.now();
      passOk("wasender");
      return json ?? { ok: true, status: res.status, body: rawText };
    }

    throw new Error("Wasender: exceeded retry attempts");
  });
}

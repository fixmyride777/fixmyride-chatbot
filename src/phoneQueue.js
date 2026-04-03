/**
 * Burst-friendly per-phone queue.
 *
 * WhatsApp providers may deliver multiple inbound messages in a short time.
 * We serialize processing per phone and coalesce rapid bursts into a single
 * agent turn by buffering messages for a short debounce window.
 */

import { config } from "./config.js";

// Per-phone serialization chain
const chains = new Map(); // phone -> Promise

// Per-phone buffered inbound messages (coalescing)
const buffers = new Map(); // phone -> { version, messages: string[] }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add an inbound message to the phone buffer.
 * Returns the buffer "version" to be used by the queued job.
 */
export function bufferIncomingMessage(phone, message) {
  const key = String(phone ?? "");
  const state = buffers.get(key) || { version: 0, messages: [] };
  state.version += 1;
  state.messages.push(String(message ?? ""));
  buffers.set(key, state);
  return state.version;
}

/**
 * Run `fn` only if this job is still the latest buffered version for `phone`.
 * If a newer message arrives during the debounce, the earlier job will skip.
 */
export function runSerialForPhone(phone, jobVersion, fn) {
  const key = String(phone ?? "");
  const prev = chains.get(key) || Promise.resolve();
  const next = prev.catch(() => {}).then(async () => {
    const state0 = buffers.get(key) || { version: 0, messages: [] };
    if (state0.version !== jobVersion) {
      return { ok: true, ignored: true, reason: "skipped-old-version" };
    }

    const debounceMs = Math.max(0, Number(config.phoneMessageDebounceMs) || 0);
    if (debounceMs) {
      await sleep(debounceMs);
    }

    const state1 = buffers.get(key) || { version: 0, messages: [] };
    if (state1.version !== jobVersion) {
      return { ok: true, ignored: true, reason: "skipped-newer-arrived" };
    }

    const messages = Array.isArray(state1.messages) ? state1.messages : [];
    const latestMessage = messages[messages.length - 1] ?? "";
    const combinedMessage = messages.join("\n").trim();

    // Clear after capturing: newer messages will bump version and build a new buffer.
    buffers.set(key, { version: state1.version, messages: [] });

    return fn({ combinedMessage, latestMessage });
  });

  chains.set(key, next);
  return next;
}

/**
 * Pipeline logging: one line per step, only ok or fail.
 * Optional detail after ok (e.g. skip reason).
 */
export function passOk(step, detail) {
  if (detail) {
    console.log(`[pass] ${step} · ok · ${detail}`);
  } else {
    console.log(`[pass] ${step} · ok`);
  }
}

export function passFail(step, reason) {
  const r = reason != null ? String(reason).slice(0, 400) : "";
  console.error(`[pass] ${step} · fail · ${r}`);
}

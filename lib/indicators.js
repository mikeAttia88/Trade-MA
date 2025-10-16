export function sma(values, window) {
  const out = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = +(sum / window).toFixed(4);
  }
  return out;
}

export function findCrossovers(fast, slow, dates) {
  const events = [];
  for (let i = 1; i < fast.length; i++) {
    const a1 = fast[i - 1], b1 = slow[i - 1];
    const a2 = fast[i],      b2 = slow[i];
    if (a1 == null || b1 == null || a2 == null || b2 == null) continue;
    const prev = a1 - b1, cur = a2 - b2;
    if (prev <= 0 && cur > 0) events.push({ type: "BUY",  i, date: dates[i] });
    if (prev >= 0 && cur < 0) events.push({ type: "SELL", i, date: dates[i] });
  }
  return events;
}


export function backtest(prices, events, opts = {}) {
  const {
    fee_bps = 1, slip_bps = 2, debounce = 1,
    stop_loss_pct = null, take_profit_pct = null,
    position_usd = 1000
  } = opts;

  const n = prices.length;
  const raw = Array(n).fill(null);
  for (const ev of events) raw[ev.i] = ev.type;

  const signal = Array(n).fill(null);
  let last = 0, pend = null, counter = 0;
  for (let i = 0; i < n; i++) {
    const ev = raw[i];
    if (ev === 'BUY'  && last === 0) { pend = 'BUY';  counter = 1; }
    else if (ev === 'SELL' && last === 1) { pend = 'SELL'; counter = 1; }
    else if (pend) { counter++; }
    if (pend && counter >= debounce) { last = (pend === 'BUY') ? 1 : 0; pend = null; counter = 0; }
    signal[i] = last;
  }

  const slip = (bps) => 1 + bps / 10000;
  let pos = 0, entryPx = 0, qty = 0, equity = 0;
  let wins = 0, trades = 0;

  for (let i = 1; i < n; i++) {
    const px = prices[i];

    if (pos === 1 && (stop_loss_pct != null || take_profit_pct != null)) {
      const r = (px - entryPx) / entryPx;
      if ((take_profit_pct != null && r >= take_profit_pct) ||
          (stop_loss_pct  != null && r <= -stop_loss_pct)) {
        const exitPx = px / slip(slip_bps);
        const pnl = (exitPx - entryPx) * qty - Math.abs(exitPx * qty) * (fee_bps / 10000);
        equity += pnl; trades++; if (pnl > 0) wins++;
        pos = 0; qty = 0;
      }
    }

    if (signal[i-1] === 0 && signal[i] === 1 && pos === 0) {
      const fill = prices[i] * slip(slip_bps);
      qty = position_usd / fill; entryPx = fill;
      equity -= Math.abs(fill * qty) * (fee_bps / 10000);
      pos = 1;
    } else if (signal[i-1] === 1 && signal[i] === 0 && pos === 1) {
      const fill = prices[i] / slip(slip_bps);
      const pnl = (fill - entryPx) * qty - Math.abs(fill * qty) * (fee_bps / 10000);
      equity += pnl; trades++; if (pnl > 0) wins++;
      pos = 0; qty = 0;
    }
  }

  if (pos === 1) {
    const last = prices[n-1];
    const pnl = (last - entryPx) * qty;
    equity += pnl; trades++; if (pnl > 0) wins++;
  }

  const invested = Math.max(1, position_usd * Math.max(1, trades));
  const pct = ((equity / invested) * 100).toFixed(2) + "%";
  const wr  = trades ? Math.round(100 * wins / trades) + "%" : "—";
  return { pct, wr, trades, equity: +equity.toFixed(2) };
}

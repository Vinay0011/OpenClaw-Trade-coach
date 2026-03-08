import { useState, useEffect, useRef, useCallback } from "react";

// ─── DEMO TRADES ────────────────────────────────────────────
const TRADES = [
  {
    id: 1, pair: "BTC/USDT", type: "LONG",
    ep: 43250, xp: 41800,
    et: "2024-01-15 09:24", xt: "2024-01-15 14:37",
    sz: 0.5, lev: "5x", pnl: -725, pct: -3.35, dur: "5h 13m",
    trend: "Bearish", vol: "High", rsi: 72, fr: "+0.01%",
    sc: { e: 35, x: 45, t: 30, r: 50 }
  },
  {
    id: 2, pair: "ETH/USDT", type: "LONG",
    ep: 2280, xp: 2465,
    et: "2024-01-18 11:05", xt: "2024-01-19 08:20",
    sz: 3.0, lev: "3x", pnl: 555, pct: 8.11, dur: "21h 15m",
    trend: "Bullish", vol: "Rising", rsi: 55, fr: "+0.005%",
    sc: { e: 82, x: 70, t: 78, r: 85 }
  },
  {
    id: 3, pair: "SOL/USDT", type: "SHORT",
    ep: 108.40, xp: 112.90,
    et: "2024-01-22 16:40", xt: "2024-01-22 19:15",
    sz: 50, lev: "10x", pnl: -225, pct: -4.15, dur: "2h 35m",
    trend: "Bullish", vol: "Surging", rsi: 38, fr: "-0.02%",
    sc: { e: 25, x: 40, t: 20, r: 30 }
  },
  {
    id: 4, pair: "BNB/USDT", type: "LONG",
    ep: 312.50, xp: 334.20,
    et: "2024-01-25 08:00", xt: "2024-01-26 15:30",
    sz: 5.0, lev: "2x", pnl: 217, pct: 6.94, dur: "31h 30m",
    trend: "Bullish", vol: "Moderate", rsi: 60, fr: "+0.008%",
    sc: { e: 75, x: 88, t: 72, r: 80 }
  },
  {
    id: 5, pair: "BTC/USDT", type: "LONG",
    ep: 44800, xp: 44200,
    et: "2024-02-01 03:12", xt: "2024-02-01 04:55",
    sz: 0.3, lev: "10x", pnl: -180, pct: -1.34, dur: "1h 43m",
    trend: "Sideways", vol: "Low", rsi: 50, fr: "+0.02%",
    sc: { e: 40, x: 55, t: 35, r: 25 }
  },
  {
    id: 6, pair: "DOGE/USDT", type: "LONG",
    ep: 0.0812, xp: 0.0948,
    et: "2024-02-05 12:00", xt: "2024-02-07 09:45",
    sz: 12000, lev: "5x", pnl: 408, pct: 16.75, dur: "45h 45m",
    trend: "Strongly Bullish", vol: "Exploding", rsi: 62, fr: "+0.03%",
    sc: { e: 88, x: 65, t: 90, r: 70 }
  },
];

// ─── CANDLE GENERATOR ───────────────────────────────────────
function genCandles(trade, n = 30) {
  const candles = [];
  const profit = trade.pnl > 0;
  const diff = trade.xp - trade.ep;
  const vol = Math.abs(diff) * 0.035;
  let price = trade.ep * 0.984;
  for (let i = 0; i < n; i++) {
    const pg = i / n;
    const trend = profit
      ? (pg < 0.3 ? 0 : pg < 0.55 ? diff * 0.012 : diff * 0.022)
      : (pg < 0.2 ? diff * 0.008 : pg < 0.65 ? -diff * 0.016 : diff * 0.006);
    const noise = (Math.random() - 0.47) * vol;
    const o = price, c = price + trend + noise;
    const h = Math.max(o, c) + Math.random() * vol * 0.4;
    const l = Math.min(o, c) - Math.random() * vol * 0.4;
    candles.push({ o, c, h, l });
    price = c;
  }
  return candles;
}

// ─── SCORE RING ─────────────────────────────────────────────
function ScoreRing({ label, value }) {
  const color = value >= 70 ? "#0ECB81" : value >= 50 ? "#F0B90B" : "#F6465D";
  const r = 20, circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (value / 100) * circ), 200);
    return () => clearTimeout(t);
  }, [value, circ]);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: 48, height: 48 }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="24" cy="24" r={r} fill="none" stroke="#F0F0F0" strokeWidth="4" />
          <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round" strokeDasharray={circ}
            strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "IBM Plex Mono, monospace", fontSize: 12, fontWeight: 700, color }}>{value}</div>
      </div>
      <div style={{ fontSize: 10, color: "#999", textAlign: "center" }}>{label}</div>
    </div>
  );
}

// ─── CANDLE CHART ───────────────────────────────────────────
function CandleChart({ trade }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = cv.parentElement.clientWidth;
    cv.height = 190;
    const ctx = cv.getContext("2d"), W = cv.width, H = 190;
    ctx.clearRect(0, 0, W, H);
    const cs = genCandles(trade);
    const ap = cs.flatMap(c => [c.h, c.l]);
    const mn = Math.min(...ap) * 0.9994, mx = Math.max(...ap) * 1.0006, pr = mx - mn;
    const pd = { t: 14, b: 20, l: 6, r: 70 };
    const cW = W - pd.l - pd.r, cH = H - pd.t - pd.b;
    const ty = p => pd.t + cH - ((p - mn) / pr) * cH;
    const n = cs.length, sp = cW / n, cw = sp * 0.6;

    // Grid lines
    [mn, (mn + mx) / 2, mx].forEach(p => {
      const y = ty(p);
      ctx.beginPath(); ctx.moveTo(pd.l, y); ctx.lineTo(W - pd.r, y);
      ctx.strokeStyle = "#F0F0F0"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#BBB"; ctx.font = "10px IBM Plex Mono, monospace"; ctx.textAlign = "left";
      ctx.fillText("$" + Math.round(p).toLocaleString(), W - pd.r + 4, y + 4);
    });

    // Entry / Exit dashed lines
    const ey = ty(trade.ep), xy = ty(trade.xp);
    [[ey, "rgba(240,185,11,0.5)"], [xy, "rgba(22,119,255,0.5)"]].forEach(([y, col]) => {
      ctx.beginPath(); ctx.moveTo(pd.l, y); ctx.lineTo(W - pd.r, y);
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    });

    // PnL zone shading
    ctx.fillStyle = trade.pnl > 0 ? "rgba(14,203,129,0.06)" : "rgba(246,70,93,0.06)";
    ctx.fillRect(pd.l, Math.min(ey, xy), cW, Math.abs(xy - ey));

    // Candles
    cs.forEach((c, i) => {
      const cx = pd.l + i * sp + sp / 2;
      const up = c.c >= c.o, col = up ? "#0ECB81" : "#F6465D";
      ctx.beginPath(); ctx.moveTo(cx, ty(c.h)); ctx.lineTo(cx, ty(c.l));
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
      const bt = ty(Math.max(c.o, c.c)), bb = ty(Math.min(c.o, c.c));
      ctx.fillStyle = col;
      ctx.fillRect(cx - cw / 2, bt, cw, Math.max(bb - bt, 1.5));
    });

    // Entry / Exit markers
    const ei = Math.floor(n * 0.28), xi = Math.floor(n * 0.76);
    const ex = pd.l + ei * sp + sp / 2, xx = pd.l + xi * sp + sp / 2;
    [[ex, ey, "#F0B90B", "#000", "E"], [xx, xy, "#1677FF", "#FFF", "X"]].forEach(([x, y, bg, tc, lt]) => {
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = bg; ctx.shadowColor = bg; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = tc; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(lt, x, y + 3);
    });
    ctx.fillStyle = "#F0B90B"; ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.fillText("ENTRY", ex, ey - 11);
    ctx.fillStyle = "#1677FF"; ctx.fillText("EXIT", xx, xy - 11);
  }, [trade]);

  return <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />;
}

// ─── MAIN APP ───────────────────────────────────────────────
export default function App() {
  const [sel, setSel] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("summary");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);

  const G = "#0ECB81", R = "#F6465D", Y = "#F0B90B";
  const mono = { fontFamily: "IBM Plex Mono, monospace" };
  const filtered = filter === "all" ? TRADES : TRADES.filter(t => filter === "profit" ? t.pnl > 0 : t.pnl < 0);

  const selectTrade = (t) => { setSel(t); setAnalysis(null); setError(null); };

  const analyze = useCallback(async () => {
    if (!sel) return;
    setLoading(true); setAnalysis(null); setError(null); setStep(1);
    const t = sel, p = t.pnl > 0;

    
    const API_KEY = "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";
    // ─────────────────────────────────────────────────────────

    const prompt = `You are a professional crypto trading coach. Analyze this trade and give brutally honest, specific feedback.

TRADE DATA:
- Pair: ${t.pair} | Direction: ${t.type} | Leverage: ${t.lev}
- Entry: $${t.ep} at ${t.et} | Exit: $${t.xp} at ${t.xt}
- Size: ${t.sz} ${t.pair.split("/")[0]} | Duration: ${t.dur}
- P&L: ${p ? "+" : ""}$${t.pnl} (${p ? "+" : ""}${t.pct}%)
- Market Trend: ${t.trend} | Volume: ${t.vol} | RSI: ${t.rsi} | Funding: ${t.fr}
- Scores — Entry: ${t.sc.e}/100, Exit: ${t.sc.x}/100, Timing: ${t.sc.t}/100, Risk: ${t.sc.r}/100

Return ONLY valid JSON, no markdown, no code fences:
{
  "verdict": "1 brutal honest line in english (English)",
  "emoji": "one emoji",
  "mistakes": ["short punchy mistake 1", "mistake 2", "mistake 3"],
  "positives": ["good point 1", "good point 2"],
  "entry_analysis": "2-3 sentences about entry quality and RSI context with actual numbers",
  "exit_analysis": "2-3 sentences about exit timing and optimal exit level",
  "market_context": "2-3 sentences about market conditions and their impact on this trade",
  "risk_analysis": "2-3 sentences about leverage choice and position sizing quality",
  "next_time": "2-3 specific actionable sentences referencing actual numbers from this trade"
}`;

    setTimeout(() => setStep(2), 900);
    setTimeout(() => setStep(3), 1800);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + API_KEY
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          temperature: 0.7,
          messages: [
            { role: "system", content: "You are a professional crypto trading coach. Always respond with valid JSON only, no markdown, no extra text." },
            { role: "user", content: prompt }
          ]
        })
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error?.message || "API Error " + res.status);
      }

      const data = await res.json();
      const raw = data.choices[0].message.content || "";
      const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      setAnalysis(JSON.parse(clean));
      setTab("summary");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false); setStep(0);
    }
  }, [sel]);

  const scoreColor = s => s >= 70 ? G : s >= 50 ? Y : R;
  const trendColor = t => t.includes("Bear") ? R : t.includes("Bull") ? G : Y;
  const card = (extra = {}) => ({ background: "#fff", border: "1px solid #E8E8E8", borderRadius: 8, ...extra });

  return (
    <div style={{ fontFamily: "IBM Plex Sans, sans-serif", background: "#F5F5F5", height: "100vh", display: "flex", flexDirection: "column", fontSize: 13, color: "#1A1A1A", overflow: "hidden" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes loadBar { 0%{width:0%;margin-left:0} 50%{width:70%;margin-left:10%} 100%{width:0%;margin-left:100%} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #DDD; border-radius: 2px; }
        .trade-row:hover { background: #F8F8F8 !important; }
        .analyze-btn:hover:not(:disabled) { background: #e0a800 !important; box-shadow: 0 4px 16px rgba(240,185,11,0.3) !important; }
        .nav-pill:hover { opacity: 0.8; }
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8E8E8", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: Y, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontWeight: 700, fontSize: 12 }}>TC</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Trade<span style={{ color: Y }}>Coach</span></span>
          <span style={{ fontSize: 10, color: "#AAA", background: "#F5F5F5", padding: "2px 8px", borderRadius: 10 }}>by OpenClaw AI</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["Overview", "Trade Replay", "Performance", "Journal"].map(n => (
            <div key={n} className="nav-pill" style={{ padding: "4px 12px", borderRadius: 16, fontSize: 12, fontWeight: n === "Trade Replay" ? 600 : 400, background: n === "Trade Replay" ? Y : "transparent", color: n === "Trade Replay" ? "#1A1A1A" : "#999", cursor: "pointer" }}>{n}</div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px 4px 6px", border: "1px solid #E8E8E8", borderRadius: 20, fontSize: 12 }}>
          <div style={{ width: 24, height: 24, background: Y, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>D</div>
          Demo Account
        </div>
      </div>

      {/* ── 3-COLUMN GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "270px 1fr 360px", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT: TRADE LIST ── */}
        <div style={{ background: "#fff", borderRight: "1px solid #E8E8E8", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #E8E8E8" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#BBB", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Trade History</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["all", "All", Y], ["profit", "Profit", G], ["loss", "Loss", R]].map(([f, l, c]) => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, border: `1px solid ${filter === f ? c : "#E8E8E8"}`, background: filter === f ? c : "transparent", color: filter === f ? (f === "all" ? "#1A1A1A" : "white") : "#999", cursor: "pointer" }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map((t, i) => {
              const p = t.pnl > 0, isSel = sel?.id === t.id;
              return (
                <div key={t.id}>
                  <div className="trade-row" onClick={() => selectTrade(t)} style={{ padding: "10px 14px", cursor: "pointer", borderLeft: `3px solid ${isSel ? (p ? G : R) : "transparent"}`, background: isSel ? (p ? "#F0FFF8" : "#FFF0F2") : "transparent", transition: "background 0.1s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ ...mono, fontWeight: 600, fontSize: 13 }}>{t.pair}</span>
                      <span style={{ ...mono, fontWeight: 700, color: p ? G : R }}>{p ? "+" : "-"}${Math.abs(t.pnl)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: t.type === "LONG" ? "#E6F7F0" : "#FEE9EC", color: t.type === "LONG" ? G : R }}>{t.type} {t.lev}</span>
                      <span style={{ ...mono, fontSize: 10, color: "#BBB" }}>{t.et.split(" ")[0]}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#CCC" }}>{t.dur} · {p ? "+" : ""}{t.pct.toFixed(2)}%</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: Y, background: "#FFF8E1", padding: "1px 6px", borderRadius: 8 }}>● AI Ready</span>
                    </div>
                  </div>
                  {i < filtered.length - 1 && <div style={{ height: 1, background: "#F5F5F5", margin: "0 14px" }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CENTER: CHART ── */}
        <div style={{ overflowY: "auto", background: "#F5F5F5" }}>
          {!sel ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "#CCC" }}>
              <div style={{ fontSize: 44 }}>📊</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#BBB" }}>Select a Trade to Replay</div>
              <div style={{ fontSize: 12, color: "#CCC", maxWidth: 200, textAlign: "center", lineHeight: 1.6 }}>Click any trade from the left panel to see its chart and breakdown</div>
            </div>
          ) : (
            <>
              {/* Chart header */}
              <div style={{ background: "#fff", borderBottom: "1px solid #E8E8E8", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ ...mono, fontSize: 17, fontWeight: 600 }}>{sel.pair}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: sel.type === "LONG" ? "#E6F7F0" : "#FEE9EC", color: sel.type === "LONG" ? G : R }}>{sel.type} {sel.lev}</span>
                  <div>
                    <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: sel.pnl > 0 ? G : R }}>{sel.pnl > 0 ? "+" : "-"}${Math.abs(sel.pnl).toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: "#BBB" }}>{sel.pnl > 0 ? "+" : ""}{sel.pct.toFixed(2)}% realized P&L</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[["Entry", "$" + sel.ep.toLocaleString()], ["Exit", "$" + sel.xp.toLocaleString()], ["Size", sel.sz + " " + sel.pair.split("/")[0]], ["Duration", sel.dur]].map(([l, v]) => (
                    <div key={l} style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: "#BBB", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
                      <div style={{ ...mono, fontSize: 12, fontWeight: 500 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Candle chart */}
              <div style={{ margin: "14px 20px 0", ...card() }}>
                <div style={{ padding: "12px 12px 6px" }}><CandleChart trade={sel} /></div>
                <div style={{ display: "flex", gap: 14, padding: "7px 12px 10px", borderTop: "1px solid #F0F0F0", background: "#FAFAFA" }}>
                  {[["#0ECB81", "Bullish", 2], ["#F6465D", "Bearish", 2], ["#F0B90B", "Entry", 50], ["#1677FF", "Exit", 50]].map(([c, l, br]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#888" }}>
                      <div style={{ width: 9, height: 9, background: c, borderRadius: br + "%" }} />
                      {l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Score rings */}
              <div style={{ margin: "12px 20px 0", ...card({ padding: "12px 16px" }) }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#BBB", marginBottom: 10 }}>Trade Quality Scores</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  {[["Entry", sel.sc.e], ["Exit", sel.sc.x], ["Timing", sel.sc.t], ["Risk", sel.sc.r]].map(([l, v]) => (
                    <ScoreRing key={l} label={l} value={v} />
                  ))}
                </div>
              </div>

              {/* Detail cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "12px 20px 16px" }}>
                {[
                  ["Trade Details", [
                    ["Entry", "$" + sel.ep.toLocaleString() + " · " + sel.et, null],
                    ["Exit", "$" + sel.xp.toLocaleString() + " · " + sel.xt, sel.pnl > 0 ? G : R],
                    ["P&L", (sel.pnl > 0 ? "+" : "-") + "$" + Math.abs(sel.pnl).toFixed(2) + " (" + (sel.pnl > 0 ? "+" : "") + sel.pct.toFixed(2) + "%)", sel.pnl > 0 ? G : R],
                    ["Leverage", sel.lev, Y],
                    ["Duration", sel.dur, null]
                  ]],
                  ["Market Context", [
                    ["Trend", sel.trend, trendColor(sel.trend)],
                    ["Volume", sel.vol, null],
                    ["RSI @ Entry", sel.rsi + (sel.rsi > 70 ? " (Overbought)" : sel.rsi < 30 ? " (Oversold)" : " (Neutral)"), sel.rsi > 70 ? R : sel.rsi < 30 ? G : Y],
                    ["Funding Rate", sel.fr, null],
                    ["Direction", sel.type, sel.type === "LONG" ? G : R]
                  ]]
                ].map(([title, rows]) => (
                  <div key={title} style={{ ...card({ padding: "10px 12px" }) }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#BBB", marginBottom: 7 }}>{title}</div>
                    {rows.map(([k, v, c]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #F5F5F5", fontSize: 11 }}>
                        <span style={{ color: "#888" }}>{k}</span>
                        <span style={{ ...mono, fontWeight: 500, color: c || "#1A1A1A", fontSize: 11 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: AI PANEL ── */}
        <div style={{ background: "#fff", borderLeft: "1px solid #E8E8E8", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* AI Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #E8E8E8", background: "linear-gradient(135deg,#FFFBF0,#fff)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, background: Y, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>OpenClaw AI</div>
                  <div style={{ fontSize: 10, color: "#BBB" }}>Trade Coaching Engine</div>
                </div>
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", background: "#F5F5F5", borderRadius: 10, color: "#888" }}>claude-sonnet-4</div>
            </div>
            <button className="analyze-btn" onClick={analyze} disabled={!sel || loading}
              style={{ width: "100%", padding: 10, background: sel && !loading ? Y : "#F0F0F0", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, color: sel && !loading ? "#1A1A1A" : "#BBB", cursor: sel && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
              {loading
                ? <><div style={{ width: 13, height: 13, border: "2px solid #ddd", borderTopColor: "#888", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Analyzing...</>
                : <>{analysis ? "🔄 Re-analyze Trade" : sel ? "⚡ Analyze " + sel.pair + " Trade" : "← Select a Trade First"}</>
              }
            </button>
          </div>

          {/* Tab toggle */}
          {analysis && !loading && (
            <div style={{ display: "flex", background: "#F0F0F0", borderRadius: 6, padding: 3, margin: "10px 14px 0", gap: 2 }}>
              {[["summary", "📋 Summary"], ["detail", "🔬 Deep Analysis"]].map(([t, l]) => (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 6, borderRadius: 4, fontSize: 11, fontWeight: 600, border: "none", background: tab === t ? "#fff" : "transparent", color: tab === t ? "#1A1A1A" : "#999", cursor: "pointer", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>{l}</button>
              ))}
            </div>
          )}

          {/* AI Content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>

            {/* Empty: no trade selected */}
            {!sel && !loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, textAlign: "center" }}>
                <div style={{ fontSize: 36 }}>💡</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#888" }}>OpenClaw Ready</div>
                <div style={{ fontSize: 12, color: "#CCC", maxWidth: 200, lineHeight: 1.6 }}>Select any trade and click Analyze to get AI coaching</div>
              </div>
            )}

            {/* Trade selected, not analyzed */}
            {sel && !loading && !analysis && !error && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, textAlign: "center" }}>
                <div style={{ fontSize: 36 }}>🎯</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#888" }}>{sel.pair} Selected</div>
                <div style={{ fontSize: 12, color: "#CCC", maxWidth: 200, lineHeight: 1.6 }}>Hit the Analyze button above to get AI coaching on this trade</div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, textAlign: "center" }}>
                <div style={{ fontSize: 36 }}>⚠️</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: R }}>Analysis Failed</div>
                <div style={{ fontSize: 11, color: "#BBB", maxWidth: 220, lineHeight: 1.5 }}>{error}</div>
                <div style={{ fontSize: 11, color: "#DDD", maxWidth: 240, lineHeight: 1.5 }}>Get FREE key from: console.groq.com/keys → paste in App.js</div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14 }}>
                <div style={{ fontSize: 30 }}>🔍</div>
                <div style={{ width: 180, height: 3, background: "#F0F0F0", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: Y, borderRadius: 2, animation: "loadBar 1.5s infinite ease-in-out" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                  {[[1, "✓ Trade data loaded"], [2, "✓ Chart rendered"], [3, "⚡ Claude AI analyzing..."], [4, "📝 Writing coaching report"]].map(([s, txt]) => (
                    <div key={s} style={{ fontSize: 11, color: step >= s ? G : "#DDD", fontWeight: step >= s ? 500 : 400, display: "flex", gap: 6, alignItems: "center" }}>
                      {step === s && s > 2 ? <div style={{ width: 10, height: 10, border: "2px solid #ddd", borderTopColor: G, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : null}
                      {txt}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SUMMARY VIEW ── */}
            {analysis && !loading && tab === "summary" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                {/* Verdict banner */}
                <div style={{ borderRadius: 8, padding: "11px 13px", marginBottom: 12, display: "flex", gap: 10, background: sel.pnl > 0 ? "#F0FFF8" : "#FFF0F2", border: "1px solid " + (sel.pnl > 0 ? "#CCFFEA" : "#FFCCD2") }}>
                  <div style={{ fontSize: 26 }}>{analysis.emoji}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3, lineHeight: 1.4 }}>{analysis.verdict}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{sel.pair} {sel.type} · {sel.dur}</div>
                  </div>
                </div>

                {/* Bullets */}
                <div style={{ marginBottom: 11 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#CCC", marginBottom: 6 }}>❌ Mistakes</div>
                  {(analysis.mistakes || []).map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, padding: "6px 10px", borderRadius: 6, marginBottom: 4, fontSize: 12, lineHeight: 1.4, background: "#FFF0F2", color: "#C0392B" }}>
                      <span>✗</span>{m}
                    </div>
                  ))}
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#CCC", margin: "10px 0 6px" }}>✅ Good Moves</div>
                  {(analysis.positives || []).map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, padding: "6px 10px", borderRadius: 6, marginBottom: 4, fontSize: 12, lineHeight: 1.4, background: "#F0FFF8", color: "#1A7A4A" }}>
                      <span>✓</span>{m}
                    </div>
                  ))}
                </div>

                {/* Score pills */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                  {[["Entry", sel.sc.e], ["Exit", sel.sc.x], ["Timing", sel.sc.t], ["Risk Mgmt", sel.sc.r]].map(([l, v]) => (
                    <div key={l} style={{ padding: "7px 10px", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #E8E8E8" }}>
                      <span style={{ fontSize: 11, color: "#888" }}>{l}</span>
                      <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: scoreColor(v) }}>{v}/100</span>
                    </div>
                  ))}
                </div>

                {/* Next time suggestion */}
                <div style={{ background: "linear-gradient(135deg,#FFF8E1,#FFFEF5)", border: "1px solid rgba(240,185,11,0.25)", borderRadius: 8, padding: "11px 13px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "#8B6914", marginBottom: 6 }}>💡 Next Time</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6 }}>{analysis.next_time}</div>
                </div>
              </div>
            )}

            {/* ── DETAIL VIEW ── */}
            {analysis && !loading && tab === "detail" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                {[
                  ["📍 Entry Analysis", analysis.entry_analysis],
                  ["🚪 Exit Analysis", analysis.exit_analysis],
                  ["🛡️ Risk Management", analysis.risk_analysis]
                ].map(([title, text]) => (
                  <div key={title} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: "#CCC", marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
                      {title}<div style={{ flex: 1, height: 1, background: "#E8E8E8" }} />
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.7, background: "#FAFAFA", borderRadius: 6, padding: "10px 12px", border: "1px solid #E8E8E8" }}>{text}</div>
                  </div>
                ))}

                {/* Market context */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: "#CCC", marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
                    📈 Market Context<div style={{ flex: 1, height: 1, background: "#E8E8E8" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    {[
                      ["Trend", sel.trend, trendColor(sel.trend)],
                      ["Volume", sel.vol, G],
                      ["RSI", sel.rsi + (sel.rsi > 70 ? " Overbought" : sel.rsi < 30 ? " Oversold" : " Neutral"), sel.rsi > 70 ? R : sel.rsi < 30 ? G : Y],
                      ["Funding", sel.fr, Y]
                    ].map(([l, v, c]) => (
                      <div key={l} style={{ padding: "7px 10px", background: "#FAFAFA", border: "1px solid #E8E8E8", borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: "#CCC", marginBottom: 3 }}>{l}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, ...mono, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, background: "#FAFAFA", borderRadius: 6, padding: "10px 12px", border: "1px solid #E8E8E8" }}>{analysis.market_context}</div>
                </div>

                {/* Actionable advice */}
                <div style={{ background: "linear-gradient(135deg,#FFF8E1,#FFFEF5)", border: "1px solid rgba(240,185,11,0.25)", borderRadius: 8, padding: "11px 13px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "#8B6914", marginBottom: 6 }}>🎯 Actionable Advice</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6 }}>{analysis.next_time}</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

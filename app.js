/* ------------------------------------------------------------------
   Insights Layer demo — rendering.
   No dependencies. Reads the globals defined in data.js.
   ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);
const SERIES = ["#0a66c2", "#01754f", "#915907", "#6a5acd"];
const colorOf = (ch) => SERIES[CHANNELS.indexOf(ch) % SERIES.length];

const usd = (n) => "$" + Math.round(n).toLocaleString();
const usdK = (n) => "$" + (n / 1000).toFixed(0) + "K";
const usdM = (n) => "$" + (n / 1e6).toFixed(2) + "M";
const pct = (n, d = 1) => (n * 100).toFixed(d) + "%";
const pts = (n) => (n >= 0 ? "+" : "\u2212") + Math.abs(n * 100).toFixed(1) + " pts";
const mult = (n) => n.toFixed(2) + "\u00d7";

const dot = (ch) => `<span class="dot" style="background:${colorOf(ch)}"></span>`;

/* ---------- Navigation ---------- */

function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("on", p.id === "p-" + id));
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("on", b.dataset.page === id));
  window.scrollTo({ top: 0 });
}

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

/* ---------- Shared pieces ---------- */

function ciBar(items, key = "point") {
  const lo = Math.min(...items.map((r) => r.lo));
  const hi = Math.max(...items.map((r) => r.hi));
  const span = hi - lo || 1;
  const at = (v) => ((v - lo) / span) * 100;
  return items.map((r) => {
    const c = colorOf(r.channel);
    return `<div class="ci">
      <div class="ci-line" style="left:${at(r.lo)}%;width:${at(r.hi) - at(r.lo)}%;background:${c}"></div>
      <div class="ci-pt" style="left:${at(r[key])}%;background:${c}"></div>
    </div>`;
  });
}

function roiTable(rows, opts = {}) {
  const inverted = rows[0] && rows[0].inverted;
  const fmt = inverted ? (v) => usd(v) : (v) => mult(v);
  const bars = ciBar(rows);
  const head = opts.valueHead || (inverted ? "Cost per outcome" : "Return multiple");
  return `<table>
    <thead><tr>
      <th>Channel</th><th>${head}</th><th style="width:34%">90% interval</th><th class="t-r">Range</th>
    </tr></thead>
    <tbody>${rows.map((r, i) => `<tr>
      <td>${dot(r.channel)}${r.channel}</td>
      <td class="num" style="font-size:15px;font-weight:600">${fmt(r.point)}</td>
      <td>${bars[i]}</td>
      <td class="num t-r muted">${fmt(r.lo)} \u2013 ${fmt(r.hi)}</td>
    </tr>`).join("")}</tbody></table>`;
}

function allocRows(current, proposed, total) {
  const max = Math.max(...Object.values(current), ...Object.values(proposed));
  return CHANNELS.map((ch) => {
    const c = current[ch], p = proposed[ch], d = p - c;
    const col = colorOf(ch);
    return `<div class="alloc-row">
      <div class="alloc-name">${dot(ch)}${ch}</div>
      <div>
        <div class="bar-line">
          <div class="bar bar-ghost" style="width:${(c / max) * 100}%;background:${col}"></div>
          <span class="bar-cap">now ${pct(c)} \u00b7 ${usdK(c * total)}</span>
        </div>
        <div class="bar-line">
          <div class="bar" style="width:${(p / max) * 100}%;background:${col}"></div>
          <span class="bar-cap">proposed ${pct(p)} \u00b7 ${usdK(p * total)}</span>
        </div>
      </div>
      <div class="delta ${d >= 0 ? "pos" : "neg"}">${pts(d)}</div>
    </div>`;
  }).join("");
}

function gateCards(d) {
  const g = [
    { name: "R-hat", value: d.rhat.toFixed(3), ok: d.rhat <= 1.01, need: "needs \u2264 1.01", q: "Do the four chains agree with each other?" },
    { name: "Effective sample size", value: d.ess, ok: d.ess >= 200, need: "needs \u2265 200", q: "Are the draws independent enough to count?" },
    { name: "Divergences", value: d.divergences, ok: d.divergences === 0, need: "needs = 0", q: "Did the sampler hit geometry it couldn't navigate?" },
    { name: "Rank stability", value: d.stability.toFixed(2), ok: d.stability >= 0.6, need: "needs \u2265 0.60", q: "Does the top-3 ranking survive a nudge to the inputs?" },
  ];
  return g.map((x) => `<div class="gate ${x.ok ? "" : "gate-fail"}">
    <div class="gate-name">${x.name}</div>
    <div class="gate-value">${x.value}</div>
    <div class="gate-status ${x.ok ? "pos" : "neg"}">${x.ok ? "PASS" : "FAIL"} \u00b7 ${x.need}</div>
    <div class="gate-q">${x.q}</div>
  </div>`).join("");
}

function verdictBlock(o) {
  const map = { PASS: "pass", INCONCLUSIVE: "inconclusive", HOLD: "hold" };
  const cls = map[o.verdict] || "pass";
  return `<div class="verdict verdict-${cls}">
    <span class="badge badge-${cls}">${o.verdict}</span>
    <div>
      <h2>${o.headline}</h2>
      <p>${o.narrative}</p>
      ${o.caution ? `<div class="verdict-note">${o.caution}</div>` : ""}
    </div>
  </div>`;
}

/* ---------- SVG chart helpers ---------- */

function svgWrap(w, h, inner) {
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img">${inner}</svg>`;
}

function legend(items) {
  return `<div class="legend">${items.map((i) =>
    `<span><span class="dot" style="background:${i.color}"></span>${i.label}</span>`).join("")}</div>`;
}

/* Grouped/whiskered bar chart. rows: [{label, value, lo?, hi?, color}] */
function barChart(rows, opts = {}) {
  const W = 620, H = opts.height || 240;
  const L = opts.left || 54, R = 16, T = 14, B = 42;
  const iw = W - L - R, ih = H - T - B;
  const maxV = Math.max(...rows.map((r) => (r.hi !== undefined ? r.hi : r.value))) * 1.12;
  const y = (v) => T + ih - (v / maxV) * ih;
  const step = iw / rows.length;
  const bw = Math.min(step * 0.5, 64);

  let s = "";
  for (let i = 0; i <= 4; i++) {
    const v = (maxV / 4) * i, yy = y(v);
    s += `<line class="grid" x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}"/>`;
    s += `<text x="${L - 8}" y="${yy + 4}" text-anchor="end">${opts.fmtAxis ? opts.fmtAxis(v) : v.toFixed(1)}</text>`;
  }
  rows.forEach((r, i) => {
    const cx = L + step * i + step / 2;
    s += `<rect x="${cx - bw / 2}" y="${y(r.value)}" width="${bw}" height="${T + ih - y(r.value)}" fill="${r.color}" rx="2"/>`;
    if (r.lo !== undefined) {
      s += `<line x1="${cx}" y1="${y(r.lo)}" x2="${cx}" y2="${y(r.hi)}" stroke="rgba(0,0,0,.55)" stroke-width="1.5"/>`;
      s += `<line x1="${cx - 7}" y1="${y(r.hi)}" x2="${cx + 7}" y2="${y(r.hi)}" stroke="rgba(0,0,0,.55)" stroke-width="1.5"/>`;
      s += `<line x1="${cx - 7}" y1="${y(r.lo)}" x2="${cx + 7}" y2="${y(r.lo)}" stroke="rgba(0,0,0,.55)" stroke-width="1.5"/>`;
    }
    s += `<text x="${cx}" y="${y(r.hi !== undefined ? r.hi : r.value) - 8}" text-anchor="middle" font-weight="600" style="font-size:12px">${opts.fmtVal ? opts.fmtVal(r.value) : r.value}</text>`;
    s += `<text x="${cx}" y="${H - 22}" text-anchor="middle">${r.label}</text>`;
  });
  s += `<line class="axis" x1="${L}" y1="${T + ih}" x2="${W - R}" y2="${T + ih}"/>`;
  return svgWrap(W, H, s);
}

/* Paired bars — two series per category. */
function pairedBarChart(cats, sA, sB, opts = {}) {
  const W = 620, H = opts.height || 250;
  const L = opts.left || 58, R = 16, T = 14, B = 44;
  const iw = W - L - R, ih = H - T - B;
  const maxV = Math.max(...sA.values, ...sB.values) * 1.15;
  const y = (v) => T + ih - (v / maxV) * ih;
  const step = iw / cats.length;
  const bw = Math.min(step * 0.28, 42);

  let s = "";
  for (let i = 0; i <= 4; i++) {
    const v = (maxV / 4) * i, yy = y(v);
    s += `<line class="grid" x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}"/>`;
    s += `<text x="${L - 8}" y="${yy + 4}" text-anchor="end">${opts.fmtAxis ? opts.fmtAxis(v) : v.toFixed(1)}</text>`;
  }
  cats.forEach((c, i) => {
    const cx = L + step * i + step / 2;
    const a = sA.values[i], b = sB.values[i];
    s += `<rect x="${cx - bw - 3}" y="${y(a)}" width="${bw}" height="${T + ih - y(a)}" fill="${sA.color}" rx="2"/>`;
    s += `<rect x="${cx + 3}" y="${y(b)}" width="${bw}" height="${T + ih - y(b)}" fill="${sB.color}" rx="2"/>`;
    s += `<text x="${cx - bw / 2 - 3}" y="${y(a) - 6}" text-anchor="middle" style="font-size:11px" font-weight="600">${opts.fmtVal(a)}</text>`;
    s += `<text x="${cx + bw / 2 + 3}" y="${y(b) - 6}" text-anchor="middle" style="font-size:11px" font-weight="600">${opts.fmtVal(b)}</text>`;
    s += `<text x="${cx}" y="${H - 22}" text-anchor="middle">${c}</text>`;
  });
  s += `<line class="axis" x1="${L}" y1="${T + ih}" x2="${W - R}" y2="${T + ih}"/>`;
  return legend([{ label: sA.label, color: sA.color }, { label: sB.label, color: sB.color }]) + svgWrap(W, H, s);
}

/* Donut — contribution share. */
function donutChart(rows) {
  const W = 620, H = 250, cx = 190, cy = 125, rOut = 92, rIn = 54;
  const total = rows.reduce((a, r) => a + r.value, 0);
  let ang = -Math.PI / 2, s = "";
  rows.forEach((r) => {
    const sweep = (r.value / total) * Math.PI * 2;
    const end = ang + sweep;
    const large = sweep > Math.PI ? 1 : 0;
    const p = (rad, a) => `${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}`;
    s += `<path d="M ${p(rOut, ang)} A ${rOut} ${rOut} 0 ${large} 1 ${p(rOut, end)} L ${p(rIn, end)} A ${rIn} ${rIn} 0 ${large} 0 ${p(rIn, ang)} Z" fill="${r.color}"/>`;
    ang = end;
  });
  s += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" style="font-size:12px">media-driven</text>`;
  s += `<text x="${cx}" y="${cy + 15}" text-anchor="middle" style="font-size:12px">outcome</text>`;
  rows.forEach((r, i) => {
    const ly = 62 + i * 34;
    s += `<rect x="352" y="${ly - 10}" width="11" height="11" rx="2" fill="${r.color}"/>`;
    s += `<text x="371" y="${ly}" style="font-size:13px" fill="rgba(0,0,0,.9)">${r.label}</text>`;
    s += `<text x="371" y="${ly + 16}" style="font-size:12px">${pct(r.value)} of media effect</text>`;
  });
  return svgWrap(W, H, s);
}

/* Multi-line response curves. */
function curveChart(curves, opts = {}) {
  const W = 620, H = opts.height || 260;
  const L = 50, R = 18, T = 16, B = 46;
  const iw = W - L - R, ih = H - T - B;
  const xs = SPEND_MULTIPLIERS;
  const allY = Object.values(curves).flat();
  const maxY = Math.max(...allY) * 1.14;
  const x = (i) => L + (i / (xs.length - 1)) * iw;
  const y = (v) => T + ih - (v / maxY) * ih;

  let s = "";
  for (let i = 0; i <= 4; i++) {
    const v = (maxY / 4) * i, yy = y(v);
    s += `<line class="grid" x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}"/>`;
    s += `<text x="${L - 8}" y="${yy + 4}" text-anchor="end">${v.toFixed(2)}</text>`;
  }
  const nowIdx = xs.indexOf(1.0);
  s += `<line x1="${x(nowIdx)}" y1="${T}" x2="${x(nowIdx)}" y2="${T + ih}" stroke="#0a66c2" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/>`;
  s += `<text x="${x(nowIdx)}" y="${T - 3}" text-anchor="middle" fill="#0a66c2" style="font-size:11px">you are here</text>`;

  Object.entries(curves).forEach(([ch, ys]) => {
    const c = colorOf(ch);
    s += `<path d="${ys.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" ")}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/>`;
    ys.forEach((v, i) => {
      const isNow = i === nowIdx;
      s += `<circle cx="${x(i)}" cy="${y(v)}" r="${isNow ? 5 : 2.6}" fill="${c}"${isNow ? ' stroke="#fff" stroke-width="1.5"' : ""}/>`;
    });
  });
  xs.forEach((m, i) => { s += `<text x="${x(i)}" y="${H - 24}" text-anchor="middle">${m}\u00d7</text>`; });
  s += `<line class="axis" x1="${L}" y1="${T + ih}" x2="${W - R}" y2="${T + ih}"/>`;
  s += `<text x="${L + iw / 2}" y="${H - 6}" text-anchor="middle" style="font-size:11px">spend, as a multiple of today's</text>`;
  return legend(Object.keys(curves).map((ch) => ({ label: ch, color: colorOf(ch) }))
    .concat([{ label: "larger dot = today's spend", color: "#c7c5c1" }])) + svgWrap(W, H, s);
}

/* One curve with a credible band. */
function bandChart(ch, ys) {
  const W = 620, H = 260, L = 50, R = 18, T = 16, B = 46;
  const iw = W - L - R, ih = H - T - B;
  const xs = SPEND_MULTIPLIERS;
  /* Band widens with distance from today's spend — uncertainty grows as you extrapolate. */
  const nowIdx = xs.indexOf(1.0);
  const lo = ys.map((v, i) => v * (1 - 0.14 - 0.05 * Math.abs(i - nowIdx)));
  const hi = ys.map((v, i) => v * (1 + 0.14 + 0.06 * Math.abs(i - nowIdx)));
  const maxY = Math.max(...hi) * 1.1;
  const x = (i) => L + (i / (xs.length - 1)) * iw;
  const y = (v) => T + ih - (v / maxY) * ih;
  const c = colorOf(ch);

  let s = "";
  for (let i = 0; i <= 4; i++) {
    const v = (maxY / 4) * i, yy = y(v);
    s += `<line class="grid" x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}"/>`;
    s += `<text x="${L - 8}" y="${yy + 4}" text-anchor="end">${v.toFixed(2)}</text>`;
  }
  const up = hi.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" ");
  const down = lo.map((v, i) => "L" + x(xs.length - 1 - i) + " " + y(lo[xs.length - 1 - i])).join(" ");
  s += `<path d="${up} ${down} Z" fill="${c}" opacity=".13"/>`;
  s += `<path d="${hi.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" ")}" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="4 3" opacity=".7"/>`;
  s += `<path d="${lo.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" ")}" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="4 3" opacity=".7"/>`;
  s += `<path d="${ys.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" ")}" fill="none" stroke="${c}" stroke-width="2.4"/>`;
  s += `<line x1="${x(nowIdx)}" y1="${T}" x2="${x(nowIdx)}" y2="${T + ih}" stroke="#0a66c2" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/>`;
  s += `<circle cx="${x(nowIdx)}" cy="${y(ys[nowIdx])}" r="5" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
  xs.forEach((m, i) => { s += `<text x="${x(i)}" y="${H - 24}" text-anchor="middle">${m}\u00d7</text>`; });
  s += `<line class="axis" x1="${L}" y1="${T + ih}" x2="${W - R}" y2="${T + ih}"/>`;
  s += `<text x="${L + iw / 2}" y="${H - 6}" text-anchor="middle" style="font-size:11px">spend, as a multiple of today's</text>`;
  return legend([{ label: ch + " — highest spend channel", color: c },
                 { label: "dashed = 90% credible band", color: "#c7c5c1" }]) + svgWrap(W, H, s);
}

/* ---------- KPI cards (mirrors the workbook) ---------- */

function kpiCards() {
  const o = OUTCOMES.closed_won_usd;
  const blended = MARGINAL.reduce((a, m) => a + m.spendShare * m.roi, 0);
  const top = MARGINAL.reduce((a, m) => (m.roi > a.roi ? m : a));
  const deltas = CHANNELS.map((ch) => ({ ch, d: o.proposed[ch] - CURRENT_SHARE[ch] }));
  const big = deltas.reduce((a, x) => (Math.abs(x.d) > Math.abs(a.d) ? x : a));
  const pipeline = BUDGET_TIERS.find((t) => t.multiplier === 1.0);

  const cards = [
    [usd(pipeline.pipeline), "Expected pipeline", `90% CI ${usdM(pipeline.lo)}\u2013${usdM(pipeline.hi)}`],
    [usd(SCENARIO.totalSpend), "Budget analyzed", `${CHANNELS.length} channels`],
    [mult(blended), "Blended media ROI", "incremental $ per $ spent"],
    [mult(top.roi), "Top channel by ROI", top.channel],
    [`${big.d >= 0 ? "\u25b2" : "\u25bc"} ${Math.abs(big.d * 100).toFixed(1)}%`, "Biggest reallocation", `${big.ch} spend`],
  ];
  return cards.map(([v, l, n]) => `<div class="kpi">
    <div class="kpi-label">${l}</div>
    <div class="kpi-value">${v}</div>
    <div class="kpi-note">${n}</div>
  </div>`).join("");
}

/* ---------- Overview ---------- */

function renderOverview() {
  const o = OUTCOMES.closed_won_usd;
  $("kpi-strip").innerHTML = kpiCards();

  const maxS = Math.max(...Object.values(CURRENT_SPEND));
  $("current-split").innerHTML = CHANNELS.map((ch) => `<div class="alloc-row">
    <div class="alloc-name">${dot(ch)}${ch}</div>
    <div><div class="bar-line">
      <div class="bar" style="width:${(CURRENT_SPEND[ch] / maxS) * 100}%;background:${colorOf(ch)}"></div>
      <span class="bar-cap">${usdK(CURRENT_SPEND[ch])}</span>
    </div></div>
    <div class="delta muted">${pct(CURRENT_SHARE[ch])}</div>
  </div>`).join("");

  $("overview-roi").innerHTML = roiTable(o.roi);
  $("overview-verdict").innerHTML = verdictBlock(o);
  $("overview-alloc").innerHTML = allocRows(CURRENT_SHARE, o.proposed, SCENARIO.totalSpend);
  $("overview-gates").innerHTML = gateCards(o.diagnostics);
}

/* ---------- Four outcomes ---------- */

function renderTabs() {
  $("oc-tabs").innerHTML = OUTCOME_ORDER.map((id, i) => {
    const o = OUTCOMES[id];
    return `<button class="tab ${i === 0 ? "on" : ""}" data-oc="${id}">${o.label}<span class="ts">${o.speed}${o.verdict === "INCONCLUSIVE" ? " \u00b7 refused" : ""}</span></button>`;
  }).join("");
  document.querySelectorAll("[data-oc]").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-oc]").forEach((x) => x.classList.toggle("on", x === b));
      renderOutcome(b.dataset.oc);
    });
  });
}

function renderOutcome(id) {
  const o = OUTCOMES[id];
  const alloc = o.proposed
    ? `<div class="card"><h2>Recommended split</h2>
         <p class="sub">Same total budget of ${usdM(SCENARIO.totalSpend)} — this is a better split, not a request for more.</p>
         ${allocRows(CURRENT_SHARE, o.proposed, SCENARIO.totalSpend)}</div>`
    : `<div class="card"><h2>No split was emitted</h2>
         <p class="sub">The confidence gate blocked before any allocation was produced.</p>
         <div class="note note-amber"><div class="note-label">What refusal looks like</div>
         <p>No verb, no dollar figure, no allocation table — the output is an explicit
         <strong>INCONCLUSIVE</strong> status and the reason. It is deliberately not a number
         with a caveat attached, because people act on numbers and ignore caveats.</p></div></div>`;

  $("oc-body").innerHTML = `
    <div class="card">
      <h2>${o.question}</h2>
      <p class="sub">${o.plain}</p>
      <div class="chips">
        <span class="chip">Unit: ${o.unitLabel}</span>
        <span class="chip">Distribution: ${o.likelihood}</span>
        <span class="chip">Reports: ${o.metricLabel}</span>
        <span class="chip">${o.speed}</span>
      </div>
      <div class="note"><div class="note-label">Why this distribution</div><p>${o.likelihoodWhy}</p></div>
      <div class="note"><div class="note-label">Speed vs. truth</div><p>${o.speedNote}</p></div>
    </div>
    ${verdictBlock(o)}
    <div class="card">
      <h2>What each channel returned</h2>
      <p class="sub">Incremental outcome divided by spend — the counterfactual, not a share of credit.</p>
      ${roiTable(o.roi, { valueHead: o.metricLabel })}
      <div class="note"><div class="note-label">Why this metric, for this outcome</div><p>${o.metricWhy}</p></div>
    </div>
    <div class="card">
      <h2>Where each channel bends</h2>
      <p class="sub">Response curves, swept from a quarter of today's spend to double it.</p>
      ${curveChart(o.curves)}
      <div class="note"><p>Each line is one channel replayed through the model at that spending
      level. Where a line flattens, the next dollar stops doing much — that's saturation, and
      it's why "great ROI, spend more" is a trap.</p></div>
    </div>
    ${alloc}
    <div class="card">
      <h2>Health gates</h2>
      <p class="sub">All four must pass before anything is allowed to ship.</p>
      <div class="grid4">${gateCards(o.diagnostics)}</div>
    </div>`;
}

/* ---------- Executive report (the 8 tiles) ---------- */

function tileBody(t) {
  const o = OUTCOMES.closed_won_usd;
  const cats = MARGINAL.map((m) => m.channel);

  switch (t.kind) {
    case "bar-ci":
      return barChart(o.roi.map((r) => ({ label: r.channel, value: r.point, lo: r.lo, hi: r.hi, color: colorOf(r.channel) })),
        { fmtVal: mult, fmtAxis: (v) => v.toFixed(1) + "\u00d7" });
    case "bar-ci-inv":
      return barChart(o.roi.map((r) => ({
        label: r.channel, value: 1 / r.point, lo: 1 / r.hi, hi: 1 / r.lo, color: colorOf(r.channel),
      })), { fmtVal: (v) => "$" + v.toFixed(2), fmtAxis: (v) => "$" + v.toFixed(2) });
    case "bar-pair":
      return pairedBarChart(cats,
        { label: "Average ROI", color: "#0a66c2", values: MARGINAL.map((m) => m.roi) },
        { label: "Marginal ROI (next dollar)", color: "#9ec9f2", values: MARGINAL.map((m) => m.mroi) },
        { fmtVal: mult, fmtAxis: (v) => v.toFixed(1) + "\u00d7" });
    case "bar-pair-share":
      return pairedBarChart(cats,
        { label: "Share of spend", color: "#c7c5c1", values: MARGINAL.map((m) => m.spendShare) },
        { label: "Share of outcome", color: "#0a66c2", values: MARGINAL.map((m) => m.contribution) },
        { fmtVal: (v) => pct(v, 0), fmtAxis: (v) => pct(v, 0) });
    case "pie":
      return donutChart(MARGINAL.map((m) => ({ label: m.channel, value: m.contribution, color: colorOf(m.channel) })));
    case "lines":
      return curveChart(o.curves);
    case "line-band": {
      const top = CHANNELS.reduce((a, ch) => (CURRENT_SPEND[ch] > CURRENT_SPEND[a] ? ch : a), CHANNELS[0]);
      return bandChart(top, o.curves[top]);
    }
    case "bar-pair-usd":
      return pairedBarChart(cats,
        { label: "Current spend", color: "#c7c5c1", values: cats.map((c) => CURRENT_SHARE[c] * SCENARIO.totalSpend) },
        { label: "Recommended spend", color: "#0a66c2", values: cats.map((c) => o.proposed[c] * SCENARIO.totalSpend) },
        { fmtVal: usdK, fmtAxis: usdK });
    default:
      return "";
  }
}

function renderReport() {
  $("report-kpis").innerHTML = kpiCards();
  let html = "";
  CHART_GROUP_ORDER.forEach((group) => {
    html += `<div class="section-band">${group}</div><div class="grid2">`;
    CHART_TILES.filter((t) => t.group === group).forEach((t) => {
      html += `<div class="tile">
        <div class="tile-title">${t.title}</div>
        <div class="tile-caption">${t.caption}</div>
        ${tileBody(t)}
      </div>`;
    });
    html += `</div>`;
  });
  html += `<div class="card" style="margin-top:20px">
    <div class="note note-amber">
      <div class="note-label">Warning strip</div>
      <p>The real report carries a strip above the charts — amber when the run has warnings,
      green when it's clear. This run raised ${RUN_WARNINGS.length}, both about reconciliation.</p>
    </div>
  </div>`;
  $("report-tiles").innerHTML = html;
}

/* ---------- Grains ---------- */

function simpleRoiTable(rows, labelHead, extra) {
  const lo = Math.min(...rows.map((r) => r.lo)), hi = Math.max(...rows.map((r) => r.hi));
  const span = hi - lo || 1;
  const at = (v) => ((v - lo) / span) * 100;
  return `<table><thead><tr>
      <th>${labelHead}</th>${extra ? `<th>${extra}</th>` : ""}
      <th class="t-r">Spend</th><th class="t-r">Return</th><th style="width:28%">90% interval</th>
    </tr></thead><tbody>
    ${rows.map((r) => `<tr>
      <td><strong>${r.name}</strong></td>
      ${extra ? `<td class="muted">${r.segment}</td>` : ""}
      <td class="num t-r">${usdK(r.spend)}</td>
      <td class="num t-r" style="font-weight:600">${mult(r.roi)}</td>
      <td><div class="ci">
        <div class="ci-line" style="left:${at(r.lo)}%;width:${at(r.hi) - at(r.lo)}%;background:#0a66c2"></div>
        <div class="ci-pt" style="left:${at(r.roi)}%;background:#0a66c2"></div>
      </div></td>
    </tr>`).join("")}</tbody></table>`;
}

function renderGrains() {
  $("grain-channel").innerHTML = roiTable(OUTCOMES.closed_won_usd.roi);
  $("grain-segment").innerHTML = simpleRoiTable(SEGMENTS, "Segment");
  $("grain-account").innerHTML = simpleRoiTable(ACCOUNTS, "Account", "Segment");
}

/* ---------- Budget tiers ---------- */

function renderTiers() {
  $("tier-table").innerHTML = `<table><thead><tr>
      <th>Tier</th><th class="t-r">Multiplier</th><th class="t-r">Total budget</th>
      <th class="t-r">Expected pipeline</th><th class="t-r">90% interval</th>
      <th class="t-c">In modeled range</th><th class="t-c">Confidence</th>
    </tr></thead><tbody>
    ${BUDGET_TIERS.map((t) => `<tr>
      <td><strong>${t.tier}</strong></td>
      <td class="num t-r">${t.multiplier.toFixed(2)}\u00d7</td>
      <td class="num t-r">${usdM(t.total)}</td>
      <td class="num t-r" style="font-weight:600">${usdM(t.pipeline)}</td>
      <td class="num t-r muted">${usdM(t.lo)} \u2013 ${usdM(t.hi)}</td>
      <td class="t-c ${t.inRange ? "pos" : "neg"}">${t.inRange ? "yes" : "no"}</td>
      <td class="t-c"><span class="chip">${t.confidence} \u00b7 ${t.score.toFixed(2)}</span></td>
    </tr>`).join("")}</tbody></table>`;

  const curves = {};
  CHANNELS.forEach((ch) => { curves[ch] = BUDGET_TIERS.map((t) => t.shares[ch]); });
  const W = 620, H = 250, L = 46, R = 18, T = 16, B = 46;
  const iw = W - L - R, ih = H - T - B;
  const x = (i) => L + (i / (BUDGET_TIERS.length - 1)) * iw;
  const y = (v) => T + ih - (v / 0.6) * ih;
  let s = "";
  for (let i = 0; i <= 3; i++) {
    const v = (0.6 / 3) * i, yy = y(v);
    s += `<line class="grid" x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}"/>`;
    s += `<text x="${L - 8}" y="${yy + 4}" text-anchor="end">${pct(v, 0)}</text>`;
  }
  Object.entries(curves).forEach(([ch, vs]) => {
    const c = colorOf(ch);
    s += `<path d="${vs.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" ")}" fill="none" stroke="${c}" stroke-width="2.2"/>`;
    vs.forEach((v, i) => { s += `<circle cx="${x(i)}" cy="${y(v)}" r="3.4" fill="${c}"/>`; });
  });
  BUDGET_TIERS.forEach((t, i) => {
    s += `<text x="${x(i)}" y="${H - 24}" text-anchor="middle">${usdM(t.total)}</text>`;
    if (!t.inRange) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" fill="#b24020" style="font-size:10px">extrapolated</text>`;
  });
  s += `<line class="axis" x1="${L}" y1="${T + ih}" x2="${W - R}" y2="${T + ih}"/>`;
  $("tier-chart").innerHTML = legend(CHANNELS.map((ch) => ({ label: ch, color: colorOf(ch) }))) + svgWrap(W, H, s);
}

/* ---------- Confidence ---------- */

function renderConfidence() {
  const maxP = Math.max(...CONFIDENCE_LADDER.map((r) => r.penalty));
  $("ladder").innerHTML = `<table><thead><tr>
      <th>Reason code</th><th style="width:26%">Penalty</th><th>What it means</th>
    </tr></thead><tbody>
    ${CONFIDENCE_LADDER.map((r) => `<tr>
      <td class="num" style="font-size:12.5px">${r.code}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="bar" style="width:${(r.penalty / maxP) * 70}%;background:#b24020;opacity:.75"></div>
          <span class="num" style="font-size:13px">\u2212${r.penalty.toFixed(2)}</span>
        </div>
      </td>
      <td class="muted" style="color:var(--text-2)">${r.meaning}</td>
    </tr>`).join("")}</tbody></table>`;

  $("bands").innerHTML = CONFIDENCE_BANDS.map((b) => `<div class="card card-tight" style="margin:0">
    <div class="stat-label">${b.level}</div>
    <div class="stat-value">\u2265 ${b.min.toFixed(2)}</div>
    <div class="stat-note">${b.note}</div>
  </div>`).join("");

  const applied = [CONFIDENCE_LADDER.find((r) => r.code === "RECONCILIATION_NOT_CALIBRATED")];
  let running = 1.0;
  const steps = [`<div class="def"><div class="def-k">Starting score</div><div class="num">1.00</div></div>`];
  applied.forEach((r) => {
    running -= r.penalty;
    steps.push(`<div class="def"><div class="def-k">${r.code}</div><div><span class="neg num">\u2212${r.penalty.toFixed(2)}</span> <span class="muted">\u2192</span> <span class="num">${running.toFixed(2)}</span></div></div>`);
  });
  const band = CONFIDENCE_BANDS.find((b) => running >= b.min);
  steps.push(`<div class="def"><div class="def-k"><strong>Final</strong></div><div><span class="num" style="font-size:17px;font-weight:600">${running.toFixed(2)}</span> <span class="chip">${band.level}</span></div></div>`);
  $("score-walk").innerHTML = steps.join("") + `<div class="note note-green">
    <div class="note-label">Reading it</div>
    <p>Closed-won came through at ${running.toFixed(2)} — <strong>${band.level}</strong>. The
    only deduction was that one channel has no lift test behind it, which is worth knowing but
    isn't a reason to distrust the answer.</p></div>`;
}

/* ---------- Reconciliation ---------- */

function renderReconciliation() {
  const toneCls = { pass: "pos", warn: "", fail: "neg", muted: "muted" };
  $("recon-table").innerHTML = `<table><thead><tr>
      <th>Channel</th><th class="t-r">Lift test observed</th><th class="t-r">Model fitted</th>
      <th class="t-r">Gap</th><th class="t-c">Status</th>
    </tr></thead><tbody>
    ${RECONCILIATION.map((r) => {
      const gap = r.lift === null ? null : r.model - r.lift;
      const st = RECON_STATUSES.find((s) => s.status === r.status);
      return `<tr>
        <td>${dot(r.channel)}${r.channel}</td>
        <td class="num t-r">${r.lift === null ? '<span class="muted">no test</span>' : mult(r.lift)}</td>
        <td class="num t-r">${mult(r.model)}</td>
        <td class="num t-r ${gap === null ? "muted" : Math.abs(gap) < 0.5 ? "pos" : "neg"}">${gap === null ? "\u2014" : (gap >= 0 ? "+" : "\u2212") + Math.abs(gap).toFixed(2)}</td>
        <td class="t-c"><span class="chip ${toneCls[st.tone]}">${r.status}</span></td>
      </tr>`;
    }).join("")}</tbody></table>`;

  $("recon-vocab").innerHTML = RECON_STATUSES.map((s) =>
    `<div class="def"><div class="def-k"><span class="num" style="font-size:12.5px">${s.status}</span></div><div style="color:var(--text-2)">${s.meaning}</div></div>`
  ).join("");
}

/* ---------- Validation ---------- */

function renderValidation() {
  $("val-key").innerHTML = `<table><thead><tr>
      <th>Channel</th><th class="t-r">True ROI</th><th>True rank</th>
    </tr></thead><tbody>
    ${CHANNELS.map((ch) => {
      const k = ANSWER_KEY[ch];
      return `<tr><td>${dot(ch)}${ch}</td>
        <td class="num t-r" style="font-weight:600">${k.roi.toFixed(1)}\u00d7</td>
        <td class="muted">#${k.rank} — ${k.note}</td></tr>`;
    }).join("")}</tbody></table>`;

  const got = OUTCOMES.closed_won_usd.roi.slice().sort((a, b) => b.point - a.point);
  $("val-got").innerHTML = `<table><thead><tr>
      <th>Channel</th><th class="t-r">Recovered</th><th>Rank</th>
    </tr></thead><tbody>
    ${got.map((r, i) => {
      const ok = ANSWER_KEY[r.channel].rank === i + 1;
      return `<tr><td>${dot(r.channel)}${r.channel}</td>
        <td class="num t-r" style="font-weight:600">${mult(r.point)}</td>
        <td class="${ok ? "pos" : "neg"}">#${i + 1} ${ok ? "\u2713 correct" : "\u2717 wrong"}</td></tr>`;
    }).join("")}</tbody></table>`;

  const grades = [
    ["PASS", "Ranking recovered exactly", "LinkedIn Ads > Search > Display — matches the planted order."],
    ["PASS", "Levels close, not identical", "~4.8 / 3.0 / 2.0 against a planted 4.2 / 3.7 / 1.8."],
    ["PASS", "Total ad impact within 15%", "The aggregate effect of advertising lands close to truth."],
    ["\u2014", "Exact per-channel dollars not demanded", "Not recoverable from observation alone — and a perfect match would be suspicious."],
  ];
  $("val-grade").innerHTML = grades.map(([tag, t, d]) => `<div class="gate">
    <div class="gate-status ${tag === "PASS" ? "pos" : "muted"}">${tag === "PASS" ? "\u2713 PASS" : "— by design"}</div>
    <h3 style="margin-top:4px">${t}</h3>
    <div class="gate-q">${d}</div>
  </div>`).join("") + `<div class="gate" style="grid-column:1/-1;background:var(--green-bg);border-color:#7fc4b0">
    <div class="gate-status pos">\u2713 PASS</div>
    <h3 style="margin-top:4px">Ranking recovered on 3 of 4 outcomes</h3>
    <div class="gate-q">The fourth got the order right and one magnitude wrong by 54%.</div>
  </div>`;
}

/* ---------- JSON contract ---------- */

function renderContract() {
  $("egress-keys").innerHTML = `<table><thead><tr>
      <th>Key</th><th>Type</th><th>What it carries</th>
    </tr></thead><tbody>
    ${EGRESS_KEYS.map((k) => `<tr>
      <td class="num" style="color:var(--li-blue);font-weight:600">${k.key}</td>
      <td class="muted" style="font-size:13px">${k.type}</td>
      <td style="color:var(--text-2)">${k.note}</td>
    </tr>`).join("")}</tbody></table>`;

  $("warnings-list").innerHTML = RUN_WARNINGS.map((w) => `<div class="note ${w.level === "warn" ? "note-amber" : ""}">
    <div class="note-label">${w.level} \u00b7 ${w.code}</div>
    <p>${w.message}</p>
  </div>`).join("");

  $("method-refs").innerHTML = METHODOLOGY_REFS.map((r, i) =>
    `<div class="def"><div class="def-k">[${i + 1}]</div><div style="color:var(--text-2)">${r}</div></div>`
  ).join("");
}

/* ---------- Excel page ---------- */

function renderExcel() {
  $("wb-tabs").innerHTML = WORKBOOK_TABS.map((t) => `<div class="def">
    <div class="def-k"><span class="chip chip-mono">${t.name}</span> ${t.state === "hidden" ? '<span class="muted" style="font-size:12px">hidden</span>' : ""}</div>
    <div style="color:var(--text-2)">${t.note}</div>
  </div>`).join("");

  $("wb-tables").innerHTML = RESULT_TABLES.map((t) => `<div style="margin-bottom:16px">
    <div class="xl-band">${t.name}</div>
    <div style="border:1px solid var(--border);border-top:0;border-radius:0 0 4px 4px;padding:10px 12px">
      <p style="color:var(--text-2);font-size:13.5px;margin-bottom:8px">${t.why}</p>
      <div class="chips">${t.cols.map((c) => `<span class="chip chip-mono">${c}</span>`).join("")}</div>
    </div>
  </div>`).join("");

  $("wb-formats").innerHTML = EXCEL_FORMATS.map((f) => `<div class="def">
    <div class="def-k"><span class="num">${f.fmt}</span></div>
    <div>${f.applies} <span class="muted">\u2014 ${f.example}</span></div>
  </div>`).join("");
}



/* ---------- Per-stage ROI (funnel) ---------- */

const FUNNEL_CHANNELS = Object.keys(STAGE_LEVELS);

function renderFunnel() {
  /* Ladder */
  $("stage-ladder").innerHTML = `<div class="flow">` + STAGE_ORDER.map((st, i) =>
    `<div class="flow-box">
       <div class="flow-tag">${i === 0 ? "Top" : i === STAGE_ORDER.length - 1 ? "Bottom" : "\u2193"}</div>
       <h3>${STAGE_LABEL[st]}</h3>
       <p class="num" style="font-size:11.5px">stage_value_usd__${st}</p>
     </div>`).join("") + `</div>`;

  $("stage-exclusions").innerHTML = STAGE_EXCLUSIONS.map((x) => `<div class="note">
    <div class="note-label">${x.kind} \u00b7 <span class="num">${x.stage}</span></div>
    <p>${x.why}</p></div>`).join("");

  $("stage-rules").innerHTML = STAGE_RULES.map((r) => `<div class="note">
    <div class="note-label">${r.rule}</div><p>${r.body}</p></div>`).join("");

  /* Stage levels — grouped bars per stage */
  const maxL = Math.max(...FUNNEL_CHANNELS.flatMap((c) => STAGE_ORDER.map((s) => STAGE_LEVELS[c][s])));
  const W = 640, H = 270, L = 62, R = 16, T = 16, B = 46;
  const iw = W - L - R, ih = H - T - B;
  const y = (v) => T + ih - (v / (maxL * 1.1)) * ih;
  const step = iw / STAGE_ORDER.length;
  const bw = Math.min(step / (FUNNEL_CHANNELS.length + 1), 34);
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const v = (maxL * 1.1 / 4) * i, yy = y(v);
    g += `<line class="grid" x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}"/>`;
    g += `<text x="${L - 8}" y="${yy + 4}" text-anchor="end">${usdM(v)}</text>`;
  }
  STAGE_ORDER.forEach((st, si) => {
    const cx = L + step * si + step / 2;
    FUNNEL_CHANNELS.forEach((ch, ci) => {
      const v = STAGE_LEVELS[ch][st];
      const x = cx + (ci - (FUNNEL_CHANNELS.length - 1) / 2) * (bw + 3) - bw / 2;
      g += `<rect x="${x}" y="${y(v)}" width="${bw}" height="${T + ih - y(v)}" fill="${colorOf(ch)}" rx="2"/>`;
    });
    g += `<text x="${cx}" y="${H - 22}" text-anchor="middle">${STAGE_LABEL[st]}</text>`;
  });
  g += `<line class="axis" x1="${L}" y1="${T + ih}" x2="${W - R}" y2="${T + ih}"/>`;
  $("stage-levels-chart").innerHTML =
    legend(FUNNEL_CHANNELS.map((c) => ({ label: c, color: colorOf(c) }))) + svgWrap(W, H, g);

  $("stage-levels-table").innerHTML = `<table><thead><tr><th>Channel</th>
    ${STAGE_ORDER.map((s) => `<th class="t-r">${STAGE_LABEL[s]}</th>`).join("")}
    <th class="t-r">Spend</th></tr></thead><tbody>
    ${FUNNEL_CHANNELS.map((ch) => `<tr><td>${dot(ch)}${ch}</td>
      ${STAGE_ORDER.map((s) => `<td class="num t-r">${usdK(STAGE_LEVELS[ch][s])}</td>`).join("")}
      <td class="num t-r muted">${usdK(FUNNEL_SPEND[ch])}</td></tr>`).join("")}
    </tbody></table>`;

  /* Per-stage ROI */
  $("funnel-roi-table").innerHTML = `<table><thead><tr><th>Channel</th><th></th>
      ${STAGE_ORDER.map((s) => `<th class="t-r">${STAGE_LABEL[s]}</th>`).join("")}
    </tr></thead><tbody>
    ${FUNNEL_CHANNELS.map((ch) => {
      const r = FUNNEL_ROI[ch];
      return `<tr>
        <td rowspan="2" style="border-bottom:1px solid var(--border)">${dot(ch)}${ch}</td>
        <td class="muted" style="font-size:12px;border-bottom:0">average</td>
        ${STAGE_ORDER.map((s) => `<td class="num t-r" style="font-weight:600;border-bottom:0">${mult(r[s].roi)}</td>`).join("")}
      </tr><tr>
        <td class="muted" style="font-size:12px">marginal</td>
        ${STAGE_ORDER.map((s) => `<td class="num t-r muted">${mult(r[s].mroi)}</td>`).join("")}
      </tr>`;
    }).join("")}</tbody></table>`;

  /* Rank reversals */
  $("reversal-table").innerHTML = `<table><thead><tr>
      <th>Channel</th><th class="t-c">Rank at lead</th><th class="t-c">Rank at closed won</th>
      <th class="t-c">Move</th><th>Crossed with</th><th class="t-c">Credible</th>
    </tr></thead><tbody>
    ${RANK_REVERSALS.map((r) => `<tr>
      <td>${dot(r.channel)}${r.channel}</td>
      <td class="num t-c">#${r.rankTop}</td>
      <td class="num t-c">#${r.rankBottom}</td>
      <td class="num t-c ${r.rankDelta < 0 ? "neg" : "pos"}">${r.rankDelta < 0 ? "\u25bc" : "\u25b2"} ${Math.abs(r.rankDelta)}</td>
      <td>${dot(r.crossedWith)}${r.crossedWith}</td>
      <td class="t-c">${r.credible
        ? '<span class="chip pos">yes \u00b7 separates at both ends</span>'
        : '<span class="chip muted">no \u00b7 intervals overlap</span>'}</td>
    </tr>`).join("")}</tbody></table>
    <div class="chips" style="margin-top:12px">
      ${REVERSAL_COLUMNS.map((c) => `<span class="chip chip-mono">${c}</span>`).join("")}
    </div>`;

  /* Carry-through */
  const pairs = STAGE_ORDER.slice(1).map((s, i) => ({ from: STAGE_ORDER[i], to: s, key: `${s}/${STAGE_ORDER[i]}` }));
  const carry = {};
  FUNNEL_CHANNELS.forEach((ch) => {
    carry[ch] = pairs.map((p) => STAGE_LEVELS[ch][p.to] / STAGE_LEVELS[ch][p.from]);
  });

  const W2 = 640, H2 = 250, L2 = 50, R2 = 18, T2 = 16, B2 = 52;
  const iw2 = W2 - L2 - R2, ih2 = H2 - T2 - B2;
  const x2 = (i) => L2 + (pairs.length === 1 ? iw2 / 2 : (i / (pairs.length - 1)) * iw2);
  const y2 = (v) => T2 + ih2 - v * ih2;
  let c2 = "";
  for (let i = 0; i <= 4; i++) {
    const v = i / 4, yy = y2(v);
    c2 += `<line class="grid" x1="${L2}" y1="${yy}" x2="${W2 - R2}" y2="${yy}"/>`;
    c2 += `<text x="${L2 - 8}" y="${yy + 4}" text-anchor="end">${pct(v, 0)}</text>`;
  }
  FUNNEL_CHANNELS.forEach((ch, ci) => {
    const col = colorOf(ch), vs = carry[ch];
    c2 += `<path d="${vs.map((v, i) => (i ? "L" : "M") + x2(i) + " " + y2(v)).join(" ")}" fill="none" stroke="${col}" stroke-width="2.2"/>`;
    /* Stagger labels by channel so nearby lines don't collide. */
    const dy = ci === 0 ? -12 : ci === 1 ? -25 : 18;
    vs.forEach((v, i) => {
      const anchor = i === 0 ? "start" : i === vs.length - 1 ? "end" : "middle";
      const lx = i === 0 ? x2(i) - 6 : i === vs.length - 1 ? x2(i) + 6 : x2(i);
      c2 += `<circle cx="${x2(i)}" cy="${y2(v)}" r="4" fill="${col}"/>`;
      c2 += `<text x="${lx}" y="${y2(v) + dy}" text-anchor="${anchor}" style="font-size:11px" font-weight="600" fill="${col}">${pct(v, 0)}</text>`;
    });
  });
  pairs.forEach((p, i) => {
    /* Clamp the end labels inward so they can't overflow the viewBox. */
    const anchor = i === 0 ? "start" : i === pairs.length - 1 ? "end" : "middle";
    const lx = i === 0 ? L2 - 6 : i === pairs.length - 1 ? W2 - R2 + 6 : x2(i);
    c2 += `<text x="${lx}" y="${H2 - 30}" text-anchor="${anchor}">${STAGE_LABEL[p.from]} \u2192</text>`;
    c2 += `<text x="${lx}" y="${H2 - 15}" text-anchor="${anchor}">${STAGE_LABEL[p.to]}</text>`;
  });
  c2 += `<line class="axis" x1="${L2}" y1="${T2 + ih2}" x2="${W2 - R2}" y2="${T2 + ih2}"/>`;
  $("carry-chart").innerHTML =
    legend(FUNNEL_CHANNELS.map((c) => ({ label: c, color: colorOf(c) }))) + svgWrap(W2, H2, c2);

  $("carry-table").innerHTML = `<table><thead><tr><th>Channel</th>
    ${pairs.map((p) => `<th class="t-r num" style="font-size:11px">${p.key}</th>`).join("")}
    <th class="t-r">Lead \u2192 won overall</th></tr></thead><tbody>
    ${FUNNEL_CHANNELS.map((ch) => {
      const overall = STAGE_LEVELS[ch].closed_won / STAGE_LEVELS[ch].lead;
      return `<tr><td>${dot(ch)}${ch}</td>
        ${carry[ch].map((v) => `<td class="num t-r">${pct(v)}</td>`).join("")}
        <td class="num t-r" style="font-weight:600">${pct(overall)}</td></tr>`;
    }).join("")}</tbody></table>`;

  $("velocity-gap").innerHTML = `
    <div class="note note-amber">
      <div class="note-label">Not answered: ${VELOCITY_GAP.question}</div>
      <p>${VELOCITY_GAP.why}</p>
    </div>
    <div class="note"><div class="note-label">What this grain does support</div><p>${VELOCITY_GAP.supported}</p></div>
    <div class="note"><div class="note-label">What it would take</div><p>${VELOCITY_GAP.fix}</p></div>`;
}

/* ---------- Power BI ---------- */

function renderPowerBI() {
  $("pbi-tables").innerHTML = PBI_TABLES.map((t) => `<div class="def">
    <div class="def-k"><span class="chip chip-mono">${t.file}</span></div>
    <div><strong style="font-size:13px">${t.grain}</strong><br>
      <span style="color:var(--text-2);font-size:13.5px">${t.carries}</span></div>
  </div>`).join("");

  $("pbi-paths").innerHTML = PBI_PATHS.map((p) => `<div class="def">
    <div class="def-k"><span class="num" style="color:var(--li-blue)">${p.fn}()</span></div>
    <div><strong style="font-size:13px">${p.out}</strong><br>
      <span style="color:var(--text-2);font-size:13.5px">${p.who}</span></div>
  </div>`).join("");

  $("pbi-visuals").innerHTML = PBI_VISUALS.map((v) => `<div class="def">
    <div class="def-k"><span class="num" style="font-size:12.5px">${v.id}</span></div>
    <div style="color:var(--text-2)">${v.shows}</div>
  </div>`).join("");

  $("pbi-banner").innerHTML = PBI_BANNER.map((b) => `<div class="note ${b.tone === "green" ? "note-green" : "note-amber"}">
    <div class="note-label">${b.label}</div><p>${b.when}</p></div>`).join("");
}

/* ---------- Embeds ---------- */

function embedSlot(url, title, hint, key) {
  if (!url) {
    return `<div class="embed-slot">
      <h3>${title}</h3>
      <p>${hint}</p>
      <p style="margin-top:10px">Set <code>EMBEDS.${key}</code> at the bottom of <code>index.html</code>.</p>
    </div>`;
  }
  if (/\.(xlsx|xls|pptx|ppt|docx)$/i.test(url)) {
    return `<div class="embed-slot">
      <h3>${title}</h3>
      <p>Browsers can't display this format inline — download it to open in the desktop app.</p>
      <p style="margin-top:16px"><a class="dl-link" href="${url}" download>Download ${url.split("/").pop()}</a></p>
    </div>`;
  }
  return `<iframe class="embed-frame" src="${url}" title="${title}" allowfullscreen></iframe>`;
}

function renderEmbeds() {
  $("embed-deck").innerHTML = embedSlot(EMBEDS.deck, "Slide deck",
    "Export the deck to PDF and drop it at assets/deck.pdf, or paste a SharePoint / Google Drive embed URL.", "deck");
  $("embed-generated").innerHTML = embedSlot(EMBEDS.generated, "Generated deck",
    "The auto-built PowerPoint. Put it at assets/generated-deck.pdf for inline display, or point at the .pptx for a download button.", "generated");
  $("embed-excel").innerHTML = embedSlot(EMBEDS.excel, "Excel workbook",
    "Drop the exported workbook at assets/export.xlsx.", "excel");
  $("embed-powerbi").innerHTML = embedSlot(EMBEDS.powerbi, "Power BI report",
    "In Power BI: File \u2192 Embed report \u2192 Website or portal, then paste the URL here.", "powerbi");
}

/* ---------- Footers ---------- */

function renderFooters() {
  const txt = `${SCENARIO.name} \u00b7 fully synthetic data \u00b7 account names illustrative \u00b7 `
    + `seed ${SCENARIO.seed} \u00b7 ${SCENARIO.chains} chains \u00d7 ${SCENARIO.draws / SCENARIO.chains} draws `
    + `\u00b7 byte-identical egress, schema v1.0.0`;
  document.querySelectorAll(".foot").forEach((f) => { f.textContent = txt; });
}

/* ---------- Interactive simulator ---------- */

const SIM_MAX_SPEND = 5000;

const fmtInt = (n) => Math.round(n).toLocaleString("en-US");

const simCtl = {
  spend:   document.getElementById("sim-spend"),
  decay:   document.getElementById("sim-decay"),
  coef:    document.getElementById("sim-coef"),
  halfsat: document.getElementById("sim-halfsat"),
  slope:   document.getElementById("sim-slope"),
  carry:   document.getElementById("sim-carry"),
};

function simAdstock(spend, decay, carry) { return spend + decay * carry; }

function simSaturation(adstocked, halfsat, slope) {
  const num = Math.pow(adstocked, slope);
  const den = num + Math.pow(halfsat, slope);
  return den === 0 ? 0 : num / den;
}

function simOutcome(spend, p) {
  const ad = simAdstock(spend, p.decay, p.carry);
  const sat = simSaturation(ad, p.halfsat, p.slope);
  return { ad, sat, out: sat * p.coef };
}

function simPulse(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
}

function simDrawCurve(p, currentSpend, mroi) {
  const svg = document.getElementById("sim-curve");
  if (!svg) return;
  const W = 900, H = 280, pad = { l: 64, r: 24, t: 18, b: 36 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;

  const pts = [];
  let maxOut = 1;
  for (let s = 0; s <= SIM_MAX_SPEND; s += SIM_MAX_SPEND / 120) {
    const { out } = simOutcome(s, p);
    pts.push([s, out]);
    if (out > maxOut) maxOut = out;
  }
  maxOut *= 1.08;

  const X = (s) => pad.l + (s / SIM_MAX_SPEND) * plotW;
  const Y = (o) => pad.t + plotH - (o / maxOut) * plotH;

  const path = pts
    .map((pt, i) => (i === 0 ? "M" : "L") + X(pt[0]).toFixed(1) + " " + Y(pt[1]).toFixed(1))
    .join(" ");

  const cur = simOutcome(currentSpend, p);
  const cx = X(currentSpend), cy = Y(cur.out);

  // Tangent whose screen slope encodes marginal ROI (outcome per dollar).
  const dxData = 700;
  const dxScreen = (dxData / SIM_MAX_SPEND) * plotW;
  const dyScreen = ((mroi * dxData) / maxOut) * plotH;
  const tx1 = cx - dxScreen, ty1 = cy + dyScreen;
  const tx2 = cx + dxScreen, ty2 = cy - dyScreen;

  let grid = "";
  for (let i = 0; i <= 4; i++) {
    const gy = pad.t + plotH - (i / 4) * plotH;
    grid += `<line x1="${pad.l}" y1="${gy}" x2="${W - pad.r}" y2="${gy}" stroke="#e0dfdc" stroke-width="1"/>`;
    grid += `<text x="${pad.l - 8}" y="${gy + 4}" fill="rgba(0,0,0,.45)" font-size="10" text-anchor="end">${fmtInt(Math.round((i / 4) * maxOut))}</text>`;
  }
  let xLabels = "";
  for (let i = 0; i <= 5; i++) {
    const s = (i / 5) * SIM_MAX_SPEND;
    xLabels += `<text x="${X(s)}" y="${H - 10}" fill="rgba(0,0,0,.45)" font-size="10" text-anchor="middle">$${fmtInt(s)}</text>`;
  }

  const labelAnchor = tx2 > W - 140 ? "end" : "start";
  const labelX = tx2 > W - 140 ? Math.min(tx2 - 6, W - 10) : Math.max(tx2 + 6, 10);

  svg.innerHTML = `
    ${grid}
    <path d="${path}" fill="none" stroke="#01754f" stroke-width="2.5"/>
    <line x1="${tx1.toFixed(1)}" y1="${ty1.toFixed(1)}" x2="${tx2.toFixed(1)}" y2="${ty2.toFixed(1)}" stroke="#915907" stroke-width="1.75"/>
    <line x1="${cx}" y1="${pad.t}" x2="${cx}" y2="${pad.t + plotH}" stroke="#0a66c2" stroke-width="1" stroke-dasharray="3 4"/>
    <circle cx="${cx}" cy="${cy}" r="5.5" fill="#0a66c2" stroke="#fff" stroke-width="2"/>
    <text x="${labelX.toFixed(1)}" y="${Math.max(ty2 - 6, 14).toFixed(1)}" fill="#915907" font-size="11" font-weight="600" text-anchor="${labelAnchor}">marginal ROI \u2248 ${mroi.toFixed(2)}x</text>
    ${xLabels}
  `;
}

/* The ROI bar is position:sticky at the bottom of the viewport. This sentinel
   sits directly below it: while the sentinel is below the fold the bar is
   pinned, so we shrink it and add a shadow to read as an overlay. Once you
   scroll far enough for the sentinel to appear, the bar has reached its natural
   place in the flow and expands back to full size.

   Deliberately scroll-driven rather than an IntersectionObserver: this page is
   an SPA, so the bar is display:none at boot. An observer's one initial
   callback would fire against a zero-size rect and then never re-fire, because
   the intersection state doesn't actually change when the page is revealed. */
function initSimRoiSticky() {
  const box = document.getElementById("sim-roi");
  const sentinel = document.getElementById("sim-roi-sentinel");
  if (!box || !sentinel) return;

  let queued = false;
  function update() {
    queued = false;
    if (!box.offsetParent) { box.classList.remove("floating"); return; }
    const below = sentinel.getBoundingClientRect().top > window.innerHeight;
    box.classList.toggle("floating", below);
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  document.querySelectorAll(".nav-item").forEach(function (n) {
    n.addEventListener("click", function () { requestAnimationFrame(schedule); });
  });
  update();
  simRoiStickyUpdate = schedule;
}
let simRoiStickyUpdate = function () {};

function renderSimulator() {
  if (!simCtl.spend) return;

  const p = {
    spend:   parseFloat(simCtl.spend.value),
    decay:   parseFloat(simCtl.decay.value),
    coef:    parseFloat(simCtl.coef.value),
    halfsat: parseFloat(simCtl.halfsat.value),
    slope:   parseFloat(simCtl.slope.value),
    carry:   parseFloat(simCtl.carry.value),
  };

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  set("v-spend", "$" + fmtInt(p.spend));
  set("v-decay", p.decay.toFixed(2));
  set("v-coef", fmtInt(p.coef));
  set("v-halfsat", fmtInt(p.halfsat));
  set("v-slope", p.slope.toFixed(2));
  set("v-carry", fmtInt(p.carry));

  const real = simOutcome(p.spend, p);
  const off = simOutcome(0, p);

  document.getElementById("f-spend").innerHTML =
    `spend<sub>today</sub> = <span class="num">$${fmtInt(p.spend)}</span>`;
  set("r-spend", "$" + fmtInt(p.spend));

  document.getElementById("f-adstock").innerHTML =
    `<span class="num">${fmtInt(p.spend)}</span> + <span class="num">${p.decay.toFixed(2)}</span> \u00d7 <span class="num">${fmtInt(p.carry)}</span> = <span class="num">${fmtInt(real.ad)}</span>`;
  set("r-adstock", fmtInt(real.ad));

  const sl = p.slope.toFixed(2);
  document.getElementById("f-sat").innerHTML =
    `${fmtInt(real.ad)}<sup>${sl}</sup> \u00f7 (${fmtInt(real.ad)}<sup>${sl}</sup> + ${fmtInt(p.halfsat)}<sup>${sl}</sup>) = <span class="num">${(real.sat * 100).toFixed(1)}%</span>`;
  set("r-sat", (real.sat * 100).toFixed(1) + "%");

  document.getElementById("f-coef").innerHTML =
    `<span class="num">${(real.sat * 100).toFixed(1)}%</span> \u00d7 <span class="num">${fmtInt(p.coef)}</span> = <span class="num">${fmtInt(real.out)}</span>`;
  set("r-coef", fmtInt(real.out));

  // Zeroed-out pipeline: identical parameters, spend forced to 0.
  document.getElementById("f-spend-off").innerHTML =
    `spend<sub>today</sub> = <span class="num">$0</span>`;
  set("r-spend-off", "$0");

  document.getElementById("f-adstock-off").innerHTML =
    `<span class="num">0</span> + <span class="num">${p.decay.toFixed(2)}</span> \u00d7 <span class="num">${fmtInt(p.carry)}</span> = <span class="num">${fmtInt(off.ad)}</span>`;
  set("r-adstock-off", fmtInt(off.ad));

  document.getElementById("f-sat-off").innerHTML =
    `${fmtInt(off.ad)}<sup>${sl}</sup> \u00f7 (${fmtInt(off.ad)}<sup>${sl}</sup> + ${fmtInt(p.halfsat)}<sup>${sl}</sup>) = <span class="num">${(off.sat * 100).toFixed(1)}%</span>`;
  set("r-sat-off", (off.sat * 100).toFixed(1) + "%");

  document.getElementById("f-coef-off").innerHTML =
    `<span class="num">${(off.sat * 100).toFixed(1)}%</span> \u00d7 <span class="num">${fmtInt(p.coef)}</span> = <span class="num">${fmtInt(off.out)}</span>`;
  set("r-coef-off", fmtInt(off.out));

  ["sim-stage-spend", "sim-stage-adstock", "sim-stage-sat", "sim-stage-coef",
   "sim-stage-spend-off", "sim-stage-adstock-off", "sim-stage-sat-off",
   "sim-stage-coef-off"].forEach(simPulse);

  const delta = real.out - off.out;
  const roi = p.spend > 0 ? delta / p.spend : 0;
  set("roi-delta", fmtInt(delta));
  set("roi-spend", "$" + fmtInt(p.spend));
  set("roi-final", p.spend > 0 ? roi.toFixed(2) + "x" : "\u2014");

  // Marginal ROI: central difference on the response curve at current spend.
  const h = 1;
  const hi = Math.min(p.spend + h, SIM_MAX_SPEND);
  const lo = Math.max(p.spend - h, 0);
  const span = hi - lo;
  const mroi = span > 0 ? (simOutcome(hi, p).out - simOutcome(lo, p).out) / span : 0;
  set("mroi-final", mroi.toFixed(2) + "x");

  simDrawCurve(p, p.spend, mroi);
}

Object.values(simCtl).forEach((el) => {
  if (el) el.addEventListener("input", renderSimulator);
});

/* ---------- Budget mix simulator ---------- */

// Illustrative curve parameters. In production all three come from the frozen
// posterior — one value per draw — not from constants.
const MIX_CH = CHANNELS.map((name, i) => {
  const params = {
    "LinkedIn Ads": { coef: 11000, halfsat: 2200, slope: 1.2 },
    "Search":       { coef: 14000, halfsat: 1800, slope: 1.3 },
    "Display":      { coef:  9000, halfsat: 1200, slope: 1.6 },
  }[name] || { coef: 9000, halfsat: 1500, slope: 1.4 };
  return { name, hex: colorOf(name), ...params };
});

let mixShares = MIX_CH.map(() => 100 / MIX_CH.length);
let mixBaseline = null;
let mixAnim = null;

function mixOutcomeAt(ch, spend) {
  if (spend <= 0) return 0;
  const num = Math.pow(spend, ch.slope);
  return ch.coef * num / (num + Math.pow(ch.halfsat, ch.slope));
}

function mixMarginalAt(ch, spend) {
  const h = 1;
  const up = mixOutcomeAt(ch, spend + h);
  const lo = mixOutcomeAt(ch, Math.max(spend - h, 0));
  return (up - lo) / (spend >= h ? 2 * h : h);
}

function mixBudget() {
  const el = document.getElementById("mix-budget-input");
  return (el && parseFloat(el.value)) || 10000;
}

function mixSetShare(i, val) {
  val = Math.max(0, Math.min(100, val));
  const others = MIX_CH.map((_, k) => k).filter((k) => k !== i);
  const otherSum = others.reduce((s, k) => s + mixShares[k], 0);
  const remaining = 100 - val;
  if (otherSum <= 1e-4) {
    others.forEach((k) => { mixShares[k] = remaining / others.length; });
  } else {
    others.forEach((k) => { mixShares[k] = mixShares[k] / otherSum * remaining; });
  }
  mixShares[i] = val;
  mixUpdate();
}

function mixBuildControls() {
  const el = document.getElementById("mix-channels");
  if (!el) return;
  el.innerHTML = MIX_CH.map((ch, i) => `
    <div class="mix-ch">
      <div class="mix-ch-head">
        <div class="mix-ch-name"><span class="mix-sw" style="background:${ch.hex}"></span>${ch.name}</div>
        <div class="mix-ch-share" id="mix-share-${i}"></div>
      </div>
      <input type="range" min="0" max="100" step="0.5" value="${mixShares[i]}"
             id="mix-slider-${i}" style="accent-color:${ch.hex}">
      <div class="mix-ch-meta">
        <span>spend <span class="m" id="mix-spend-${i}"></span></span>
        <span>marginal ROI <span class="m" id="mix-marg-${i}"></span></span>
      </div>
    </div>`).join("");

  MIX_CH.forEach((_, i) => {
    document.getElementById(`mix-slider-${i}`).addEventListener("input", (e) => {
      if (mixAnim) { cancelAnimationFrame(mixAnim); mixAnim = null; }
      mixSetShare(i, parseFloat(e.target.value));
    });
  });
}

function mixDrawPie() {
  const svg = document.getElementById("mix-pie");
  if (!svg) return;
  const cx = 110, cy = 110, r = 95;
  let angle = -90;
  const arcs = MIX_CH.map((ch, i) => {
    const frac = mixShares[i] / 100;
    if (frac <= 1e-4) return "";
    const start = angle, end = angle + frac * 360;
    angle = end;
    const toXY = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
    const [x1, y1] = toXY(start), [x2, y2] = toXY(end);
    // A full circle can't be drawn as one arc; nudge the sweep just under 360.
    const large = (end - start) > 180 ? 1 : 0;
    const e2 = frac >= 0.9999 ? toXY(start + 359.99) : [x2, y2];
    return `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${e2[0].toFixed(1)},${e2[1].toFixed(1)} Z" fill="${ch.hex}" stroke="#fff" stroke-width="2"/>`;
  }).join("");
  svg.innerHTML = arcs + `<circle cx="${cx}" cy="${cy}" r="46" fill="#fff"/>`;

  document.getElementById("mix-legend").innerHTML = MIX_CH.map((ch, i) =>
    `<div class="mix-legend-item"><span class="mix-sw" style="background:${ch.hex}"></span>${ch.name} — ${mixShares[i].toFixed(1)}%</div>`
  ).join("");
}

function mixUpdate() {
  if (!document.getElementById("mix-channels")) return;
  const tb = mixBudget();
  let total = 0;
  const margs = [];

  MIX_CH.forEach((ch, i) => {
    const spend = mixShares[i] / 100 * tb;
    total += mixOutcomeAt(ch, spend);
    const marg = mixMarginalAt(ch, spend);
    margs.push(marg);
    document.getElementById(`mix-share-${i}`).textContent = mixShares[i].toFixed(1) + "%";
    document.getElementById(`mix-slider-${i}`).value = mixShares[i];
    document.getElementById(`mix-spend-${i}`).textContent = "$" + fmtInt(spend);
    document.getElementById(`mix-marg-${i}`).textContent = marg.toFixed(2) + "x";
  });

  document.getElementById("mix-total-out").textContent = "$" + fmtInt(total);

  if (mixBaseline === null) mixBaseline = total;
  const delta = total - mixBaseline;
  const dEl = document.getElementById("mix-delta-out");
  const sign = delta >= 0 ? "+" : "\u2212";
  dEl.textContent = `${sign}$${fmtInt(Math.abs(delta))} (${sign}${Math.abs(delta / mixBaseline * 100).toFixed(1)}%)`;
  dEl.className = "mix-v " + (Math.abs(delta) < 0.5 ? "" : delta > 0 ? "up" : "down");

  // Spread of marginal ROI across channels — collapses to ~0 at the optimum.
  const spread = Math.max(...margs) - Math.min(...margs);
  const sEl = document.getElementById("mix-spread");
  sEl.textContent = spread.toFixed(2) + "x";
  sEl.className = "mix-v " + (spread < 0.05 ? "up" : "");

  mixDrawPie();
}

function mixOptimize() {
  const tb = mixBudget();
  const s = [...mixShares];
  for (let iter = 0; iter < 6000; iter++) {
    const margs = MIX_CH.map((ch, i) => mixMarginalAt(ch, s[i] / 100 * tb));
    let maxI = 0, minI = 0;
    margs.forEach((m, i) => { if (m > margs[maxI]) maxI = i; if (m < margs[minI]) minI = i; });
    if (maxI === minI || s[minI] <= 0.01) break;
    const step = Math.min(0.03, s[minI]);
    s[minI] -= step;
    s[maxI] += step;
  }
  mixAnimateTo(s);
}

function mixAnimateTo(target) {
  if (mixAnim) cancelAnimationFrame(mixAnim);
  const start = [...mixShares];
  const t0 = performance.now();
  const dur = 700;
  function frame(now) {
    const t = Math.min(1, (now - t0) / dur);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    mixShares = start.map((s0, i) => s0 + (target[i] - s0) * e);
    mixUpdate();
    mixAnim = t < 1 ? requestAnimationFrame(frame) : null;
  }
  mixAnim = requestAnimationFrame(frame);
}

function renderMixSim() {
  if (!document.getElementById("mix-channels")) return;
  mixBuildControls();
  mixUpdate();

  document.getElementById("mix-budget-input").addEventListener("input", () => {
    mixBaseline = null;
    mixUpdate();
  });
  document.getElementById("mix-optimize").addEventListener("click", mixOptimize);
  document.getElementById("mix-reset").addEventListener("click", () => {
    mixBaseline = null;
    mixAnimateTo(MIX_CH.map(() => 100 / MIX_CH.length));
  });
}

/* ---------- Gate simulator ---------- */

// The 10 feasible perturbations, in RFC order (validation/perturbations.py:255-265).
const GS_PERTURBATIONS = [
  ["stratified_account_trim",     "Exempt top-5% whale accounts, drop 5% of mid/low"],
  ["segment_blackout",            "Delete one firmographic segment's accounts"],
  ["proportional_spend_jitter",   "\u00b15% Gaussian noise per account-channel"],
  ["zero_bound_injection",        "Force one channel's spend to exactly 0"],
  ["adstock_decay_perturbation",  "Shift adstock memory decay by \u00b110%"],
  ["funnel_lag_shift",            "Slide spend \u00b11\u201314 days (CRM logging delay)"],
  ["time_boundary_rolling",       "Drop oldest 4 periods, zero-pad the tail"],
  ["global_spend_scale",          "Re-baseline whole spend tensor \u00b110%"],
  ["single_channel_damp",         "Haircut one channel's spend by 25%"],
  ["spend_pulse_smoothing",       "3-period moving average over spend spikes"],
];

let gsToggles = GS_PERTURBATIONS.map((_, i) => i !== 2);

function gsBuildToggles() {
  const el = document.getElementById("gs-toggles");
  if (!el) return;
  el.innerHTML = GS_PERTURBATIONS.map(([name, desc], i) => `
    <div class="gs-toggle" title="${desc}">
      <span class="gs-toggle-name">${name}</span>
      <div class="gs-track ${gsToggles[i] ? "on" : ""}" id="gs-tg-${i}" role="switch"
           aria-checked="${gsToggles[i]}" tabindex="0"><div class="gs-knob"></div></div>
    </div>`).join("");

  GS_PERTURBATIONS.forEach((_, i) => {
    const t = document.getElementById(`gs-tg-${i}`);
    const flip = () => {
      gsToggles[i] = !gsToggles[i];
      t.classList.toggle("on", gsToggles[i]);
      t.setAttribute("aria-checked", String(gsToggles[i]));
      gsUpdate();
    };
    t.addEventListener("click", flip);
    t.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
    });
  });
}

function gsBadge(id, text, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = "badge badge-" + cls;
}

function gsUpdate() {
  if (!document.getElementById("gs-toggles")) return;
  const num = (id) => parseFloat(document.getElementById(id).value);
  const set = (id, v) => { document.getElementById(id).textContent = v; };

  // --- Gate 1: convergence ---
  const rhat = num("gs-rhat"), essb = num("gs-essb"), esst = num("gs-esst"), div = num("gs-div");
  set("gs-rhat-val", rhat.toFixed(3));
  set("gs-essb-val", fmtInt(essb));
  set("gs-esst-val", fmtInt(esst));
  set("gs-div-val", fmtInt(div));

  const checks = [
    ["gs-rhat", rhat <= 1.01],
    ["gs-essb", essb >= 400],
    ["gs-esst", esst >= 400],
    ["gs-div", div === 0],
  ];
  checks.forEach(([id, ok]) => {
    const gate = document.getElementById(id).closest(".gs-gate");
    gate.classList.toggle("ok", ok);
    gate.classList.toggle("bad", !ok);
  });
  const convOk = checks.every(([, ok]) => ok);
  gsBadge("gs-conv-badge", convOk ? "pass" : "fail", convOk ? "pass" : "fail");

  // --- Gate 2: reconciliation (two-sample Z) ---
  const model = num("gs-model"), lift = num("gs-lift");
  const sigmaM = num("gs-sigmam"), sigmaL = num("gs-sigmal");
  set("gs-model-val", model.toFixed(2) + "x");
  set("gs-lift-val", lift.toFixed(2) + "x");
  set("gs-sigmam-val", sigmaM.toFixed(2));
  set("gs-sigmal-val", sigmaL.toFixed(2));

  const gap = Math.abs(model - lift);
  const denom = Math.sqrt(sigmaM * sigmaM + sigmaL * sigmaL);
  set("gs-gap", gap.toFixed(2) + "x");
  set("gs-denom", denom.toFixed(3));

  let z, reconStatus, reconCls;
  if (denom < 1e-9) {
    z = NaN;
    reconStatus = "not calibrated";
    reconCls = "warn";
    set("gs-z", "\u2014");
  } else {
    z = gap / denom;
    set("gs-z", z.toFixed(2));
    if (z < 1.0)      { reconStatus = "agree";    reconCls = "pass"; }
    else if (z <= 2.0){ reconStatus = "tension";  reconCls = "warn"; }
    else              { reconStatus = "conflict"; reconCls = "fail"; }
  }
  gsBadge("gs-recon-badge", reconStatus, reconCls);

  // Marker position: Z=0 at left edge, Z=3 at right, clamped.
  const zPct = Math.max(0, Math.min(100, (isNaN(z) ? 0 : z) / 3 * 100));
  document.getElementById("gs-zmark").style.left = `calc(${zPct}% - 1.5px)`;

  const reconOk = reconStatus !== "conflict";

  // --- Gate 3: stability ---
  const held = gsToggles.filter(Boolean).length;
  set("gs-stab-count", held + " / 10 held");
  let stabTier, stabCls;
  if (held === 10)     { stabTier = "high";   stabCls = "pass"; }
  else if (held >= 8)  { stabTier = "medium"; stabCls = "warn"; }
  else                 { stabTier = "low";    stabCls = "fail"; }
  gsBadge("gs-stab-badge", stabTier, stabCls);
  const stabOk = held >= 8;

  // --- Verdict ---
  let name, desc, color;
  if (!convOk) {
    name = "Not certified \u2014 refit required";
    color = "var(--red)";
    const failed = [
      rhat > 1.01 ? "r\u0302" : null,
      essb < 400 ? "ESS bulk" : null,
      esst < 400 ? "ESS tail" : null,
      div > 0 ? "divergences" : null,
    ].filter(Boolean).join(", ");
    desc = `The posterior failed on ${failed}. Nothing downstream is trustworthy \u2014 `
         + `no ROI, no ranking, no recommendation \u2014 until this is refit.`;
  } else if (!reconOk) {
    name = "Not certified \u2014 conflicts with experiment";
    color = "var(--red)";
    desc = `The sampler converged cleanly, but the model sits ${z.toFixed(1)}\u03c3 from a `
         + `randomised lift test. That is a converged model that disagrees with reality, `
         + `which flips validation_passed to False.`;
  } else if (!stabOk) {
    name = "Usable \u2014 flagged unstable";
    color = "var(--amber)";
    desc = `Converged and consistent with experiment, but the top-3 ranking only survived `
         + `${held} of 10 perturbations. Below the 8/10 floor the recommendation isn't robust `
         + `enough to move budget on, even though the model may well be right.`;
  } else if (reconStatus === "tension" || held < 10) {
    name = "Certified \u2014 medium confidence";
    color = "var(--amber)";
    const why = [];
    if (reconStatus === "tension") why.push("reconciliation is in tension (\u22120.15)");
    if (held < 10) why.push(`stability held ${held}/10`);
    desc = `All three gates pass, but with caveats: ${why.join(" and ")}. Actionable, with the `
         + `reasons reported alongside the number rather than hidden.`;
  } else {
    name = "Certified \u2014 high confidence";
    color = "var(--green)";
    desc = `Converged cleanly, agrees with the lift test inside 1\u03c3, and the ranking survived `
         + `all 10 perturbations. This is the case where you act on the recommendation.`;
  }
  const nameEl = document.getElementById("gs-verdict-name");
  nameEl.textContent = name;
  nameEl.style.color = color;
  document.getElementById("gs-verdict-desc").textContent = desc;
}

function renderGateSim() {
  if (!document.getElementById("gs-toggles")) return;
  gsBuildToggles();
  ["gs-rhat", "gs-essb", "gs-esst", "gs-div",
   "gs-model", "gs-lift", "gs-sigmam", "gs-sigmal"].forEach((id) => {
    document.getElementById(id).addEventListener("input", gsUpdate);
  });
  gsUpdate();
}

/* ---------- Outcome types simulator ---------- */

// Illustrative curve parameters — hand-picked so the four outcomes differ
// sensibly. In production every one comes from the posterior, per draw.
const OC_TYPES = [
  { key: "leads",     name: "Qualified Leads",    tag: "# \u00b7 count, early funnel",
    accent: "#01754f", coef: 46,   halfsat: 700,  slope: 1.2, isDollar: false, signal: 82,
    blurb: "How many real potential buyers this spend surfaced. A rate of leads per dollar, not a revenue figure." },
  { key: "pipeline",  name: "Pipeline Revenue",   tag: "$ \u00b7 dollars, fast-moving",
    accent: "#0a66c2", coef: 8500, halfsat: 900,  slope: 1.5, isDollar: true,  signal: 38,
    blurb: "Open deal value in the funnel right now. Fast-moving, so it reflects recent spend most directly." },
  { key: "stagetx",   name: "Stage Transitions",  tag: "# \u00b7 count, momentum",
    accent: "#6a5acd", coef: 19,   halfsat: 850,  slope: 1.6, isDollar: false, signal: 64,
    blurb: "How many deals this spend helped move forward a stage. Measures whether things advance, not their size." },
  { key: "closedwon", name: "Closed-Won Revenue", tag: "$ \u00b7 dollars, slow-lagging",
    accent: "#915907", coef: 3200, halfsat: 1400, slope: 1.7, isDollar: true,  signal: 70,
    blurb: "Actual signed revenue. Ground truth, but recent spend often hasn't had time to show up here yet." },
];

function ocBuildCards() {
  const el = document.getElementById("oc-cards");
  if (!el) return;
  el.innerHTML = OC_TYPES.map((o) => `
    <div class="oc-card" style="--accent:${o.accent}">
      <div class="oc-head"><span class="oc-name">${o.name}</span><span class="oc-tag">${o.tag}</span></div>
      <div class="oc-blurb">${o.blurb}</div>
      <div class="oc-sig">
        <label><span>How much usable data backs this outcome</span><span class="v" id="oc-sig-${o.key}-val"></span></label>
        <input type="range" id="oc-sig-${o.key}" min="0" max="100" step="1" value="${o.signal}">
      </div>
      <div class="oc-result" id="oc-res-${o.key}"></div>
      <div class="oc-math" id="oc-math-${o.key}"></div>
    </div>`).join("");

  OC_TYPES.forEach((o) => {
    document.getElementById(`oc-sig-${o.key}`).addEventListener("input", ocUpdate);
  });
}

function ocUpdate() {
  if (!document.getElementById("oc-cards")) return;
  const num = (id) => parseFloat(document.getElementById(id).value);
  const spend = num("oc-spend"), decay = num("oc-decay"), carry = num("oc-carry");

  document.getElementById("oc-spend-val").textContent = "$" + fmtInt(spend);
  document.getElementById("oc-decay-val").textContent = decay.toFixed(2);
  document.getElementById("oc-carry-val").textContent = fmtInt(carry);

  const exposure = spend + decay * carry;
  document.getElementById("oc-shared").innerHTML =
    `shared adstock = <span class="num">${fmtInt(spend)}</span> + `
    + `<span class="num">${decay.toFixed(2)}</span> \u00d7 <span class="num">${fmtInt(carry)}</span> `
    + `= <span class="num">${fmtInt(exposure)}</span> effective exposure \u2192 feeds all four`;

  OC_TYPES.forEach((o) => {
    const signal = num(`oc-sig-${o.key}`);
    document.getElementById(`oc-sig-${o.key}-val`).textContent = signal + "%";
    const ess = signal * 8; // illustrative proxy for effective sample size
    const box = document.getElementById(`oc-res-${o.key}`);
    const math = document.getElementById(`oc-math-${o.key}`);

    if (ess < 400) {
      box.className = "oc-result refuse";
      box.innerHTML = `<div class="big">Refuses to allocate</div>`
        + `<div class="small">Effective sample size \u2248 ${fmtInt(ess)}, below the 400 gate. `
        + `Not enough signal to trust an answer here \u2014 the system says so instead of guessing.</div>`;
      math.innerHTML =
        `<span class="step">usable data <span class="num">${signal}%</span> \u00d7 8 \u2248 ESS <span class="num">${fmtInt(ess)}</span></span>`
        + `<span class="step"><span class="num">${fmtInt(ess)}</span> &lt; 400 \u2192 refuse; saturation and coefficient are never computed</span>`;
      return;
    }

    const satNum = Math.pow(exposure, o.slope);
    const satVal = exposure > 0 ? satNum / (satNum + Math.pow(o.halfsat, o.slope)) : 0;
    const out = satVal * o.coef;
    const roi = spend > 0 ? out / spend : 0;

    box.className = "oc-result ok";
    box.innerHTML = o.isDollar
      ? `<div class="big">$${fmtInt(out)} predicted</div>`
        + `<div class="small">${roi.toFixed(2)}\u00d7 \u2014 every dollar spent returns about $${roi.toFixed(2)} of ${o.name.toLowerCase()}.</div>`
      : `<div class="big">${out.toFixed(1)} predicted</div>`
        + `<div class="small">${roi.toFixed(3)} per dollar \u2014 a rate, not revenue. Inverted, that's `
        + `$${roi > 0 ? fmtInt(1 / roi) : "\u2014"} per outcome.</div>`;

    const sl = o.slope.toFixed(2);
    math.innerHTML =
      `<span class="step">usable data <span class="num">${signal}%</span> \u00d7 8 \u2248 ESS <span class="num">${fmtInt(ess)}</span> \u2265 400 \u2192 proceed</span>`
      + `<span class="step">shared adstock = <span class="num">${fmtInt(exposure)}</span></span>`
      + `<span class="step">sat = ${fmtInt(exposure)}<sup>${sl}</sup> \u00f7 (${fmtInt(exposure)}<sup>${sl}</sup> + ${fmtInt(o.halfsat)}<sup>${sl}</sup>) = <span class="num">${(satVal * 100).toFixed(1)}%</span></span>`
      + `<span class="step">${(satVal * 100).toFixed(1)}% \u00d7 coef <span class="num">${fmtInt(o.coef)}</span> = <span class="num">${out.toFixed(1)}</span></span>`
      + `<span class="step">${out.toFixed(1)} \u00f7 spend <span class="num">${fmtInt(spend)}</span> = <span class="num">${roi.toFixed(3)}</span> per dollar</span>`;
  });
}

function renderOutcomeSim() {
  if (!document.getElementById("oc-cards")) return;
  ocBuildCards();
  ["oc-spend", "oc-decay", "oc-carry"].forEach((id) => {
    document.getElementById(id).addEventListener("input", ocUpdate);
  });
  ocUpdate();
}

/* ---------- Response curves simulator ---------- */

// Illustrative shapes, one per site channel. Production reads these from the
// posterior, one value per draw.
const RC_CH = [
  { name: "LinkedIn Ads", coef: 11000, halfsat: 2200, slope: 1.2, observed: 3800 },
  { name: "Search",       coef: 14000, halfsat: 1800, slope: 1.3, observed: 3200 },
  { name: "Display",      coef:  9000, halfsat: 1200, slope: 1.6, observed: 2400 },
].map((c) => ({ ...c, hex: colorOf(c.name) }));

const RC_MAX_SPEND = 5000;
let rcActive = 0;
let rcCompare = false;

function rcOutcomeAt(c, spend) {
  if (spend <= 0) return 0;
  const num = Math.pow(spend, c.slope);
  return c.coef * num / (num + Math.pow(c.halfsat, c.slope));
}

function rcBuildTabs() {
  const el = document.getElementById("rc-tabs");
  if (!el) return;
  el.innerHTML = RC_CH.map((c, i) => `
    <button class="rc-tab ${i === rcActive ? "active" : ""}" id="rc-tab-${i}"
            style="${i === rcActive ? `background:${c.hex}` : ""}">
      <span class="dot" style="background:${c.hex}"></span>${c.name}
    </button>`).join("");
  RC_CH.forEach((_, i) => {
    document.getElementById(`rc-tab-${i}`).addEventListener("click", () => {
      rcActive = i;
      rcSyncControls();
      rcBuildTabs();
      rcRender();
    });
  });
}

function rcSyncControls() {
  const c = RC_CH[rcActive];
  document.getElementById("rc-coef").value = c.coef;
  document.getElementById("rc-halfsat").value = c.halfsat;
  document.getElementById("rc-slope").value = c.slope;
  document.getElementById("rc-observed").value = c.observed;
  const sw = document.getElementById("rc-sw-main");
  if (sw) sw.style.background = c.hex;
}

function rcRender() {
  if (!document.getElementById("rc-curve")) return;
  const num = (id) => parseFloat(document.getElementById(id).value);
  const c = RC_CH[rcActive];

  c.coef = num("rc-coef");
  c.halfsat = num("rc-halfsat");
  c.slope = num("rc-slope");
  c.observed = num("rc-observed");
  const spend = num("rc-spend");

  const set = (id, v) => { document.getElementById(id).textContent = v; };
  set("rc-v-coef", fmtInt(c.coef));
  set("rc-v-halfsat", fmtInt(c.halfsat));
  set("rc-v-slope", c.slope.toFixed(2));
  set("rc-v-observed", "$" + fmtInt(c.observed));
  set("rc-v-spend", "$" + fmtInt(spend));

  const W = 900, H = 320, pad = { l: 64, r: 24, t: 18, b: 36 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;

  let maxOut = 1;
  (rcCompare ? RC_CH : [c]).forEach((cc) => {
    for (let sp = 0; sp <= RC_MAX_SPEND; sp += RC_MAX_SPEND / 60) {
      const o = rcOutcomeAt(cc, sp);
      if (o > maxOut) maxOut = o;
    }
  });
  maxOut *= 1.08;

  const X = (sp) => pad.l + (sp / RC_MAX_SPEND) * plotW;
  const Y = (o) => pad.t + plotH - (o / maxOut) * plotH;

  const pathFor = (cc, from, to) => {
    const pts = [];
    const step = RC_MAX_SPEND / 140;
    for (let sp = from; sp <= to + 1e-9; sp += step) pts.push([sp, rcOutcomeAt(cc, sp)]);
    if (pts.length && pts[pts.length - 1][0] < to) pts.push([to, rcOutcomeAt(cc, to)]);
    return pts.map((p, i) => (i === 0 ? "M" : "L") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
  };

  let grid = "", xLabels = "";
  for (let i = 0; i <= 4; i++) {
    const gy = pad.t + plotH - (i / 4) * plotH;
    grid += `<line x1="${pad.l}" y1="${gy}" x2="${W - pad.r}" y2="${gy}" stroke="#e0dfdc" stroke-width="1"/>`
         +  `<text x="${pad.l - 8}" y="${gy + 4}" fill="rgba(0,0,0,.45)" font-size="10" text-anchor="end">${fmtInt((i / 4) * maxOut)}</text>`;
  }
  for (let i = 0; i <= 5; i++) {
    const sp = (i / 5) * RC_MAX_SPEND;
    xLabels += `<text x="${X(sp)}" y="${H - 10}" fill="rgba(0,0,0,.45)" font-size="10" text-anchor="middle">$${fmtInt(sp)}</text>`;
  }

  let compareLines = "";
  if (rcCompare) {
    RC_CH.forEach((cc, i) => {
      if (i !== rcActive) {
        compareLines += `<path d="${pathFor(cc, 0, RC_MAX_SPEND)}" fill="none" stroke="${cc.hex}" stroke-width="1.5" opacity="0.3"/>`;
      }
    });
  }

  const obsX = X(c.observed);
  const shade = `<rect x="${pad.l}" y="${pad.t}" width="${Math.max(0, obsX - pad.l).toFixed(1)}" height="${plotH}" fill="${c.hex}" opacity="0.07"/>`;
  const obsLine = `<line x1="${obsX}" y1="${pad.t}" x2="${obsX}" y2="${pad.t + plotH}" stroke="${c.hex}" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>`;

  // Solid inside observed range, dashed beyond it — the visual claim of the page.
  const solid = `<path d="${pathFor(c, 0, Math.min(c.observed, RC_MAX_SPEND))}" fill="none" stroke="${c.hex}" stroke-width="2.5"/>`;
  const dashed = c.observed < RC_MAX_SPEND
    ? `<path d="${pathFor(c, c.observed, RC_MAX_SPEND)}" fill="none" stroke="${c.hex}" stroke-width="2.5" stroke-dasharray="6 5" opacity="0.75"/>`
    : "";

  const out = rcOutcomeAt(c, spend);
  const cx = X(spend), cy = Y(out);
  const h = 1;
  const hi = Math.min(spend + h, RC_MAX_SPEND), lo = Math.max(spend - h, 0);
  const mroi = hi - lo > 0 ? (rcOutcomeAt(c, hi) - rcOutcomeAt(c, lo)) / (hi - lo) : 0;

  const dxData = 420;
  const dxS = (dxData / RC_MAX_SPEND) * plotW;
  const dyS = (mroi * dxData) / maxOut * plotH;
  const extrapolated = spend > c.observed;

  document.getElementById("rc-curve").innerHTML = `
    ${grid}
    ${shade}
    ${compareLines}
    <line x1="${(cx - dxS).toFixed(1)}" y1="${(cy + dyS).toFixed(1)}" x2="${(cx + dxS).toFixed(1)}" y2="${(cy - dyS).toFixed(1)}" stroke="#915907" stroke-width="2"/>
    ${solid}
    ${dashed}
    ${obsLine}
    <line x1="${cx}" y1="${pad.t}" x2="${cx}" y2="${pad.t + plotH}" stroke="${c.hex}" stroke-width="1" stroke-dasharray="2 5" opacity="0.6"/>
    <circle cx="${cx}" cy="${cy}" r="5.5" fill="${extrapolated ? "#915907" : c.hex}" stroke="#fff" stroke-width="2"/>
    <text x="${pad.l + 8}" y="${pad.t + 15}" fill="rgba(0,0,0,.45)" font-size="10">observed range</text>
    ${xLabels}`;

  set("rc-out", fmtInt(out));
  set("rc-roi", spend > 0 ? (out / spend).toFixed(2) + "x" : "\u2014");
  set("rc-mroi", mroi.toFixed(2) + "x");

  const st = document.getElementById("rc-status");
  st.textContent = extrapolated ? "extrapolated" : "within data";
  st.className = "rc-v " + (extrapolated ? "warn" : "ok");
}

function renderCurveSim() {
  if (!document.getElementById("rc-curve")) return;
  rcBuildTabs();
  rcSyncControls();
  document.getElementById("rc-spend").value = 1800;

  ["rc-coef", "rc-halfsat", "rc-slope", "rc-observed", "rc-spend"].forEach((id) => {
    document.getElementById(id).addEventListener("input", rcRender);
  });

  const tg = document.getElementById("rc-compare");
  const flip = () => {
    rcCompare = !rcCompare;
    tg.classList.toggle("on", rcCompare);
    tg.setAttribute("aria-checked", String(rcCompare));
    rcRender();
  };
  tg.addEventListener("click", flip);
  tg.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
  });

  rcRender();
}

/* ---------- Boot ---------- */

renderOverview();
renderTabs();
renderOutcome(OUTCOME_ORDER[0]);
renderReport();
renderGrains();
renderTiers();
renderConfidence();
renderReconciliation();
renderFunnel();
renderValidation();
renderContract();
renderExcel();
renderPowerBI();
renderEmbeds();
renderSimulator();
initSimRoiSticky();
renderMixSim();
renderGateSim();
renderOutcomeSim();
renderCurveSim();
renderFooters();

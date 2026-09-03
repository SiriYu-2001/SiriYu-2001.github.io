"use strict";

const SOURCES = {
  historical: {
    id: "historical",
    label: "历史源",
    range: "1998–99 至 2017–18",
    url: "https://raw.githubusercontent.com/aaronfrederick/B-Tier-Basketball-Career-Modeling/21147a56ac066faff5eb573be2cffb38094b4e11/nba_salaries_1990_to_2018.csv",
    page: "https://github.com/aaronfrederick/B-Tier-Basketball-Career-Modeling/blob/21147a56ac066faff5eb573be2cffb38094b4e11/nba_salaries_1990_to_2018.csv"
  },
  modern: {
    id: "modern",
    label: "近年源",
    range: "2018–19 至 2024–25",
    url: "https://raw.githubusercontent.com/edwinjeon/NBA-Salary-Prediction/main/data/NBA%20Player%20Salaries_2000-2025.csv",
    page: "https://github.com/edwinjeon/NBA-Salary-Prediction/blob/main/data/NBA%20Player%20Salaries_2000-2025.csv"
  },
  supplement: {
    id: "supplement",
    label: "2025–26 补充",
    range: "2025–26",
    url: "https://raw.githubusercontent.com/ucb-ds/nwdse-demo/daa1398e063c34c0d065bc3f5ee1ba3302588831/nba-demo/salary_data_nba_2026.csv",
    page: "https://github.com/ucb-ds/nwdse-demo/blob/daa1398e063c34c0d065bc3f5ee1ba3302588831/nba-demo/salary_data_nba_2026.csv"
  }
};

const milestones = [
  { endYear: 1999, short: "停摆", full: "1998–99 停摆 / 50 场赛季", kind: "transition" },
  { endYear: 2000, short: "1999 CBA", full: "1999–00：1999 CBA 后首个完整赛季", kind: "cba" },
  { endYear: 2006, short: "2005 CBA", full: "2005–06：2005 CBA 阶段", kind: "cba" },
  { endYear: 2012, short: "2011 CBA", full: "2011–12：2011 CBA / 缩水赛季", kind: "cba" },
  { endYear: 2018, short: "2017 CBA", full: "2017–18：2017 CBA 生效阶段", kind: "cba" },
  { endYear: 2019, short: "来源切换", full: "2018–19：主序列数据源切换", kind: "source" },
  { endYear: 2024, short: "2023 CBA", full: "2023–24：2023 CBA 生效阶段", kind: "cba" }
];

const state = {
  raw: {},
  sourceMeta: {},
  records: [],
  seasons: [],
  sampleMode: "all",
  smoothWindow: 3,
  startEndYear: 1999,
  endEndYear: 2025,
  selectedEndYear: 2025,
  include2026: false,
  showMilestones: true,
  loadWarnings: []
};

const el = id => document.getElementById(id);
const svgNS = "http://www.w3.org/2000/svg";
const fmt3 = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmt1 = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const fmtMoney = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "USD", maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" });
const fmtMoneyFull = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("zh-CN", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

function setStatus(message, status = "ready", showUpload = false) {
  el("status").dataset.state = status;
  el("statusText").textContent = message;
  el("uploadLabel").classList.toggle("hidden", !showUpload);
}

function seasonLabel(endYear) {
  return `${endYear - 1}–${String(endYear).slice(-2)}`;
}

function normalizeName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function parseNumber(value) {
  const cleaned = String(value ?? "").replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === "," && !inQuotes) {
      row.push(field); field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field); field = "";
      if (row.some(v => String(v).trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some(v => String(v).trim() !== "")) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map(h => String(h).replace(/^\uFEFF/, "").trim());
  return rows.slice(1).map(values => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
    return obj;
  });
}

function rowToLower(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) out[key.trim().toLowerCase()] = value;
  return out;
}

function standardizeRows(rows, sourceId, fixedEndYear = null) {
  const out = [];
  for (const row of rows) {
    const r = rowToLower(row);
    const player = String(r.player || r.name || r.player_name || "").trim();
    const salary = parseNumber(r.salary || r.salary_nominal_usd || r.amount);
    const endYear = fixedEndYear ?? Number(r.season_end || r.season || r.year);
    if (!player || !Number.isInteger(endYear) || !Number.isFinite(salary) || salary <= 0) continue;
    out.push({
      player,
      key: normalizeName(player),
      salary,
      endYear,
      sourceId
    });
  }
  return out;
}

function dedupe(records) {
  const byKey = new Map();
  for (const record of records) {
    const key = `${record.endYear}|${record.key}`;
    const prior = byKey.get(key);
    if (!prior || record.salary > prior.salary) byKey.set(key, record);
  }
  return [...byKey.values()];
}

function gini(values) {
  const x = values.filter(Number.isFinite).filter(v => v >= 0).slice().sort((a, b) => a - b);
  const n = x.length;
  const total = x.reduce((a, b) => a + b, 0);
  if (!n || total === 0) return NaN;
  let weighted = 0;
  for (let i = 0; i < n; i++) weighted += (i + 1) * x[i];
  return (2 * weighted) / (n * total) - (n + 1) / n;
}

function median(sortedAsc) {
  const n = sortedAsc.length;
  if (!n) return NaN;
  const mid = Math.floor(n / 2);
  return n % 2 ? sortedAsc[mid] : (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
}

function metricsFor(records, mode) {
  const sortedDesc = records.slice().sort((a, b) => b.salary - a.salary);
  const limit = mode === "top450" ? 450 : mode === "top360" ? 360 : Infinity;
  const selected = sortedDesc.slice(0, Math.min(limit, sortedDesc.length));
  const salariesDesc = selected.map(d => d.salary);
  const salariesAsc = salariesDesc.slice().sort((a, b) => a - b);
  const total = salariesDesc.reduce((a, b) => a + b, 0);
  const topCount = Math.max(1, Math.ceil(selected.length * 0.10));
  const top10Total = salariesDesc.slice(0, topCount).reduce((a, b) => a + b, 0);
  return {
    mode,
    records: selected,
    salariesDesc,
    salariesAsc,
    n: selected.length,
    total,
    gini: gini(salariesAsc),
    mean: selected.length ? total / selected.length : NaN,
    median: median(salariesAsc),
    min: salariesAsc[0] ?? NaN,
    max: salariesDesc[0] ?? NaN,
    top10Share: total ? top10Total / total : NaN,
    truncated: Number.isFinite(limit) && sortedDesc.length > limit,
    fullN: sortedDesc.length
  };
}

function buildSeasonData(records) {
  const groups = new Map();
  for (const record of records) {
    if (!groups.has(record.endYear)) groups.set(record.endYear, []);
    groups.get(record.endYear).push(record);
  }
  const seasons = [];
  for (const [endYear, seasonRecords] of groups.entries()) {
    const sourceIds = [...new Set(seasonRecords.map(d => d.sourceId))];
    seasons.push({
      endYear,
      label: seasonLabel(endYear),
      sourceIds,
      all: metricsFor(seasonRecords, "all"),
      top450: metricsFor(seasonRecords, "top450"),
      top360: metricsFor(seasonRecords, "top360")
    });
  }
  seasons.sort((a, b) => a.endYear - b.endYear);
  for (const mode of ["all", "top450", "top360"]) {
    seasons.forEach((season, index) => {
      season[mode].yoy = index ? season[mode].gini - seasons[index - 1][mode].gini : NaN;
    });
  }
  return seasons;
}

function centeredAverage(values, window) {
  if (!window || window <= 1) return values.map(() => NaN);
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length - 1, i + half);
    const slice = values.slice(start, end + 1).filter(Number.isFinite);
    return slice.length >= Math.min(2, window) ? slice.reduce((a, b) => a + b, 0) / slice.length : NaN;
  });
}

async function fetchWithCache(source, force = false) {
  const cacheKey = `nba-gini-cache:${source.id}:v2`;
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached && cached.text && Date.now() - cached.savedAt < 1000 * 60 * 60 * 24 * 30) {
        return { text: cached.text, fromCache: true };
      }
    } catch (_) {}
  }
  try {
    const response = await fetch(source.url, { cache: force ? "reload" : "default" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), text })); } catch (_) {}
    return { text, fromCache: false };
  } catch (error) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached && cached.text) return { text: cached.text, fromCache: true, stale: true };
    } catch (_) {}
    throw error;
  }
}

function generateDemoRecords() {
  let seed = 20260309;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const records = [];
  for (let endYear = 1999; endYear <= 2026; endYear++) {
    const n = endYear < 2005 ? 420 : endYear < 2017 ? 470 : 560;
    const capFactor = Math.pow(1.055, endYear - 1999);
    const concentration = 1.00 + Math.max(0, endYear - 2016) * 0.012;
    for (let i = 0; i < n; i++) {
      const u1 = Math.max(rnd(), 1e-6), u2 = rnd();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const salary = Math.max(180000, Math.exp(14.45 + concentration * z) * capFactor);
      records.push({ player: `Demo Player ${endYear}-${i + 1}`, key: `demo-${endYear}-${i + 1}`, salary, endYear, sourceId: endYear <= 2018 ? "historical" : endYear <= 2025 ? "modern" : "supplement" });
    }
  }
  return records;
}

function rebuildCombinedRecords() {
  const combined = [];
  if (state.raw.historical) {
    const rows = parseCSV(state.raw.historical);
    combined.push(...standardizeRows(rows, "historical").filter(d => d.endYear >= 1999 && d.endYear <= 2018));
  }
  if (state.raw.modern) {
    const rows = parseCSV(state.raw.modern);
    combined.push(...standardizeRows(rows, "modern").filter(d => d.endYear >= 2019 && d.endYear <= 2025));
  }
  if (state.include2026 && state.raw.supplement) {
    const rows = parseCSV(state.raw.supplement);
    combined.push(...standardizeRows(rows, "supplement", 2026));
  }
  state.records = dedupe(combined);
  state.seasons = buildSeasonData(state.records);
}

async function loadData(force = false) {
  setStatus("正在读取工资数据并计算年度基尼系数……", "loading", false);
  state.loadWarnings = [];
  const demo = new URLSearchParams(location.search).has("demo");
  if (demo) {
    state.records = generateDemoRecords();
    state.seasons = buildSeasonData(state.records.filter(d => state.include2026 || d.endYear <= 2025));
    state.sourceMeta = { historical: { fromCache: false }, modern: { fromCache: false }, supplement: { fromCache: false } };
    finalizeLoad("演示模式：使用确定性模拟数据，仅用于检查网页布局。", "warning");
    return;
  }

  const entries = Object.entries(SOURCES);
  const results = await Promise.allSettled(entries.map(async ([id, source]) => [id, await fetchWithCache(source, force)]));
  let loaded = 0;
  for (let i = 0; i < results.length; i++) {
    const [id] = entries[i];
    const result = results[i];
    if (result.status === "fulfilled") {
      const [, payload] = result.value;
      state.raw[id] = payload.text;
      state.sourceMeta[id] = payload;
      loaded++;
      if (payload.stale) state.loadWarnings.push(`${SOURCES[id].label}使用了旧缓存`);
    } else {
      state.loadWarnings.push(`${SOURCES[id].label}读取失败`);
    }
  }

  rebuildCombinedRecords();
  if (!state.seasons.length) {
    setStatus("未能读取远程数据。可选择一个或多个 CSV 文件在本地计算。", "error", true);
    clearDashboard();
    return;
  }
  const cacheCount = Object.values(state.sourceMeta).filter(d => d.fromCache).length;
  const message = `已读取 ${loaded} 个数据源、${fmtInt.format(state.records.length)} 条去重后的球员—赛季记录${cacheCount ? `（${cacheCount} 个来自浏览器缓存）` : ""}。`;
  finalizeLoad(message, state.loadWarnings.length ? "warning" : "ready");
}

function finalizeLoad(message, status) {
  populateSeasonSelectors();
  const years = state.seasons.map(d => d.endYear);
  if (!years.includes(state.startEndYear)) state.startEndYear = Math.max(1999, Math.min(...years));
  if (!years.includes(state.endEndYear)) state.endEndYear = Math.max(...years.filter(y => y <= (state.include2026 ? 2026 : 2025)));
  if (!years.includes(state.selectedEndYear)) state.selectedEndYear = state.endEndYear;
  syncControls();
  renderAll();
  const warningText = state.loadWarnings.length ? ` ${state.loadWarnings.join("；")}。` : "";
  setStatus(message + warningText, status, status === "error");
}

function clearDashboard() {
  ["kpiStart", "kpiLatest", "kpiPeak", "kpiChange", "detailGini", "detailN", "detailMedian", "detailTop10"].forEach(id => el(id).textContent = "—");
  el("trendChart").innerHTML = `<text x="560" y="250" text-anchor="middle" fill="var(--muted)">暂无数据</text>`;
  el("lorenzChart").innerHTML = "";
  el("annualTableBody").innerHTML = "";
  el("topEarners").innerHTML = "";
}

function populateSeasonSelectors() {
  const options = state.seasons.map(d => `<option value="${d.endYear}">${d.label}</option>`).join("");
  el("startSeason").innerHTML = options;
  el("endSeason").innerHTML = options;
}

function syncControls() {
  el("sampleMode").value = state.sampleMode;
  el("smoothWindow").value = String(state.smoothWindow);
  el("startSeason").value = String(state.startEndYear);
  el("endSeason").value = String(state.endEndYear);
  el("include2026").checked = state.include2026;
  el("showMilestones").checked = state.showMilestones;
}

function visibleSeasons() {
  return state.seasons.filter(d => d.endYear >= state.startEndYear && d.endYear <= state.endEndYear);
}

function renderAll() {
  renderKpis();
  renderTrend();
  renderDetails();
  renderTable();
}

function renderKpis() {
  const visible = visibleSeasons();
  if (!visible.length) return;
  const mode = state.sampleMode;
  const firstPost = state.seasons.find(d => d.endYear === 2000) || state.seasons.find(d => d.endYear >= 2000);
  const latest = visible[visible.length - 1];
  const peak = visible.reduce((a, b) => b[mode].gini > a[mode].gini ? b : a, visible[0]);
  const base = firstPost && firstPost.endYear <= latest.endYear ? firstPost : visible[0];
  const change = latest[mode].gini - base[mode].gini;

  el("kpiStart").textContent = firstPost ? fmt3.format(firstPost[mode].gini) : "—";
  el("kpiStartNote").textContent = firstPost ? `${firstPost.label} · n=${fmtInt.format(firstPost[mode].n)}` : "—";
  el("kpiLatest").textContent = fmt3.format(latest[mode].gini);
  el("kpiLatestNote").textContent = `${latest.label} · n=${fmtInt.format(latest[mode].n)}`;
  el("kpiPeak").textContent = fmt3.format(peak[mode].gini);
  el("kpiPeakNote").textContent = peak.label;
  el("kpiChange").textContent = `${change >= 0 ? "+" : ""}${fmt3.format(change)}`;
  el("kpiChange").className = `kpi-value ${change > 0 ? "up" : change < 0 ? "down" : ""}`;
  el("kpiChangeNote").textContent = `${base.label} → ${latest.label}`;
}

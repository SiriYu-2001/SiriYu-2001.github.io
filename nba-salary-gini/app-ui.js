"use strict";

function svgEl(name, attrs = {}, text = null) {
  const node = document.createElementNS(svgNS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== null) node.textContent = text;
  return node;
}

function pathFrom(points) {
  return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderTrend() {
  const svg = el("trendChart");
  svg.innerHTML = "";
  const data = visibleSeasons();
  if (!data.length) {
    svg.appendChild(svgEl("text", { x: 560, y: 250, "text-anchor": "middle", fill: cssVar("--muted") }, "当前筛选区间没有数据"));
    return;
  }

  const mode = state.sampleMode;
  const values = data.map(d => d[mode].gini);
  const smoothed = centeredAverage(values, state.smoothWindow);
  const W = 1120, H = 500;
  const margin = { top: 68, right: 30, bottom: 72, left: 72 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;
  let yMin = Math.max(0, Math.min(...values, ...smoothed.filter(Number.isFinite)) - 0.035);
  let yMax = Math.min(1, Math.max(...values, ...smoothed.filter(Number.isFinite)) + 0.035);
  if (yMax - yMin < 0.12) { const mid = (yMax + yMin) / 2; yMin = Math.max(0, mid - 0.06); yMax = Math.min(1, mid + 0.06); }
  const xScale = i => margin.left + (data.length === 1 ? innerW / 2 : i * innerW / (data.length - 1));
  const yScale = v => margin.top + (yMax - v) * innerH / (yMax - yMin);

  const bg = svgEl("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent" });
  svg.appendChild(bg);

  for (let i = 0; i <= 5; i++) {
    const value = yMin + (yMax - yMin) * i / 5;
    const y = yScale(value);
    svg.appendChild(svgEl("line", { x1: margin.left, y1: y, x2: W - margin.right, y2: y, stroke: cssVar("--grid"), "stroke-width": 1 }));
    svg.appendChild(svgEl("text", { x: margin.left - 12, y: y + 4, "text-anchor": "end", fill: cssVar("--muted"), "font-size": 12, "font-family": "var(--mono)" }, value.toFixed(3)));
  }

  const tickEvery = data.length > 22 ? 3 : data.length > 14 ? 2 : 1;
  data.forEach((d, i) => {
    if (i % tickEvery !== 0 && i !== data.length - 1) return;
    const x = xScale(i);
    svg.appendChild(svgEl("line", { x1: x, y1: H - margin.bottom, x2: x, y2: H - margin.bottom + 6, stroke: cssVar("--muted-2") }));
    const text = svgEl("text", { x, y: H - margin.bottom + 24, "text-anchor": "end", fill: cssVar("--muted"), "font-size": 11, transform: `rotate(-42 ${x} ${H - margin.bottom + 24})` }, d.label);
    svg.appendChild(text);
  });

  if (state.showMilestones) {
    milestones.forEach((m, idx) => {
      const dataIndex = data.findIndex(d => d.endYear === m.endYear);
      if (dataIndex < 0) return;
      const x = xScale(dataIndex);
      const color = m.kind === "source" ? cssVar("--accent") : m.kind === "transition" ? cssVar("--warning") : cssVar("--muted-2");
      svg.appendChild(svgEl("line", { x1: x, y1: margin.top - 12, x2: x, y2: H - margin.bottom, stroke: color, "stroke-width": m.kind === "source" ? 2 : 1.1, "stroke-dasharray": m.kind === "source" ? "5 4" : "3 5", opacity: 0.85 }));
      const y = 24 + (idx % 2) * 18;
      const label = svgEl("text", { x: x + 4, y, fill: color, "font-size": 10.5, "font-weight": 700 }, m.short);
      const title = svgEl("title", {}, m.full);
      label.appendChild(title);
      svg.appendChild(label);
    });
  }

  const smoothPoints = smoothed.map((v, i) => Number.isFinite(v) ? [xScale(i), yScale(v)] : null).filter(Boolean);
  if (state.smoothWindow > 1 && smoothPoints.length > 1) {
    svg.appendChild(svgEl("path", { d: pathFrom(smoothPoints), fill: "none", stroke: cssVar("--accent"), "stroke-width": 3.3, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0.82 }));
  }

  const points = values.map((v, i) => [xScale(i), yScale(v)]);
  const areaPath = `${pathFrom(points)} L${points[points.length - 1][0]},${H - margin.bottom} L${points[0][0]},${H - margin.bottom} Z`;
  const gradientId = "trendAreaGradient";
  const defs = svgEl("defs");
  const gradient = svgEl("linearGradient", { id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1 });
  gradient.appendChild(svgEl("stop", { offset: "0%", "stop-color": cssVar("--accent-2"), "stop-opacity": 0.22 }));
  gradient.appendChild(svgEl("stop", { offset: "100%", "stop-color": cssVar("--accent-2"), "stop-opacity": 0.01 }));
  defs.appendChild(gradient);
  svg.appendChild(defs);
  svg.appendChild(svgEl("path", { d: areaPath, fill: `url(#${gradientId})`, stroke: "none" }));
  svg.appendChild(svgEl("path", { d: pathFrom(points), fill: "none", stroke: cssVar("--accent-2"), "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));

  data.forEach((d, i) => {
    const selected = d.endYear === state.selectedEndYear;
    const circle = svgEl("circle", {
      cx: xScale(i), cy: yScale(d[mode].gini), r: selected ? 7 : 4.7,
      fill: selected ? cssVar("--surface-solid") : cssVar("--accent-2"),
      stroke: cssVar("--accent-2"), "stroke-width": selected ? 3 : 1.6,
      tabindex: 0, role: "button", "aria-label": `${d.label}，Gini ${d[mode].gini.toFixed(3)}`
    });
    circle.style.cursor = "pointer";
    circle.addEventListener("mouseenter", event => showTrendTooltip(event, d));
    circle.addEventListener("mousemove", event => showTrendTooltip(event, d));
    circle.addEventListener("mouseleave", hideTrendTooltip);
    circle.addEventListener("focus", event => showTrendTooltip(event, d));
    circle.addEventListener("blur", hideTrendTooltip);
    circle.addEventListener("click", () => selectSeason(d.endYear));
    circle.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") selectSeason(d.endYear); });
    svg.appendChild(circle);
  });

  svg.appendChild(svgEl("text", { x: 18, y: 18, fill: cssVar("--muted"), "font-size": 11 }, `样本口径：${modeLabel(mode)}`));
  el("smoothLegend").classList.toggle("hidden", state.smoothWindow <= 1);
  el("smoothLegend").lastChild && (el("smoothLegend").lastChild.textContent = `${state.smoothWindow} 年均值`);
  el("chartSubtitle").textContent = `当前显示 ${data[0].label} 至 ${data[data.length - 1].label}；点击数据点查看洛伦兹曲线。`;
}

function showTrendTooltip(event, season) {
  const mode = state.sampleMode;
  const metric = season[mode];
  const tooltip = el("trendTooltip");
  tooltip.innerHTML = `
    <strong>${season.label}</strong>
    <div class="tooltip-row"><span>Gini</span><span>${metric.gini.toFixed(4)}</span></div>
    <div class="tooltip-row"><span>样本数</span><span>${fmtInt.format(metric.n)}</span></div>
    <div class="tooltip-row"><span>中位数</span><span>${fmtMoney.format(metric.median)}</span></div>
    <div class="tooltip-row"><span>前10%</span><span>${fmtPct.format(metric.top10Share)}</span></div>`;
  const wrap = tooltip.parentElement.getBoundingClientRect();
  const target = event.target.getBoundingClientRect ? event.target.getBoundingClientRect() : null;
  const x = target ? target.left + target.width / 2 - wrap.left : event.clientX - wrap.left;
  const y = target ? target.top - wrap.top : event.clientY - wrap.top;
  tooltip.style.left = `${Math.min(Math.max(x, 100), wrap.width - 100)}px`;
  tooltip.style.top = `${Math.max(y, 85)}px`;
  tooltip.style.opacity = 1;
}

function hideTrendTooltip() { el("trendTooltip").style.opacity = 0; }

function modeLabel(mode) {
  return mode === "top450" ? "每季最高薪 450 人" : mode === "top360" ? "每季最高薪 360 人" : "全部列示球员";
}

function selectSeason(endYear) {
  state.selectedEndYear = endYear;
  renderTrend();
  renderDetails();
  renderTable();
}

function renderDetails() {
  const season = state.seasons.find(d => d.endYear === state.selectedEndYear) || visibleSeasons().at(-1);
  if (!season) return;
  const metric = season[state.sampleMode];
  el("selectedSeasonTitle").textContent = `${season.label} 工资分布`;
  el("detailGini").textContent = fmt3.format(metric.gini);
  el("detailN").textContent = fmtInt.format(metric.n);
  el("detailMedian").textContent = fmtMoney.format(metric.median);
  el("detailTop10").textContent = fmtPct.format(metric.top10Share);
  el("selectedSource").textContent = `来源：${season.sourceIds.map(id => SOURCES[id]?.label || id).join("、")}`;
  el("coverageNote").textContent = metric.truncated
    ? `当前口径从该季 ${fmtInt.format(metric.fullN)} 条去重记录中保留最高薪 ${fmtInt.format(metric.n)} 人。固定人数口径主要用于降低名单尾部覆盖变化的影响。`
    : `该季共有 ${fmtInt.format(metric.fullN)} 条去重工资记录；当前口径使用全部记录。数据可能包含短期合同、买断或其他小额支付。`;
  el("topEarners").innerHTML = metric.records.slice(0, 10).map(d => `<li><span>${escapeHtml(d.player)}</span><span class="salary">${fmtMoneyFull.format(d.salary)}</span></li>`).join("");
  renderLorenz(metric);
}

function renderLorenz(metric) {
  const svg = el("lorenzChart");
  svg.innerHTML = "";
  if (!metric || !metric.n || !metric.total) return;
  const W = 720, H = 360;
  const margin = { top: 25, right: 25, bottom: 52, left: 58 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;
  const x = p => margin.left + p * innerW;
  const y = p => margin.top + (1 - p) * innerH;
  const total = metric.total;
  const lorenz = [[0, 0]];
  let cumulative = 0;
  metric.salariesAsc.forEach((salary, i) => {
    cumulative += salary;
    lorenz.push([(i + 1) / metric.n, cumulative / total]);
  });

  for (const p of [0, .25, .5, .75, 1]) {
    svg.appendChild(svgEl("line", { x1: x(0), y1: y(p), x2: x(1), y2: y(p), stroke: cssVar("--grid"), "stroke-width": 1 }));
    svg.appendChild(svgEl("line", { x1: x(p), y1: y(0), x2: x(p), y2: y(1), stroke: cssVar("--grid"), "stroke-width": 1 }));
    svg.appendChild(svgEl("text", { x: x(p), y: H - 20, "text-anchor": "middle", fill: cssVar("--muted"), "font-size": 11 }, `${p * 100}%`));
    svg.appendChild(svgEl("text", { x: 48, y: y(p) + 4, "text-anchor": "end", fill: cssVar("--muted"), "font-size": 11 }, `${p * 100}%`));
  }
  svg.appendChild(svgEl("path", { d: `M${x(0)},${y(0)} L${x(1)},${y(1)}`, fill: "none", stroke: cssVar("--muted-2"), "stroke-width": 1.8, "stroke-dasharray": "5 5" }));
  const curvePoints = lorenz.map(([px, py]) => [x(px), y(py)]);
  const area = `${pathFrom(curvePoints)} L${x(1)},${y(1)} Z`;
  svg.appendChild(svgEl("path", { d: area, fill: cssVar("--accent-2"), opacity: 0.10, stroke: "none" }));
  svg.appendChild(svgEl("path", { d: pathFrom(curvePoints), fill: "none", stroke: cssVar("--accent-2"), "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  svg.appendChild(svgEl("text", { x: W / 2, y: H - 3, "text-anchor": "middle", fill: cssVar("--muted"), "font-size": 12 }, "累计球员占比（由低薪到高薪）"));
  const yLabel = svgEl("text", { x: 14, y: H / 2, "text-anchor": "middle", fill: cssVar("--muted"), "font-size": 12, transform: `rotate(-90 14 ${H / 2})` }, "累计工资占比");
  svg.appendChild(yLabel);
}

function renderTable() {
  const rows = visibleSeasons();
  const mode = state.sampleMode;
  el("annualTableBody").innerHTML = rows.map(season => {
    const m = season[mode];
    const sourceId = season.sourceIds[0];
    const sourceLabel = SOURCES[sourceId]?.label || sourceId;
    const yoy = Number.isFinite(m.yoy) ? `${m.yoy >= 0 ? "+" : ""}${m.yoy.toFixed(3)}` : "—";
    const cls = [season.endYear === state.selectedEndYear ? "selected" : "", season.endYear === 2019 ? "source-break" : ""].filter(Boolean).join(" ");
    return `<tr class="${cls}" data-year="${season.endYear}">
      <td><strong>${season.label}</strong></td>
      <td><span class="source-tag">${sourceLabel}</span></td>
      <td>${fmtInt.format(m.n)}</td>
      <td><strong>${m.gini.toFixed(4)}</strong></td>
      <td class="${m.yoy > 0 ? "up" : m.yoy < 0 ? "down" : ""}">${yoy}</td>
      <td>${fmtMoneyFull.format(m.mean)}</td>
      <td>${fmtMoneyFull.format(m.median)}</td>
      <td>${fmtMoneyFull.format(m.max)}</td>
      <td>${fmtPct.format(m.top10Share)}</td>
    </tr>`;
  }).join("");
  el("annualTableBody").querySelectorAll("tr").forEach(row => row.addEventListener("click", () => selectSeason(Number(row.dataset.year))));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCurrentCsv() {
  const mode = state.sampleMode;
  const header = ["season", "season_end", "sample_mode", "n_players", "gini", "yoy_change", "total_salary_usd", "mean_salary_usd", "median_salary_usd", "min_salary_usd", "max_salary_usd", "top_10pct_share", "source"];
  const rows = visibleSeasons().map(season => {
    const m = season[mode];
    return [season.label, season.endYear, mode, m.n, m.gini, m.yoy, m.total, m.mean, m.median, m.min, m.max, m.top10Share, season.sourceIds.join("+")];
  });
  const csv = [header, ...rows].map(row => row.map(value => {
    const text = Number.isFinite(value) ? String(value) : String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(",")).join("\n");
  downloadBlob("\uFEFF" + csv, `nba_salary_gini_${mode}_${state.startEndYear - 1}-${state.endEndYear}.csv`, "text/csv;charset=utf-8");
}

function downloadTrendSvg() {
  const sourceSvg = el("trendChart").cloneNode(true);
  sourceSvg.setAttribute("xmlns", svgNS);
  sourceSvg.setAttribute("width", "1120");
  sourceSvg.setAttribute("height", "500");
  const background = svgEl("rect", { x: 0, y: 0, width: 1120, height: 500, fill: cssVar("--surface-solid") });
  sourceSvg.insertBefore(background, sourceSvg.firstChild);
  const serializer = new XMLSerializer();
  downloadBlob(`<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(sourceSvg)}`, `nba_salary_gini_trend_${state.sampleMode}.svg`, "image/svg+xml;charset=utf-8");
}

async function handleLocalFiles(files) {
  if (!files.length) return;
  const records = [];
  for (const file of files) {
    const text = await file.text();
    const rows = parseCSV(text);
    records.push(...standardizeRows(rows, "uploaded"));
  }
  const clean = dedupe(records);
  if (!clean.length) {
    setStatus("所选 CSV 中未识别到有效的 player / salary / season 列。", "error", true);
    return;
  }
  SOURCES.uploaded = { id: "uploaded", label: "本地上传", range: "自定义", url: "", page: "" };
  state.records = clean;
  state.seasons = buildSeasonData(clean);
  state.startEndYear = Math.min(...state.seasons.map(d => d.endYear));
  state.endEndYear = Math.max(...state.seasons.map(d => d.endYear));
  state.selectedEndYear = state.endEndYear;
  state.include2026 = state.endEndYear >= 2026;
  state.sourceMeta = { uploaded: { fromCache: false } };
  finalizeLoad(`已从本地文件读取 ${fmtInt.format(clean.length)} 条去重记录。`, "ready");
}

function bindEvents() {
  el("sampleMode").addEventListener("change", event => { state.sampleMode = event.target.value; renderAll(); });
  el("smoothWindow").addEventListener("change", event => { state.smoothWindow = Number(event.target.value); renderTrend(); });
  el("startSeason").addEventListener("change", event => {
    state.startEndYear = Number(event.target.value);
    if (state.startEndYear > state.endEndYear) { state.endEndYear = state.startEndYear; el("endSeason").value = String(state.endEndYear); }
    if (state.selectedEndYear < state.startEndYear) state.selectedEndYear = state.startEndYear;
    renderAll();
  });
  el("endSeason").addEventListener("change", event => {
    state.endEndYear = Number(event.target.value);
    if (state.endEndYear < state.startEndYear) { state.startEndYear = state.endEndYear; el("startSeason").value = String(state.startEndYear); }
    if (state.selectedEndYear > state.endEndYear) state.selectedEndYear = state.endEndYear;
    renderAll();
  });
  el("showMilestones").addEventListener("change", event => { state.showMilestones = event.target.checked; renderTrend(); });
  el("include2026").addEventListener("change", event => {
    state.include2026 = event.target.checked;
    const previousEnd = state.endEndYear;
    rebuildCombinedRecords();
    populateSeasonSelectors();
    state.endEndYear = state.include2026 && state.seasons.some(d => d.endYear === 2026) ? 2026 : Math.min(previousEnd, 2025);
    state.selectedEndYear = state.endEndYear;
    syncControls();
    renderAll();
    if (state.include2026 && !state.raw.supplement) setStatus("2025–26 补充源读取失败，未加入该数据点。", "warning", true);
  });
  el("downloadCsv").addEventListener("click", downloadCurrentCsv);
  el("downloadSvg").addEventListener("click", downloadTrendSvg);
  el("refreshData").addEventListener("click", () => loadData(true));
  el("fileInput").addEventListener("change", event => handleLocalFiles([...event.target.files]));
  el("themeButton").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("nba-gini-theme", next); } catch (_) {}
    renderTrend();
    const selected = state.seasons.find(d => d.endYear === state.selectedEndYear) || visibleSeasons().at(-1);
    if (selected) renderLorenz(selected[state.sampleMode]);
  });
  window.addEventListener("resize", hideTrendTooltip);
}

function initTheme() {
  let theme = "light";
  try { theme = localStorage.getItem("nba-gini-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch (_) {}
  document.documentElement.dataset.theme = theme;
}

initTheme();
bindEvents();
loadData(false);

"use strict";

(() => {
  const story = {
    data: null,
    contracts: [],
    performance: [],
    contractYear: 2026,
    performanceYear: 2025,
    compareYear: 2000,
    performanceSample: "top300",
    performanceMetric: "share0",
  };

  const $ = id => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const pct1 = new Intl.NumberFormat("zh-CN", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const num2 = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
  const moneyFull = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const metricConfig = {
    share0: {
      label: "BPM ≥ 0 的轮换球员占比",
      note: "固定人数后，比例上升意味着当季轮换样本中达到联盟平均以上影响力的球员更多。",
      value: metric => metric.thresholds?.["0"]?.share,
      format: value => pct1.format(value),
      axis: value => `${Math.round(value * 100)}%`,
      pad: 0.035,
    },
    median: {
      label: "固定轮换样本的 BPM 中位数",
      note: "中位数右移比偏度更直接：它不依赖少数超级球星的极端值。",
      value: metric => metric.median,
      format: value => signed(value, 2),
      axis: value => value.toFixed(1),
      pad: 0.35,
    },
    p65: {
      label: "固定轮换样本的 BPM 65 分位数",
      note: "65 分位数近似观察联盟中上游轮换层，而不是只看前 5% 的明星尾部。",
      value: metric => metric.p65,
      format: value => signed(value, 2),
      axis: value => value.toFixed(1),
      pad: 0.35,
    },
    gap: {
      label: "明星—中坚差距：BPM P95 − P65",
      note: "数值下降才表示明星与中坚层的相对领先幅度收窄；上升则表示高端尾部更突出。",
      value: metric => metric.p95_p65_gap,
      format: value => num2.format(value),
      axis: value => value.toFixed(1),
      pad: 0.45,
    },
    skewness: {
      label: "BPM 分布偏度",
      note: "正偏度只表示高 BPM 一侧尾巴更长，不能单独推出更多球员高于平均。",
      value: metric => metric.skewness,
      format: value => signed(value, 2),
      axis: value => value.toFixed(1),
      pad: 0.25,
    },
  };

  function node(name, attrs = {}, text = null) {
    const element = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== null) element.textContent = text;
    return element;
  }

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function path(points) {
    return points.map((point, index) => `${index ? "L" : "M"}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(" ");
  }

  function signed(value, digits = 3) {
    if (!Number.isFinite(value)) return "—";
    return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
  }

  function average(rows, getter) {
    const values = rows.map(getter).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;
  }

  function centered(values, window = 5) {
    const half = Math.floor(window / 2);
    return values.map((_, index) => {
      const slice = values.slice(Math.max(0, index - half), Math.min(values.length, index + half + 1)).filter(Number.isFinite);
      return slice.length >= 2 ? slice.reduce((sum, value) => sum + value, 0) / slice.length : NaN;
    });
  }

  function safe(value, fallback = null) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function normalizeContract(row) {
    const maximum = safe(row.maximum_10_yos, safe(row.max_salary));
    const rookie = safe(row.no1_salary_120, safe(row.first_pick_salary));
    const minimum = safe(row.minimum_0_yos);
    return {
      ...row,
      end_year: Number(row.end_year),
      maximum_10_yos: maximum,
      no1_salary_120: rookie,
      minimum_0_yos: minimum,
      no1_to_maximum: safe(row.no1_to_maximum, rookie && maximum ? rookie / maximum : null),
      minimum_to_maximum: safe(row.minimum_to_maximum, safe(row.minimum_to_max, minimum && maximum ? minimum / maximum : null)),
      maximum_to_no1: safe(row.maximum_to_no1, safe(row.max_to_first_pick, rookie && maximum ? maximum / rookie : null)),
      maximum_to_minimum: safe(row.maximum_to_minimum, safe(row.max_to_minimum, minimum && maximum ? maximum / minimum : null)),
    };
  }

  function setStoryStatus(message, stateName = "ready") {
    const box = $("storyStatus");
    if (!box) return;
    box.dataset.state = stateName;
    const text = box.querySelector("span:last-child");
    if (text) text.textContent = message;
  }

  async function loadStoryData() {
    try {
      const response = await fetch("./data/story-data.json?v=20260903-2", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      story.data = await response.json();
      story.contracts = (story.data.value_contracts || []).map(normalizeContract).filter(row => Number.isFinite(row.end_year));
      story.performance = (story.data.performance || []).filter(row => row.top240 && row.top300);
      if (!story.contracts.length || !story.performance.length) throw new Error("生成数据为空");
      story.contractYear = story.contracts.at(-1).end_year;
      story.performanceYear = story.performance.at(-1).end_year;
      story.compareYear = story.performance.find(row => row.end_year === 2000)?.end_year || story.performance[0].end_year;
      populateStoryControls();
      renderStory();
      const generated = story.data.generated_at ? new Date(story.data.generated_at) : null;
      $("dataTimestamp").textContent = generated && !Number.isNaN(generated.valueOf())
        ? `数据生成：${generated.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" })}`
        : "数据生成：仓库内可复算脚本";
      setStoryStatus(`合同序列 ${story.contracts.length} 个赛季；BPM 分布 ${story.performance.length} 个赛季。`, "ready");
    } catch (error) {
      console.error(error);
      setStoryStatus("合同或 BPM 数据载入失败；工资基尼部分仍可独立使用。", "error");
      ["contractChart", "performanceTrendChart", "performanceHeatmap", "performanceHistogram", "skewnessTrendChart"].forEach(id => {
        const svg = $(id);
        if (svg) svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="var(--muted)">数据载入失败</text>`;
      });
    }
  }

  function populateStoryControls() {
    const contractOptions = story.contracts.map(row => `<option value="${row.end_year}">${row.season}</option>`).join("");
    $("contractSeason").innerHTML = contractOptions;
    $("contractSeason").value = String(story.contractYear);

    const performanceOptions = story.performance.map(row => `<option value="${row.end_year}">${row.season}</option>`).join("");
    $("performanceSeason").innerHTML = performanceOptions;
    $("performanceCompare").innerHTML = performanceOptions;
    $("performanceSeason").value = String(story.performanceYear);
    $("performanceCompare").value = String(story.compareYear);
  }

  function renderStory() {
    renderContracts();
    renderPerformance();
    renderConclusion();
  }

  function renderContracts() {
    renderContractKpis();
    renderContractChart();
    renderContractDetail();
  }

  function renderContractKpis() {
    const latest = story.contracts.at(-1);
    if (!latest) return;
    $("contractRookieRatio").textContent = pct1.format(latest.no1_to_maximum);
    $("contractRookieNote").textContent = `${latest.season}${latest.first_pick ? ` · ${latest.first_pick}` : ""}`;
    $("contractRookieMultiple").textContent = `${latest.maximum_to_no1.toFixed(1)}×`;
    $("contractMinimumRatio").textContent = pct1.format(latest.minimum_to_maximum);
    $("contractMinimumNote").textContent = `${latest.season} · 零年资完整赛季底薪`;
    $("contractMinimumMultiple").textContent = `${latest.maximum_to_minimum.toFixed(1)}×`;
  }

  function contractEvent(year) {
    const labels = {
      2000: "1999 CBA",
      2012: "2011 停摆",
      2017: "媒体合同 / 帽跳升",
      2018: "2017 CBA",
      2024: "2023 CBA",
      2026: "新媒体协议生效",
    };
    return labels[year] || "";
  }

  function showTooltip(tooltip, event, htmlText) {
    const wrap = tooltip.parentElement.getBoundingClientRect();
    const target = event.target.getBoundingClientRect();
    tooltip.innerHTML = htmlText;
    tooltip.style.left = `${Math.min(Math.max(target.left + target.width / 2 - wrap.left, 115), Math.max(115, wrap.width - 115))}px`;
    tooltip.style.top = `${Math.max(target.top - wrap.top, 88)}px`;
    tooltip.style.opacity = "1";
  }

  function hideTooltip(tooltip) {
    tooltip.style.opacity = "0";
  }

  function renderContractChart() {
    const svg = $("contractChart");
    const tooltip = $("contractTooltip");
    svg.innerHTML = "";
    const rows = story.contracts.filter(row => Number.isFinite(row.no1_to_maximum) && Number.isFinite(row.minimum_to_maximum));
    if (!rows.length) return;

    const W = 1120, H = 520;
    const left = 72, right = 28, top = 48, panelH = 160, gap = 88, bottom = 60;
    const innerW = W - left - right;
    const x = year => left + (year - rows[0].end_year) * innerW / Math.max(1, rows.at(-1).end_year - rows[0].end_year);
    const panels = [
      { key: "no1_to_maximum", y0: top, color: css("--story-gold"), title: "状元标准首年工资 / 10+ 年资顶薪", format: value => pct1.format(value) },
      { key: "minimum_to_maximum", y0: top + panelH + gap, color: css("--story-teal"), title: "零年资正式底薪 / 10+ 年资顶薪", format: value => pct1.format(value) },
    ];

    svg.appendChild(node("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent" }));

    const selectedX = x(story.contractYear);
    svg.appendChild(node("rect", { x: selectedX - 11, y: top - 10, width: 22, height: panelH * 2 + gap + 20, rx: 8, fill: css("--story-gold"), opacity: .08 }));

    panels.forEach(panel => {
      const values = rows.map(row => row[panel.key]);
      let min = Math.min(...values), max = Math.max(...values);
      const pad = Math.max((max - min) * .22, panel.key === "minimum_to_maximum" ? .0025 : .025);
      min = Math.max(0, min - pad);
      max += pad;
      const y = value => panel.y0 + (max - value) * panelH / Math.max(.0001, max - min);

      svg.appendChild(node("text", { x: left, y: panel.y0 - 17, fill: css("--text"), "font-size": 13, "font-weight": 760 }, panel.title));
      for (let i = 0; i <= 4; i++) {
        const value = min + (max - min) * i / 4;
        const yy = y(value);
        svg.appendChild(node("line", { x1: left, y1: yy, x2: W - right, y2: yy, stroke: css("--grid"), "stroke-width": 1 }));
        svg.appendChild(node("text", { x: left - 10, y: yy + 4, "text-anchor": "end", fill: css("--muted"), "font-size": 11 }, panel.format(value)));
      }

      const points = rows.map(row => [x(row.end_year), y(row[panel.key])]);
      svg.appendChild(node("path", { d: path(points), fill: "none", stroke: panel.color, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));

      rows.forEach(row => {
        const selected = row.end_year === story.contractYear;
        const circle = node("circle", {
          cx: x(row.end_year), cy: y(row[panel.key]), r: selected ? 6.8 : 4,
          fill: selected ? css("--surface-solid") : panel.color,
          stroke: panel.color, "stroke-width": selected ? 3 : 1.5, tabindex: 0,
        });
        circle.style.cursor = "pointer";
        const tooltipHtml = `
          <strong>${row.season}${contractEvent(row.end_year) ? ` · ${contractEvent(row.end_year)}` : ""}</strong>
          <div class="tooltip-row"><span>状元标准工资</span><span>${moneyFull.format(row.no1_salary_120)}</span></div>
          <div class="tooltip-row"><span>10+ 年资顶薪</span><span>${moneyFull.format(row.maximum_10_yos)}</span></div>
          <div class="tooltip-row"><span>状元 / 顶薪</span><span>${pct1.format(row.no1_to_maximum)}</span></div>
          <div class="tooltip-row"><span>底薪 / 顶薪</span><span>${pct1.format(row.minimum_to_maximum)}</span></div>`;
        circle.addEventListener("mouseenter", event => showTooltip(tooltip, event, tooltipHtml));
        circle.addEventListener("mousemove", event => showTooltip(tooltip, event, tooltipHtml));
        circle.addEventListener("mouseleave", () => hideTooltip(tooltip));
        circle.addEventListener("click", () => {
          story.contractYear = row.end_year;
          $("contractSeason").value = String(row.end_year);
          renderContractChart();
          renderContractDetail();
        });
        svg.appendChild(circle);
      });
    });

    const tickEvery = rows.length > 24 ? 3 : 2;
    rows.forEach((row, index) => {
      if (index % tickEvery !== 0 && index !== rows.length - 1) return;
      const xx = x(row.end_year);
      svg.appendChild(node("text", { x: xx, y: H - bottom + 20, "text-anchor": "end", fill: css("--muted"), "font-size": 10.5, transform: `rotate(-40 ${xx} ${H - bottom + 20})` }, row.season));
    });

    [2000, 2012, 2017, 2018, 2024, 2026].forEach(year => {
      if (year < rows[0].end_year || year > rows.at(-1).end_year) return;
      const xx = x(year);
      svg.appendChild(node("line", { x1: xx, y1: top - 7, x2: xx, y2: top + panelH * 2 + gap + 7, stroke: css("--muted-2"), "stroke-width": 1, "stroke-dasharray": "3 5", opacity: .55 }));
    });

    const early = rows.filter(row => row.end_year >= 2000 && row.end_year <= 2005);
    const recent = rows.filter(row => row.end_year >= 2019);
    const rookieEarly = average(early, row => row.no1_to_maximum);
    const rookieRecent = average(recent, row => row.no1_to_maximum);
    const minEarly = average(early, row => row.minimum_to_maximum);
    const minRecent = average(recent, row => row.minimum_to_maximum);
    $("contractNarrative").innerHTML = `
      状元标准工资占顶薪的平均比例由早期的 <strong>${pct1.format(rookieEarly)}</strong> 变为近年的 <strong>${pct1.format(rookieRecent)}</strong>；
      零年资底薪则由 <strong>${pct1.format(minEarly)}</strong> 变为 <strong>${pct1.format(minRecent)}</strong>。
      这不是“受控合同越来越便宜”的单调故事：相对折扣有所波动，但顶薪与底薪之间仍保持约数十倍的结构性价差。`;
  }

  function renderContractDetail() {
    const row = story.contracts.find(item => item.end_year === story.contractYear) || story.contracts.at(-1);
    if (!row) return;
    $("contractDetailTitle").textContent = `${row.season} 合同成本阶梯`;
    const levels = [
      { cls: "maximum", label: "10+ 年资顶薪额度", salary: row.maximum_10_yos, ratio: 1 },
      { cls: "rookie", label: `状元标准首年工资${row.first_pick ? ` · ${row.first_pick}` : ""}`, salary: row.no1_salary_120, ratio: row.no1_to_maximum },
      { cls: "minimum", label: "零年资正式底薪", salary: row.minimum_0_yos, ratio: row.minimum_to_maximum },
    ];
    $("contractLadder").innerHTML = levels.map(level => `
      <div class="ladder-row ${level.cls}">
        <span class="ladder-label">${level.label}</span>
        <span class="ladder-track"><span class="ladder-fill" style="width:${Math.max(level.ratio * 100, 1.6)}%"></span></span>
        <span class="ladder-value">${moneyFull.format(level.salary)} · ${pct1.format(level.ratio)}</span>
      </div>`).join("");
    $("contractInterpretation").textContent = `${row.season}，一份 10+ 年资顶薪额度约等于 ${row.maximum_to_no1.toFixed(1)} 份状元标准首年工资，或 ${row.maximum_to_minimum.toFixed(1)} 份零年资正式底薪。红利的实际大小仍取决于球员表现，而不是合同标签本身。`;
  }

  function sampleMetric(row) {
    return row[story.performanceSample];
  }

  function performanceRows() {
    return story.performance.filter(row => row.end_year >= 1999 && row.end_year <= 2025);
  }

  function renderPerformance() {
    renderPerformanceKpis();
    renderPerformanceTrend();
    renderPerformanceHeatmap();
    renderSkewnessTrend();
    renderPerformanceHistogram();
    renderPerformanceNarrative();
  }

  function eraRows(start, end) {
    return performanceRows().filter(row => row.end_year >= start && row.end_year <= end);
  }

  function renderPerformanceKpis() {
    const early = eraRows(2000, 2005);
    const recent = eraRows(2019, 2025);
    const positive = metric => metric.thresholds?.["0"]?.share;
    const earlyPositive = average(early, row => positive(sampleMetric(row)));
    const recentPositive = average(recent, row => positive(sampleMetric(row)));
    const medianChange = average(recent, row => sampleMetric(row).median) - average(early, row => sampleMetric(row).median);
    const gapChange = average(recent, row => sampleMetric(row).p95_p65_gap) - average(early, row => sampleMetric(row).p95_p65_gap);
    $("perfEarlyPositive").textContent = pct1.format(earlyPositive);
    $("perfRecentPositive").textContent = pct1.format(recentPositive);
    $("perfMedianChange").textContent = signed(medianChange, 2);
    $("perfMedianChange").className = medianChange > 0 ? "up" : medianChange < 0 ? "down" : "";
    $("perfGapChange").textContent = signed(gapChange, 2);
    $("perfGapChange").className = gapChange < 0 ? "down" : gapChange > 0 ? "up" : "";
  }

  function renderPerformanceTrend() {
    const svg = $("performanceTrendChart");
    const tooltip = $("performanceTooltip");
    svg.innerHTML = "";
    const rows = performanceRows();
    const config = metricConfig[story.performanceMetric];
    const values = rows.map(row => config.value(sampleMetric(row)));
    const smooth = centered(values, 5);
    $("performanceTrendTitle").textContent = config.label;
    $("performanceTrendNote").textContent = `${story.performanceSample === "top300" ? "每季上场时间前 300 人" : "每季上场时间前 240 人"}。${config.note}`;

    const W = 1120, H = 430, margin = { top: 38, right: 28, bottom: 70, left: 72 };
    const innerW = W - margin.left - margin.right, innerH = H - margin.top - margin.bottom;
    let min = Math.min(...values, ...smooth.filter(Number.isFinite));
    let max = Math.max(...values, ...smooth.filter(Number.isFinite));
    min -= config.pad; max += config.pad;
    if (story.performanceMetric === "share0") { min = Math.max(0, min); max = Math.min(1, max); }
    const x = index => margin.left + index * innerW / Math.max(1, rows.length - 1);
    const y = value => margin.top + (max - value) * innerH / Math.max(.0001, max - min);

    svg.appendChild(node("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent" }));
    for (let i = 0; i <= 5; i++) {
      const value = min + (max - min) * i / 5;
      const yy = y(value);
      svg.appendChild(node("line", { x1: margin.left, y1: yy, x2: W - margin.right, y2: yy, stroke: css("--grid") }));
      svg.appendChild(node("text", { x: margin.left - 10, y: yy + 4, "text-anchor": "end", fill: css("--muted"), "font-size": 11 }, config.axis(value)));
    }
    if (min < 0 && max > 0) svg.appendChild(node("line", { x1: margin.left, y1: y(0), x2: W - margin.right, y2: y(0), stroke: css("--muted-2"), "stroke-dasharray": "4 4", "stroke-width": 1.4 }));

    const selectedIndex = rows.findIndex(row => row.end_year === story.performanceYear);
    if (selectedIndex >= 0) svg.appendChild(node("line", { x1: x(selectedIndex), y1: margin.top, x2: x(selectedIndex), y2: H - margin.bottom, stroke: css("--story-gold"), "stroke-dasharray": "3 4", opacity: .7 }));

    const smoothPoints = smooth.map((value, index) => Number.isFinite(value) ? [x(index), y(value)] : null).filter(Boolean);
    svg.appendChild(node("path", { d: path(smoothPoints), fill: "none", stroke: css("--accent"), "stroke-width": 3.2, opacity: .75 }));
    const points = values.map((value, index) => [x(index), y(value)]);
    svg.appendChild(node("path", { d: path(points), fill: "none", stroke: css("--story-teal"), "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));

    rows.forEach((row, index) => {
      const value = values[index];
      const selected = row.end_year === story.performanceYear;
      const circle = node("circle", { cx: x(index), cy: y(value), r: selected ? 6.5 : 4, fill: selected ? css("--surface-solid") : css("--story-teal"), stroke: css("--story-teal"), "stroke-width": selected ? 3 : 1.5, tabindex: 0 });
      circle.style.cursor = "pointer";
      const metric = sampleMetric(row);
      const htmlText = `<strong>${row.season}</strong><div class="tooltip-row"><span>${config.label}</span><span>${config.format(value)}</span></div><div class="tooltip-row"><span>BPM 中位数</span><span>${signed(metric.median, 2)}</span></div><div class="tooltip-row"><span>BPM ≥ 0</span><span>${pct1.format(metric.thresholds["0"].share)}</span></div><div class="tooltip-row"><span>偏度</span><span>${signed(metric.skewness, 2)}</span></div>`;
      circle.addEventListener("mouseenter", event => showTooltip(tooltip, event, htmlText));
      circle.addEventListener("mousemove", event => showTooltip(tooltip, event, htmlText));
      circle.addEventListener("mouseleave", () => hideTooltip(tooltip));
      circle.addEventListener("click", () => {
        story.performanceYear = row.end_year;
        $("performanceSeason").value = String(row.end_year);
        renderPerformance();
      });
      svg.appendChild(circle);
    });

    rows.forEach((row, index) => {
      if (index % 3 !== 0 && index !== rows.length - 1) return;
      const xx = x(index);
      svg.appendChild(node("text", { x: xx, y: H - margin.bottom + 21, "text-anchor": "end", fill: css("--muted"), "font-size": 10.5, transform: `rotate(-40 ${xx} ${H - margin.bottom + 21})` }, row.season));
    });
  }

  function histogram(values, min = -8, max = 12, step = 1) {
    const count = Math.round((max - min) / step);
    const bins = Array.from({ length: count }, (_, index) => ({ start: min + index * step, end: min + (index + 1) * step, count: 0 }));
    values.forEach(raw => {
      const value = Math.min(max - Number.EPSILON, Math.max(min, raw));
      const index = Math.min(count - 1, Math.max(0, Math.floor((value - min) / step)));
      bins[index].count += 1;
    });
    return bins;
  }

  function bpmValues(row) {
    const limit = story.performanceSample === "top240" ? 240 : 300;
    return row.players_by_minutes.slice(0, limit).map(player => Number(player.bpm)).filter(Number.isFinite);
  }

  function renderPerformanceHeatmap() {
    const svg = $("performanceHeatmap");
    svg.innerHTML = "";
    const rows = performanceRows();
    const W = 760, H = 760, margin = { top: 38, right: 24, bottom: 50, left: 88 };
    const innerW = W - margin.left - margin.right, innerH = H - margin.top - margin.bottom;
    const minBpm = -8, maxBpm = 12, step = 1, nBins = (maxBpm - minBpm) / step;
    const rowH = innerH / rows.length, cellW = innerW / nBins;
    const histograms = rows.map(row => histogram(bpmValues(row), minBpm, maxBpm, step));
    const globalMax = Math.max(...histograms.flatMap(bins => bins.map(bin => bin.count)));

    svg.appendChild(node("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent" }));
    histograms.forEach((bins, rowIndex) => {
      bins.forEach((bin, binIndex) => {
        const opacity = .06 + .9 * Math.pow(bin.count / Math.max(1, globalMax), .72);
        const rect = node("rect", {
          x: margin.left + binIndex * cellW,
          y: margin.top + rowIndex * rowH,
          width: cellW + .3,
          height: Math.max(1, rowH - .6),
          fill: css("--story-teal"), opacity,
        });
        rect.appendChild(node("title", {}, `${rows[rowIndex].season} · BPM ${bin.start} 至 ${bin.end}：${bin.count} 人`));
        rect.style.cursor = "pointer";
        rect.addEventListener("click", () => {
          story.performanceYear = rows[rowIndex].end_year;
          $("performanceSeason").value = String(story.performanceYear);
          renderPerformance();
        });
        svg.appendChild(rect);
      });
      if (rowIndex % 2 === 0 || rowIndex === rows.length - 1) {
        svg.appendChild(node("text", { x: margin.left - 9, y: margin.top + rowIndex * rowH + rowH * .7, "text-anchor": "end", fill: rows[rowIndex].end_year === story.performanceYear ? css("--story-gold") : css("--muted"), "font-size": 10.5, "font-weight": rows[rowIndex].end_year === story.performanceYear ? 800 : 500 }, rows[rowIndex].season));
      }
    });

    const medianPoints = rows.map((row, rowIndex) => {
      const value = Math.max(minBpm, Math.min(maxBpm, sampleMetric(row).median));
      return [margin.left + (value - minBpm) / (maxBpm - minBpm) * innerW, margin.top + rowIndex * rowH + rowH / 2];
    });
    if (medianPoints.length > 1) {
      svg.appendChild(node("path", { d: path(medianPoints), fill: "none", stroke: css("--surface-solid"), "stroke-width": 5.2, opacity: .78, "stroke-linecap": "round", "stroke-linejoin": "round" }));
      svg.appendChild(node("path", { d: path(medianPoints), fill: "none", stroke: css("--story-gold"), "stroke-width": 2.4, "stroke-dasharray": "5 4", "stroke-linecap": "round", "stroke-linejoin": "round" }));
      medianPoints.forEach((point, index) => {
        const selected = rows[index].end_year === story.performanceYear;
        const dot = node("circle", { cx: point[0], cy: point[1], r: selected ? 4.2 : 2.3, fill: css("--story-gold"), stroke: css("--surface-solid"), "stroke-width": selected ? 1.6 : .8 });
        dot.appendChild(node("title", {}, `${rows[index].season} · BPM 中位数 ${signed(sampleMetric(rows[index]).median, 2)}`));
        svg.appendChild(dot);
      });
      svg.appendChild(node("line", { x1: margin.left + 8, y1: 17, x2: margin.left + 38, y2: 17, stroke: css("--story-gold"), "stroke-width": 2.4, "stroke-dasharray": "5 4" }));
      svg.appendChild(node("text", { x: margin.left + 45, y: 21, fill: css("--muted"), "font-size": 10.5, "font-weight": 720 }, "每季 BPM 中位数"));
    }

    const zeroX = margin.left + (0 - minBpm) / (maxBpm - minBpm) * innerW;
    svg.appendChild(node("line", { x1: zeroX, y1: margin.top - 7, x2: zeroX, y2: H - margin.bottom, stroke: css("--story-gold"), "stroke-width": 1.8, "stroke-dasharray": "4 4" }));
    svg.appendChild(node("text", { x: zeroX + 5, y: margin.top - 12, fill: css("--story-gold"), "font-size": 10.5, "font-weight": 760 }, "BPM = 0"));
    for (let value = minBpm; value <= maxBpm; value += 2) {
      const xx = margin.left + (value - minBpm) / (maxBpm - minBpm) * innerW;
      svg.appendChild(node("text", { x: xx, y: H - 22, "text-anchor": "middle", fill: css("--muted"), "font-size": 10.5 }, String(value)));
    }
    svg.appendChild(node("text", { x: margin.left + innerW / 2, y: H - 3, "text-anchor": "middle", fill: css("--muted"), "font-size": 11 }, "BPM 分箱（极端值截在 −8 与 +12）"));
  }

  function renderSkewnessTrend() {
    const svg = $("skewnessTrendChart");
    const tooltip = $("skewnessTooltip");
    if (!svg) return;
    svg.innerHTML = "";
    const rows = performanceRows();
    const values = rows.map(row => sampleMetric(row).skewness);
    const smooth = centered(values, 5);
    const W = 1120, H = 400, margin = { top: 34, right: 28, bottom: 66, left: 72 };
    const innerW = W - margin.left - margin.right, innerH = H - margin.top - margin.bottom;
    let min = Math.min(0, ...values, ...smooth.filter(Number.isFinite)) - .18;
    let max = Math.max(0, ...values, ...smooth.filter(Number.isFinite)) + .18;
    if (max - min < .8) { const mid = (max + min) / 2; min = mid - .4; max = mid + .4; }
    const x = index => margin.left + index * innerW / Math.max(1, rows.length - 1);
    const y = value => margin.top + (max - value) * innerH / Math.max(.0001, max - min);

    svg.appendChild(node("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent" }));
    for (let i = 0; i <= 5; i++) {
      const value = min + (max - min) * i / 5, yy = y(value);
      svg.appendChild(node("line", { x1: margin.left, y1: yy, x2: W - margin.right, y2: yy, stroke: css("--grid") }));
      svg.appendChild(node("text", { x: margin.left - 10, y: yy + 4, "text-anchor": "end", fill: css("--muted"), "font-size": 11 }, value.toFixed(1)));
    }
    if (min <= 0 && max >= 0) {
      svg.appendChild(node("line", { x1: margin.left, y1: y(0), x2: W - margin.right, y2: y(0), stroke: css("--muted-2"), "stroke-width": 1.7, "stroke-dasharray": "5 5" }));
      svg.appendChild(node("text", { x: W - margin.right, y: y(0) - 7, "text-anchor": "end", fill: css("--muted"), "font-size": 10.5 }, "偏度 = 0（对称）"));
    }
    const selectedIndex = rows.findIndex(row => row.end_year === story.performanceYear);
    if (selectedIndex >= 0) svg.appendChild(node("line", { x1: x(selectedIndex), y1: margin.top, x2: x(selectedIndex), y2: H - margin.bottom, stroke: css("--story-gold"), "stroke-dasharray": "3 4", opacity: .65 }));
    const smoothPoints = smooth.map((value, index) => Number.isFinite(value) ? [x(index), y(value)] : null).filter(Boolean);
    if (smoothPoints.length > 1) svg.appendChild(node("path", { d: path(smoothPoints), fill: "none", stroke: css("--accent"), "stroke-width": 3.2, opacity: .76, "stroke-linecap": "round" }));
    const points = values.map((value, index) => [x(index), y(value)]);
    svg.appendChild(node("path", { d: path(points), fill: "none", stroke: css("--story-purple"), "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    rows.forEach((row, index) => {
      const value = values[index], selected = row.end_year === story.performanceYear, metric = sampleMetric(row);
      const circle = node("circle", { cx: x(index), cy: y(value), r: selected ? 6.2 : 4, fill: selected ? css("--surface-solid") : css("--story-purple"), stroke: css("--story-purple"), "stroke-width": selected ? 3 : 1.4, tabindex: 0 });
      circle.style.cursor = "pointer";
      const htmlText = `<strong>${row.season}</strong><div class="tooltip-row"><span>BPM 偏度</span><span>${signed(value, 2)}</span></div><div class="tooltip-row"><span>BPM 中位数</span><span>${signed(metric.median, 2)}</span></div><div class="tooltip-row"><span>BPM ≥ 0</span><span>${pct1.format(metric.thresholds["0"].share)}</span></div>`;
      circle.addEventListener("mouseenter", event => showTooltip(tooltip, event, htmlText));
      circle.addEventListener("mousemove", event => showTooltip(tooltip, event, htmlText));
      circle.addEventListener("mouseleave", () => hideTooltip(tooltip));
      circle.addEventListener("click", () => { story.performanceYear = row.end_year; $("performanceSeason").value = String(row.end_year); renderPerformance(); });
      svg.appendChild(circle);
    });
    rows.forEach((row, index) => {
      if (index % 3 !== 0 && index !== rows.length - 1) return;
      const xx = x(index);
      svg.appendChild(node("text", { x: xx, y: H - margin.bottom + 24, "text-anchor": "end", fill: css("--muted"), "font-size": 10.5, transform: `rotate(-42 ${xx} ${H - margin.bottom + 24})` }, row.season));
    });
    const early = eraRows(2000, 2005), recent = eraRows(2019, 2025);
    const earlySkew = average(early, row => sampleMetric(row).skewness);
    const recentSkew = average(recent, row => sampleMetric(row).skewness);
    if ($("skewnessNarrative")) $("skewnessNarrative").innerHTML = `早期平均偏度为 <strong>${signed(earlySkew, 2)}</strong>，近年为 <strong>${signed(recentSkew, 2)}</strong>。偏度上升表示高 BPM 尾部变长；只有当中位数、P65 或正 BPM 占比同步上升时，才有证据支持轮换中部也在右移。`;
  }

  function renderPerformanceHistogram() {
    const svg = $("performanceHistogram");
    const tooltip = $("histogramTooltip");
    svg.innerHTML = "";
    const selected = story.performance.find(row => row.end_year === story.performanceYear) || story.performance.at(-1);
    const compare = story.performance.find(row => row.end_year === story.compareYear) || story.performance[0];
    if (!selected || !compare) return;

    const W = 760, H = 500, margin = { top: 62, right: 24, bottom: 55, left: 58 };
    const innerW = W - margin.left - margin.right, innerH = H - margin.top - margin.bottom;
    const minBpm = -8, maxBpm = 12, step = 1;
    const aBins = histogram(bpmValues(compare), minBpm, maxBpm, step);
    const bBins = histogram(bpmValues(selected), minBpm, maxBpm, step);
    const maxCount = Math.max(...aBins.map(bin => bin.count), ...bBins.map(bin => bin.count));
    const x = index => margin.left + index * innerW / aBins.length;
    const y = count => margin.top + (maxCount - count) * innerH / Math.max(1, maxCount);
    const groupW = innerW / aBins.length, barW = groupW * .38;

    svg.appendChild(node("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent" }));
    for (let i = 0; i <= 4; i++) {
      const count = maxCount * i / 4, yy = y(count);
      svg.appendChild(node("line", { x1: margin.left, y1: yy, x2: W - margin.right, y2: yy, stroke: css("--grid") }));
      svg.appendChild(node("text", { x: margin.left - 8, y: yy + 4, "text-anchor": "end", fill: css("--muted"), "font-size": 10.5 }, String(Math.round(count))));
    }

    aBins.forEach((bin, index) => {
      const series = [
        { count: bin.count, x: x(index) + groupW * .08, color: css("--muted-2"), season: compare.season },
        { count: bBins[index].count, x: x(index) + groupW * .50, color: css("--story-teal"), season: selected.season },
      ];
      series.forEach(item => {
        const rect = node("rect", { x: item.x, y: y(item.count), width: barW, height: H - margin.bottom - y(item.count), rx: 2, fill: item.color, opacity: .82 });
        const htmlText = `<strong>${item.season}</strong><div class="tooltip-row"><span>BPM 区间</span><span>${bin.start} 至 ${bin.end}</span></div><div class="tooltip-row"><span>球员数</span><span>${item.count}</span></div>`;
        rect.addEventListener("mouseenter", event => showTooltip(tooltip, event, htmlText));
        rect.addEventListener("mousemove", event => showTooltip(tooltip, event, htmlText));
        rect.addEventListener("mouseleave", () => hideTooltip(tooltip));
        svg.appendChild(rect);
      });
    });

    const zeroX = margin.left + (0 - minBpm) / (maxBpm - minBpm) * innerW;
    svg.appendChild(node("line", { x1: zeroX, y1: margin.top, x2: zeroX, y2: H - margin.bottom, stroke: css("--story-gold"), "stroke-width": 1.6, "stroke-dasharray": "4 4" }));
    for (let value = minBpm; value <= maxBpm; value += 2) {
      const xx = margin.left + (value - minBpm) / (maxBpm - minBpm) * innerW;
      svg.appendChild(node("text", { x: xx, y: H - 25, "text-anchor": "middle", fill: css("--muted"), "font-size": 10.5 }, String(value)));
    }
    svg.appendChild(node("rect", { x: margin.left, y: 18, width: 13, height: 13, rx: 2, fill: css("--muted-2") }));
    svg.appendChild(node("text", { x: margin.left + 20, y: 29, fill: css("--muted"), "font-size": 11 }, compare.season));
    svg.appendChild(node("rect", { x: margin.left + 105, y: 18, width: 13, height: 13, rx: 2, fill: css("--story-teal") }));
    svg.appendChild(node("text", { x: margin.left + 125, y: 29, fill: css("--muted"), "font-size": 11 }, selected.season));

    $("histogramTitle").textContent = `${selected.season} vs. ${compare.season} BPM 分布`;
    $("histogramSubtitle").textContent = `${story.performanceSample === "top300" ? "上场时间前 300 人" : "上场时间前 240 人"}；相同人数、相同分箱。`;
    const selectedMetric = sampleMetric(selected), compareMetric = sampleMetric(compare);
    $("histogramStats").innerHTML = [
      ["BPM 中位数", compareMetric.median, selectedMetric.median, value => signed(value, 2)],
      ["BPM ≥ 0 占比", compareMetric.thresholds["0"].share, selectedMetric.thresholds["0"].share, value => pct1.format(value)],
      ["BPM 65 分位", compareMetric.p65, selectedMetric.p65, value => signed(value, 2)],
      ["偏度", compareMetric.skewness, selectedMetric.skewness, value => signed(value, 2)],
    ].map(([label, a, b, formatter]) => `<div class="hist-stat"><span>${label}</span><strong>${compare.season} ${formatter(a)} → ${selected.season} ${formatter(b)}</strong></div>`).join("");
  }

  function renderPerformanceNarrative() {
    const early = eraRows(2000, 2005), recent = eraRows(2019, 2025);
    const get = (row, key) => sampleMetric(row)[key];
    const earlyPositive = average(early, row => sampleMetric(row).thresholds["0"].share);
    const recentPositive = average(recent, row => sampleMetric(row).thresholds["0"].share);
    const earlyMedian = average(early, row => get(row, "median"));
    const recentMedian = average(recent, row => get(row, "median"));
    const earlyP65 = average(early, row => get(row, "p65"));
    const recentP65 = average(recent, row => get(row, "p65"));
    const earlyGap = average(early, row => get(row, "p95_p65_gap"));
    const recentGap = average(recent, row => get(row, "p95_p65_gap"));
    const earlySkew = average(early, row => get(row, "skewness"));
    const recentSkew = average(recent, row => get(row, "skewness"));
    $("performanceNarrative").innerHTML = `
      在${story.performanceSample === "top300" ? "前 300 分钟样本" : "前 240 分钟样本"}中，BPM ≥ 0 的平均占比由 <strong>${pct1.format(earlyPositive)}</strong> 变为 <strong>${pct1.format(recentPositive)}</strong>，
      中位数由 <strong>${signed(earlyMedian, 2)}</strong> 变为 <strong>${signed(recentMedian, 2)}</strong>，65 分位由 <strong>${signed(earlyP65, 2)}</strong> 变为 <strong>${signed(recentP65, 2)}</strong>。
      但 P95−P65 差距由 <strong>${num2.format(earlyGap)}</strong> 变为 <strong>${num2.format(recentGap)}</strong>，偏度由 <strong>${signed(earlySkew, 2)}</strong> 变为 <strong>${signed(recentSkew, 2)}</strong>：中坚层有所右移，明星高端尾部并没有同步收窄。`;
  }

  function renderConclusion() {
    const contracts = story.contracts;
    const latestContract = contracts.at(-1);
    if (latestContract) $("conclusionContract").textContent = `${latestContract.season}：状元约为顶薪的 ${pct1.format(latestContract.no1_to_maximum)}，底薪约为 ${pct1.format(latestContract.minimum_to_maximum)}`;
    const early = eraRows(2000, 2005), recent = eraRows(2019, 2025);
    if (early.length && recent.length) {
      const earlyPositive = average(early, row => row.top300.thresholds["0"].share);
      const recentPositive = average(recent, row => row.top300.thresholds["0"].share);
      $("conclusionDepth").textContent = `前 300 分钟样本正 BPM 占比：${pct1.format(earlyPositive)} → ${pct1.format(recentPositive)}`;
    }
  }

  function bindStoryEvents() {
    $("contractSeason")?.addEventListener("change", event => {
      story.contractYear = Number(event.target.value);
      renderContractChart();
      renderContractDetail();
    });
    $("performanceSample")?.addEventListener("change", event => {
      story.performanceSample = event.target.value;
      renderPerformance();
      renderConclusion();
    });
    $("performanceMetric")?.addEventListener("change", event => {
      story.performanceMetric = event.target.value;
      renderPerformanceTrend();
    });
    $("performanceSeason")?.addEventListener("change", event => {
      story.performanceYear = Number(event.target.value);
      renderPerformance();
    });
    $("performanceCompare")?.addEventListener("change", event => {
      story.compareYear = Number(event.target.value);
      renderPerformanceHistogram();
    });
    $("themeButton")?.addEventListener("click", () => setTimeout(renderStory, 0));
  }

  bindStoryEvents();
  loadStoryData();
})();

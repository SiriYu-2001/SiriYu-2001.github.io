(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const context = { data: null };

  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const mean = (rows, key) => rows.length ? rows.reduce((sum, row) => sum + Number(row[key]), 0) / rows.length : NaN;
  const fmt0 = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
  const fmt1 = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function node(name, attrs = {}, text = null) {
    const element = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== null) element.textContent = text;
    return element;
  }

  function linePath(rows, x, y, accessor) {
    return rows.map((row, index) => `${index ? "L" : "M"}${x(row.end_year).toFixed(1)},${y(accessor(row)).toFixed(1)}`).join(" ");
  }

  function movingAverage(rows, key, windowSize = 5) {
    const radius = Math.floor(windowSize / 2);
    return rows.map((row, index) => {
      const slice = rows.slice(Math.max(0, index - radius), Math.min(rows.length, index + radius + 1));
      return { end_year: row.end_year, value: mean(slice, key) };
    });
  }

  function addGrid(svg, x1, x2, y, ticks, formatter) {
    ticks.forEach(value => {
      const yy = y(value);
      svg.appendChild(node("line", { x1, y1: yy, x2, y2: yy, stroke: css("--border"), "stroke-width": 1 }));
      svg.appendChild(node("text", { x: x1 - 12, y: yy + 4, "text-anchor": "end", fill: css("--muted"), "font-size": 11 }, formatter(value)));
    });
  }

  function showTooltip(tooltip, event, html) {
    const wrap = tooltip.parentElement.getBoundingClientRect();
    tooltip.innerHTML = html;
    tooltip.style.left = `${Math.min(event.clientX - wrap.left + 14, wrap.width - 250)}px`;
    tooltip.style.top = `${Math.max(8, event.clientY - wrap.top - 26)}px`;
    tooltip.classList.add("visible");
  }

  function hideTooltip(tooltip) {
    tooltip.classList.remove("visible");
  }

  function renderAvailability() {
    const rows = context.data.mvp_availability;
    const svg = $("availabilityChart");
    const tooltip = $("availabilityTooltip");
    if (!svg || !rows.length) return;
    svg.replaceChildren();

    const W = 1120;
    const margin = { left: 78, right: 34 };
    const x = year => margin.left + (year - 1999) / (2026 - 1999) * (W - margin.left - margin.right);
    const yGames = value => 238 - (value - 45) / (85 - 45) * 156;
    const yMinutes = value => 520 - (value - 1800) / (3400 - 1800) * 190;
    const shortened = rows.filter(row => row.schedule_games < 82);

    shortened.forEach(row => {
      svg.appendChild(node("rect", {
        x: x(row.end_year) - 15, y: 56, width: 30, height: 470,
        fill: css("--warning"), opacity: 0.10,
      }));
    });

    addGrid(svg, margin.left, W - margin.right, yGames, [50, 60, 70, 80], value => `${value} 场`);
    addGrid(svg, margin.left, W - margin.right, yMinutes, [2000, 2400, 2800, 3200], value => fmt0.format(value));
    svg.appendChild(node("text", { x: margin.left, y: 36, fill: css("--text"), "font-size": 15, "font-weight": 800 }, "A · 出场场次"));
    svg.appendChild(node("text", { x: margin.left, y: 292, fill: css("--text"), "font-size": 15, "font-weight": 800 }, "B · 常规赛总分钟"));

    const accent = css("--accent");
    const smooth = css("--story-gold") || css("--warning");
    const gamesMA = movingAverage(rows, "games");
    const minutesMA = movingAverage(rows, "minutes");

    [
      [linePath(rows, x, yGames, row => row.games), accent, 2.2, ""],
      [linePath(gamesMA, x, yGames, row => row.value), smooth, 3.2, "7 6"],
      [linePath(rows, x, yMinutes, row => row.minutes), accent, 2.2, ""],
      [linePath(minutesMA, x, yMinutes, row => row.value), smooth, 3.2, "7 6"],
    ].forEach(([d, stroke, width, dash]) => svg.appendChild(node("path", {
      d, fill: "none", stroke, "stroke-width": width, "stroke-linejoin": "round", "stroke-linecap": "round", "stroke-dasharray": dash,
    })));

    rows.forEach(row => {
      [[yGames(row.games), "games"], [yMinutes(row.minutes), "minutes"]].forEach(([cy]) => {
        const dot = node("circle", { cx: x(row.end_year), cy, r: 5.2, fill: css("--surface-solid"), stroke: accent, "stroke-width": 2.2, tabindex: 0 });
        const html = `<strong>${row.season} · ${row.player}</strong><div class="tooltip-row"><span>出场</span><span>${row.games}/${row.schedule_games} 场</span></div><div class="tooltip-row"><span>总分钟</span><span>${fmt0.format(row.minutes)}</span></div><div class="tooltip-row"><span>场均</span><span>${fmt1.format(row.minutes_per_game)} 分钟</span></div>`;
        dot.addEventListener("pointermove", event => showTooltip(tooltip, event, html));
        dot.addEventListener("pointerleave", () => hideTooltip(tooltip));
        dot.addEventListener("focus", event => showTooltip(tooltip, event, html));
        dot.addEventListener("blur", () => hideTooltip(tooltip));
        svg.appendChild(dot);
      });
    });

    [1999, 2004, 2009, 2014, 2019, 2024, 2026].forEach(year => {
      svg.appendChild(node("line", { x1: x(year), y1: 526, x2: x(year), y2: 532, stroke: css("--muted"), "stroke-width": 1 }));
      svg.appendChild(node("text", { x: x(year), y: 550, "text-anchor": "middle", fill: css("--muted"), "font-size": 10.5 }, `${year - 1}-${String(year).slice(-2)}`));
    });
    svg.appendChild(node("text", { x: W - margin.right, y: 583, "text-anchor": "end", fill: css("--muted"), "font-size": 10.5 }, "来源：NBA MVP 名单；Basketball-Reference 球员赛季统计镜像"));

    const early = rows.filter(row => row.end_year >= 2000 && row.end_year <= 2010 && row.schedule_games === 82);
    const recent = rows.filter(row => row.end_year >= 2017 && row.end_year <= 2026 && row.schedule_games === 82);
    const earlyMinutes = mean(early, "minutes");
    const recentMinutes = mean(recent, "minutes");
    const earlyGames = mean(early, "games");
    const recentGames = mean(recent, "games");
    $("mvpEarlyMinutes").textContent = fmt0.format(earlyMinutes);
    $("mvpRecentMinutes").textContent = fmt0.format(recentMinutes);
    $("mvpEarlyGames").textContent = `${fmt1.format(earlyGames)} 场`;
    $("mvpRecentGames").textContent = `${fmt1.format(recentGames)} 场`;
    $("availabilityNarrative").innerHTML = `排除缩水赛季后，早期样本的 MVP 平均出场 <strong>${fmt1.format(earlyGames)} 场</strong>、总计 <strong>${fmt0.format(earlyMinutes)} 分钟</strong>；近十季完整赛程样本为 <strong>${fmt1.format(recentGames)} 场</strong>、<strong>${fmt0.format(recentMinutes)} 分钟</strong>。这不能把下降全部归因于轮休，但能说明顶级球星的常规赛总负荷已明显低于二十年前的高位。`;
    if ($("conclusionContract")) $("conclusionContract").textContent = `完整赛季 MVP 平均总分钟：${fmt0.format(earlyMinutes)} → ${fmt0.format(recentMinutes)}`;
  }

  function renderInternational() {
    const rows = context.data.international_players;
    const svg = $("internationalChart");
    const tooltip = $("internationalTooltip");
    if (!svg || !rows.length) return;
    svg.replaceChildren();
    const W = 1120;
    const H = 430;
    const margin = { left: 72, right: 36, top: 48, bottom: 72 };
    const x = year => margin.left + (year - 1991) / (2026 - 1991) * (W - margin.left - margin.right);
    const y = value => H - margin.bottom - value / 150 * (H - margin.top - margin.bottom);
    addGrid(svg, margin.left, W - margin.right, y, [0, 30, 60, 90, 120, 150], value => `${value}`);
    svg.appendChild(node("path", {
      d: linePath(rows, x, y, row => row.players), fill: "none", stroke: css("--accent"), "stroke-width": 3.5, "stroke-linejoin": "round", "stroke-linecap": "round",
    }));
    rows.forEach((row, index) => {
      const dot = node("circle", { cx: x(row.end_year), cy: y(row.players), r: 6, fill: css("--surface-solid"), stroke: css("--accent"), "stroke-width": 3, tabindex: 0 });
      const html = `<strong>${row.season}</strong><div class="tooltip-row"><span>国际球员</span><span>${row.players} 人</span></div><div class="tooltip-row"><span>国家与地区</span><span>${row.countries ?? "未列"}</span></div>`;
      dot.addEventListener("pointermove", event => showTooltip(tooltip, event, html));
      dot.addEventListener("pointerleave", () => hideTooltip(tooltip));
      dot.addEventListener("focus", event => showTooltip(tooltip, event, html));
      dot.addEventListener("blur", () => hideTooltip(tooltip));
      svg.appendChild(dot);
      if ([0, 1, 4, rows.length - 1].includes(index)) {
        svg.appendChild(node("text", { x: x(row.end_year), y: y(row.players) - 15, "text-anchor": "middle", fill: css("--text"), "font-size": 12, "font-weight": 800 }, `${row.players}`));
      }
    });
    [1991, 2001, 2011, 2017, 2021, 2026].forEach(year => {
      svg.appendChild(node("text", { x: x(year), y: H - 38, "text-anchor": "middle", fill: css("--muted"), "font-size": 11 }, `${year - 1}-${String(year).slice(-2)}`));
    });
    svg.appendChild(node("text", { x: W - margin.right, y: H - 10, "text-anchor": "end", fill: css("--muted"), "font-size": 10.5 }, "来源：NBA 开幕夜国际球员官方公告；仅列有可复核官方快照的基准赛季"));

    const first = rows[0];
    const latest = rows[rows.length - 1];
    $("internationalStart").textContent = fmt0.format(first.players);
    $("internationalLatest").textContent = fmt0.format(latest.players);
    $("internationalCountries").textContent = fmt0.format(latest.countries);
    $("internationalNarrative").innerHTML = `从 <strong>${first.players}</strong> 人到 <strong>${latest.players}</strong> 人，官方开幕夜快照扩大到约 <strong>${fmt1.format(latest.players / first.players)} 倍</strong>。人数本身不等于能力，但它直接显示了 NBA 可竞争人才的地理来源显著扩张；2018–19 至 2025–26 连续八届 MVP 均为国际出生球员，则说明扩张已经延伸到联盟最顶端。`;
  }

  async function load() {
    try {
      const response = await fetch("./data/context-data.json?v=20260903-1", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      context.data = await response.json();
      renderAvailability();
      renderInternational();
      document.addEventListener("nba-theme-change", () => {
        renderAvailability();
        renderInternational();
      });
    } catch (error) {
      console.error("Context data failed to load", error);
      if ($("availabilityNarrative")) $("availabilityNarrative").textContent = "MVP 可用性数据载入失败。";
      if ($("internationalNarrative")) $("internationalNarrative").textContent = "国际球员数据载入失败。";
    }
  }

  load();
})();

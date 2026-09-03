"use strict";

(() => {
  const kinds = {
    lockout: { label: "停摆 / 缩水", css: "--event-lockout", dash: "2 4" },
    rules: { label: "薪资规则", css: "--event-rules", dash: "7 4" },
    media: { label: "转播合同", css: "--event-media", dash: "10 4" },
    source: { label: "数据源", css: "--event-source", dash: "4 5" }
  };

  milestones.splice(0, milestones.length,
    { endYear: 1999, short: "1998–99 停摆", title: "六个月停摆与 50 场缩水赛季", full: "联盟于 1998 年 7 月 1 日停摆，劳资双方在 1999 年 1 月达成协议；常规赛到 2 月才开始，每队只打 50 场。", impact: "这是异常短赛季和制度切换期，应视为过渡基准，不能把该季与完整赛季的差异全部解释为长期结构变化。", kind: "lockout", row: 0, link: "https://www.nbpa.com/about", linkLabel: "NBPA 历史时间线" },
    { endYear: 2000, short: "1999 CBA / 个人顶薪", title: "1999–00：新协议下首个完整赛季", full: "1999 CBA 首次设置个人最高工资，并提高最低工资、建立面向中层球员的工资帽例外，同时保留软工资帽。", impact: "个人顶薪压低最顶端，底薪与中层例外支撑下端和中部；方向相反，因此总体 Gini 的净变化需要由数据判断。", kind: "rules", row: 1, link: "https://www.washingtonpost.com/archive/sports/1999/01/07/at-a-glance-the-nba-agreement/15cbe46d-4656-4c3f-b540-9c7840b3e9b9/", linkLabel: "1999 协议条款摘要" },
    { endYear: 2006, short: "2005 CBA", title: "2005 CBA：合同期限与涨幅调整", full: "2005–06 起，最高合同期限缩短一年，续约与转队合同的年涨幅下降，选秀最低年龄提高至 19 岁。", impact: "规则降低超长合同和高年涨幅，但并不必然降低横截面 Gini；结果取决于顶薪、底薪和中层合同的同步变化。", kind: "rules", row: 1, link: "https://www.sportsbusinessjournal.com/Daily/Issues/2005/06/22/Leagues-Governing-Bodies/NBA-And-Union-Outline-Framework-Of-New-Six-Year-CBA/", linkLabel: "2005 CBA 条款摘要" },
    { endYear: 2012, short: "2011 停摆", title: "2011 停摆与 66 场缩水赛季", full: "2011 年 7 月开始停摆，新 CBA 于 12 月 8 日获批，赛季压缩为 66 场；协议采用约 50–50 的篮球相关收入分配、更高的累进奢侈税，并缩短最高合同期限。", impact: "更严的球队成本控制不等于球员之间更均衡；缩短赛季也降低了该年与完整赛季的直接可比性。", kind: "lockout", row: 0, link: "https://official.nba.com/nba-board-of-governors-ratify-10-year-cba/", linkLabel: "NBA 官方：2011 CBA" },
    { endYear: 2017, short: "转播合同 / 帽暴涨", title: "2014 媒体协议于 2016–17 生效", full: "NBA 与 Disney、Turner 的九年全国媒体协议从 2016–17 开始；由于未采用工资帽平滑，该季工资帽出现一次性大幅跳升。", impact: "新增空间优先流向恰逢自由球员年份的球员，形成签约时点红利和工资断层，可能暂时改变 Gini。", kind: "media", row: 1, link: "https://pr.nba.com/nba-partnerships-walt-disney-company-turner-broadcasting-system/", linkLabel: "NBA 官方：2014 媒体协议" },
    { endYear: 2018, short: "2017 CBA", title: "2017 CBA：超级顶薪与双向合同", full: "2017–18 起的新 CBA 引入指定老将续约（超级顶薪），并实施双向合同和额外名单位置。", impact: "超级顶薪抬高少数球星的上端工资，双向合同增加低额记录；两端同时拉开，可能推高全样本 Gini，因此要对照固定 450 人口径。", kind: "rules", row: 0, link: "https://official.nba.com/2017-nba-collective-bargaining-agreement-principal-deal-points/", linkLabel: "NBA 官方：2017 CBA 要点" },
    { endYear: 2019, short: "数据源切换", title: "2018–19 主序列数据源切换", full: "历史工资文件覆盖至 2017–18；从 2018–19 起改用另一份球员工资数据集。", impact: "该节点不是制度变化。附近的突变可能部分来自名单覆盖、短期合同和清洗口径差异。", kind: "source", row: 2, link: "https://github.com/edwinjeon/NBA-Salary-Prediction/blob/main/data/NBA%20Player%20Salaries_2000-2025.csv", linkLabel: "查看近年数据源" },
    { endYear: 2024, short: "2023 CBA / 第二土豪线", title: "2023 CBA：第二土豪线与更强约束", full: "2023–24 起的新 CBA 设置第一、第二土豪线，并对最高支出球队施加更严格的交易和补强限制。", impact: "第二土豪线主要约束球队总支出和建队工具，不会自动压低球员层面的 Gini；分配效果需要多个赛季观察。", kind: "rules", row: 3, link: "https://pr.nba.com/2023-nba-collective-bargaining-agreement-signed/", linkLabel: "NBA 官方：2023 CBA" },
    { endYear: 2025, short: "新媒体协议公布", title: "2024–25：新一轮 11 年媒体协议公布", full: "NBA 于 2024 年 7 月公布与 Disney、NBCUniversal 和 Amazon 的 11 年协议；从 2025–26 开始，持续至 2035–36。", impact: "公布本身不重算 2024–25 工资帽；它主要改变未来收入预期，实际工资分配影响从下一赛季起逐步体现。", kind: "media", row: 1, link: "https://pr.nba.com/nba-walt-disney-company-nbcuniversal-amazon-prime-video-media-agreements/", linkLabel: "NBA 官方：2024 新媒体协议" },
    { endYear: 2026, short: "新媒体协议生效", title: "2025–26：11 年媒体协议生效", full: "新媒体协议从 2025–26 开始。该季工资帽为 1.54647 亿美元，较上季达到现行机制允许的 10% 增幅，而非重演 2016–17 的单年跳升。", impact: "收入扩大工资总盘子，但年度增幅被平滑；Gini 是否继续上升，取决于顶薪、底薪和中层合同谁增长得更快。", kind: "media", row: 2, future: true, link: "https://pr.nba.com/nba-salary-cap-2025-26-season/", linkLabel: "NBA 官方：2025–26 工资帽" }
  );

  const style = document.createElement("style");
  style.textContent = `
    :root{--event-lockout:#c2410c;--event-rules:#7c3aed;--event-media:#0f8a78;--event-source:#6b7c91}
    html[data-theme=dark]{--event-lockout:#fb923c;--event-rules:#b794f6;--event-media:#48d7bd;--event-source:#91a4ba}
    .interpretation-card{padding:20px;margin-bottom:18px;overflow:hidden}.interpretation-head{align-items:center}.section-kicker{display:block;color:var(--accent);font-size:.7rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}.trend-badge{padding:7px 11px;border-radius:999px;background:var(--surface-alt);font-size:.78rem;font-weight:800;white-space:nowrap}.trend-badge.up{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--surface-alt))}.trend-badge.down{color:var(--accent-3)}.interpretation-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.interpretation-item{padding:15px;border:1px solid var(--border);border-radius:14px;background:var(--surface-alt)}.interpretation-item h3{margin:0 0 7px;font-size:.94rem}.interpretation-item p{margin:0;color:var(--muted);font-size:.85rem}.interpretation-number{float:right;color:var(--muted-2);font-family:var(--mono);font-size:.75rem}.interpretation-caveat{margin-top:12px;padding:12px 14px;border-left:4px solid var(--warning);border-radius:10px;background:color-mix(in srgb,var(--warning) 8%,var(--surface-alt));color:var(--muted);font-size:.84rem}
    .legend-line.event{height:15px;width:3px;border-radius:2px;background:var(--event-color)}.legend-line.lockout{--event-color:var(--event-lockout)}.legend-line.rules{--event-color:var(--event-rules)}.legend-line.media{--event-color:var(--event-media)}.legend-line.source{--event-color:var(--event-source)}
    .milestone-section-head{margin:12px 0 10px}.milestone-section-head h3{margin:0 0 3px;font-size:.98rem}.milestone-section-head p{margin:0;color:var(--muted);font-size:.82rem}.milestone-panel{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.milestone-card{--event-color:var(--event-source);padding:13px;border:1px solid var(--border);border-top:4px solid var(--event-color);border-radius:13px;background:var(--surface-solid)}.milestone-card.kind-lockout{--event-color:var(--event-lockout)}.milestone-card.kind-rules{--event-color:var(--event-rules)}.milestone-card.kind-media{--event-color:var(--event-media)}.milestone-card.kind-source{--event-color:var(--event-source)}.milestone-card[role=button]{cursor:pointer}.milestone-card[role=button]:hover{border-color:var(--event-color)}.milestone-card.future{border-style:dashed;border-top-style:solid}.milestone-card-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.event-badge{padding:3px 7px;border-radius:999px;background:color-mix(in srgb,var(--event-color) 12%,var(--surface-alt));color:var(--event-color);font-size:.68rem;font-weight:800}.milestone-season{color:var(--muted);font:700 .7rem var(--mono)}.milestone-card h3{margin:9px 0 6px;font-size:.9rem}.milestone-card p{margin:0 0 7px;color:var(--muted);font-size:.78rem}.milestone-impact strong{color:var(--event-color)}.milestone-card a{font-size:.73rem}
    .tooltip-kind{display:inline-block;padding:2px 6px;border-radius:999px;background:color-mix(in srgb,var(--event-color) 12%,var(--surface-alt));color:var(--event-color);font-size:.67rem;font-weight:800;margin-bottom:5px}.tooltip-copy,.tooltip-impact{margin:5px 0 0;color:var(--muted);font-size:.74rem;line-height:1.4}.tooltip-impact{color:var(--text)}
    @media(max-width:900px){.interpretation-grid,.milestone-panel{grid-template-columns:1fr 1fr}}@media(max-width:620px){.interpretation-grid,.milestone-panel{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const kindInfo = kind => kinds[kind] || kinds.source;
  const eventColor = kind => cssVar(kindInfo(kind).css);
  const modeText = mode => mode === "top450" ? "每季最高薪 450 人" : mode === "top360" ? "每季最高薪 360 人" : "全部列示球员";

  function slopeOf(seasons, mode) {
    if (seasons.length < 2) return NaN;
    const x0 = seasons[0].endYear;
    const pts = seasons.map(d => [d.endYear - x0, d[mode].gini]).filter(p => Number.isFinite(p[1]));
    const mx = pts.reduce((s,p)=>s+p[0],0)/pts.length, my = pts.reduce((s,p)=>s+p[1],0)/pts.length;
    const den = pts.reduce((s,p)=>s+(p[0]-mx)**2,0);
    return den ? pts.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0)/den : NaN;
  }

  function renderInterpretation() {
    const data = visibleSeasons();
    if (!data.length || !el("interpretationLead")) return;
    const mode = state.sampleMode, first = data[0], last = data.at(-1), a = first[mode], b = last[mode];
    const change = b.gini-a.gini, slope = slopeOf(data,mode), top = b.top10Share-a.top10Share;
    const all = last.all.gini-first.all.gini, fixed = last.top450.gini-first.top450.gini;
    const dir = slope>.0008 && change>.002 ? "上升" : slope<-.0008 && change<-.002 ? "下降" : "大体横盘";
    el("interpretationBadge").textContent=`整体趋势：${dir}`; el("interpretationBadge").className=`trend-badge ${dir==="上升"?"up":dir==="下降"?"down":"neutral"}`;
    el("interpretationLead").textContent=`${modeText(mode)}口径下，${first.label} 至 ${last.label} 的 Gini 从 ${a.gini.toFixed(3)} 变为 ${b.gini.toFixed(3)}（${change>=0?"+":""}${change.toFixed(3)}）。`;
    el("interpretationMeaning").textContent=dir==="上升"?"工资份额在相对意义上更集中于少数高薪球员，明星 / 顶薪层与中低薪层的距离扩大；它描述分配结构，而不是工资总盘子。":dir==="下降"?"工资分布相对趋于均衡，中低薪层获得的工资份额相对提高。":"当前区间没有清晰单向变化，年度波动与制度节点同样重要。";
    el("interpretationConcentration").textContent=`前 10% 球员工资占比由 ${fmtPct.format(a.top10Share)} 变为 ${fmtPct.format(b.top10Share)}（${top>=0?"+":""}${(top*100).toFixed(1)} 个百分点）。`;
    el("interpretationRobustness").textContent=all>.002&&fixed>.002?`全样本与固定 450 人口径都上升（${all>=0?"+":""}${all.toFixed(3)}、${fixed>=0?"+":""}${fixed.toFixed(3)}），说明不只是名单尾部效应。`:all>.002&&fixed<=.002?`全样本上升 ${all.toFixed(3)}，固定 450 人仅 ${fixed>=0?"+":""}${fixed.toFixed(3)}；双向 / 短期合同或覆盖扩张可能是重要推手。`:`全样本变化 ${all>=0?"+":""}${all.toFixed(3)}，固定 450 人变化 ${fixed>=0?"+":""}${fixed.toFixed(3)}；两者应结合解读。`;
    el("interpretationCaveat").textContent="基尼上升不等于低薪球员名义工资下降，也不能单独证明竞争更失衡或某份 CBA 导致变化。平均工资和中位数可以同时上涨，只要高薪端上涨更快，Gini 仍会提高。";
  }

  function tipPosition(event, tip) {
    const wrap=tip.parentElement.getBoundingClientRect(), box=event.target.getBoundingClientRect();
    tip.style.left=`${Math.min(Math.max(box.left+box.width/2-wrap.left,120),Math.max(120,wrap.width-120))}px`;
    tip.style.top=`${Math.max(box.top-wrap.top,95)}px`; tip.style.opacity=1;
  }
  function showEventTip(event,m) {
    const tip=el("trendTooltip"), info=kindInfo(m.kind);
    tip.innerHTML=`<span class="tooltip-kind" style="--event-color:${eventColor(m.kind)}">${escapeHtml(info.label)}</span><strong>${escapeHtml(m.title)}</strong><p class="tooltip-copy">${escapeHtml(m.full)}</p><p class="tooltip-impact">对 Gini：${escapeHtml(m.impact)}</p>`;
    tipPosition(event,tip);
  }

  renderTrend = function() {
    const svg=el("trendChart"); svg.innerHTML=""; const data=visibleSeasons();
    if(!data.length){svg.appendChild(svgEl("text",{x:560,y:250,"text-anchor":"middle",fill:cssVar("--muted")},"当前筛选区间没有数据"));return;}
    const mode=state.sampleMode, values=data.map(d=>d[mode].gini), smooth=centeredAverage(values,state.smoothWindow);
    const W=1120,H=520,m={top:112,right:34,bottom:72,left:72}, iw=W-m.left-m.right, ih=H-m.top-m.bottom;
    let ymin=Math.max(0,Math.min(...values,...smooth.filter(Number.isFinite))-.035), ymax=Math.min(1,Math.max(...values,...smooth.filter(Number.isFinite))+.035);
    if(ymax-ymin<.12){const mid=(ymax+ymin)/2;ymin=Math.max(0,mid-.06);ymax=Math.min(1,mid+.06)}
    const start=data[0].endYear,last=data.at(-1).endYear,future=state.showMilestones&&last===2025&&state.endEndYear>=2025,end=future?2026:last,span=Math.max(1,end-start);
    const xs=y=>m.left+(y-start)*iw/span, ys=v=>m.top+(ymax-v)*ih/(ymax-ymin);
    svg.appendChild(svgEl("rect",{x:0,y:0,width:W,height:H,fill:"transparent"}));
    for(let i=0;i<=5;i++){const v=ymin+(ymax-ymin)*i/5,y=ys(v);svg.appendChild(svgEl("line",{x1:m.left,y1:y,x2:W-m.right,y2:y,stroke:cssVar("--grid")}));svg.appendChild(svgEl("text",{x:m.left-12,y:y+4,"text-anchor":"end",fill:cssVar("--muted"),"font-size":12},v.toFixed(3)))}
    const every=data.length>22?3:data.length>14?2:1; data.forEach((d,i)=>{if(i%every&&i!==data.length-1)return;const x=xs(d.endYear);svg.appendChild(svgEl("text",{x,y:H-m.bottom+24,"text-anchor":"end",fill:cssVar("--muted"),"font-size":11,transform:`rotate(-42 ${x} ${H-m.bottom+24})`},d.label))});
    if(future){const x=xs(2026);svg.appendChild(svgEl("text",{x,y:H-m.bottom+24,"text-anchor":"end",fill:eventColor("media"),"font-size":11,"font-weight":700,transform:`rotate(-42 ${x} ${H-m.bottom+24})`},seasonLabel(2026)))}
    if(state.showMilestones) milestones.filter(e=>e.endYear>=start&&e.endYear<=end&&(!e.future||future||data.some(d=>d.endYear===e.endYear))).forEach(e=>{const x=xs(e.endYear),c=eventColor(e.kind),info=kindInfo(e.kind),isFuture=e.future&&!data.some(d=>d.endYear===e.endYear);const line=svgEl("line",{x1:x,y1:m.top-16,x2:x,y2:H-m.bottom,stroke:c,"stroke-width":1.8,"stroke-dasharray":info.dash,opacity:isFuture?.7:.9});line.addEventListener("mouseenter",ev=>showEventTip(ev,e));line.addEventListener("mouseleave",hideTrendTooltip);svg.appendChild(line);const w=Math.max(72,Math.min(178,18+[...e.short].length*10.2)),lx=Math.max(5,Math.min(x+5,W-w-8)),ly=10+(e.row||0)*25,g=svgEl("g",{tabindex:0,role:"button"});g.style.cursor="help";g.appendChild(svgEl("rect",{x:lx,y:ly,width:w,height:21,rx:7,fill:cssVar("--surface-solid"),stroke:c,opacity:isFuture?.82:.96}));g.appendChild(svgEl("text",{x:lx+8,y:ly+14.5,fill:c,"font-size":10.2,"font-weight":760},e.short));g.addEventListener("mouseenter",ev=>showEventTip(ev,e));g.addEventListener("mouseleave",hideTrendTooltip);g.addEventListener("click",()=>{if(state.seasons.some(d=>d.endYear===e.endYear))selectSeason(e.endYear)});svg.appendChild(g)});
    const sp=smooth.map((v,i)=>Number.isFinite(v)?[xs(data[i].endYear),ys(v)]:null).filter(Boolean);if(state.smoothWindow>1&&sp.length>1)svg.appendChild(svgEl("path",{d:pathFrom(sp),fill:"none",stroke:cssVar("--accent"),"stroke-width":3.3,opacity:.82}));
    const pts=data.map(d=>[xs(d.endYear),ys(d[mode].gini)]);svg.appendChild(svgEl("path",{d:pathFrom(pts),fill:"none",stroke:cssVar("--accent-2"),"stroke-width":3,"stroke-linecap":"round","stroke-linejoin":"round"}));
    data.forEach(d=>{const selected=d.endYear===state.selectedEndYear,c=svgEl("circle",{cx:xs(d.endYear),cy:ys(d[mode].gini),r:selected?7:4.7,fill:selected?cssVar("--surface-solid"):cssVar("--accent-2"),stroke:cssVar("--accent-2"),"stroke-width":selected?3:1.6,tabindex:0,role:"button"});c.style.cursor="pointer";c.addEventListener("mouseenter",ev=>showTrendTooltip(ev,d));c.addEventListener("mousemove",ev=>showTrendTooltip(ev,d));c.addEventListener("mouseleave",hideTrendTooltip);c.addEventListener("click",()=>selectSeason(d.endYear));svg.appendChild(c)});
    svg.appendChild(svgEl("text",{x:18,y:H-16,fill:cssVar("--muted"),"font-size":11},`样本口径：${modeText(mode)}`));el("smoothLegend").classList.toggle("hidden",state.smoothWindow<=1);if(el("smoothLegend").lastChild)el("smoothLegend").lastChild.textContent=`${state.smoothWindow} 年均值`;el("chartSubtitle").textContent=`当前显示 ${data[0].label} 至 ${data.at(-1).label}${future?"，并标出 2025–26 新媒体协议生效节点":""}；点击数据点查看洛伦兹曲线。`;
  };

  function renderMilestones() {
    const panel=el("milestonePanel");if(!panel)return;panel.classList.toggle("hidden",!state.showMilestones);if(!state.showMilestones){panel.innerHTML="";return}
    const end=state.endEndYear>=2025?2026:state.endEndYear;
    panel.innerHTML=milestones.filter(m=>m.endYear>=state.startEndYear&&m.endYear<=end).map(m=>{const ok=state.seasons.some(d=>d.endYear===m.endYear),info=kindInfo(m.kind);return `<article class="milestone-card kind-${m.kind}${m.future&&!ok?" future":""}" data-year="${m.endYear}" ${ok?'tabindex="0" role="button"':''}><div class="milestone-card-top"><span class="event-badge">${escapeHtml(info.label)}</span><span class="milestone-season">${m.future&&!ok?seasonLabel(m.endYear)+" · 前瞻":seasonLabel(m.endYear)}</span></div><h3>${escapeHtml(m.title)}</h3><p>${escapeHtml(m.full)}</p><p class="milestone-impact"><strong>对 Gini：</strong>${escapeHtml(m.impact)}</p><a href="${m.link}" target="_blank" rel="noreferrer">${escapeHtml(m.linkLabel)} ↗</a></article>`}).join("");
    panel.querySelectorAll("[role=button]").forEach(card=>card.addEventListener("click",e=>{if(!e.target.closest("a"))selectSeason(Number(card.dataset.year))}));
  }

  renderAll = function(){renderKpis();renderInterpretation();renderTrend();renderMilestones();renderDetails();renderTable()};
  el("showMilestones")?.addEventListener("change",renderMilestones);
  if(state.seasons.length)renderAll();
})();

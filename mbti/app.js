const $=id=>document.getElementById(id);
let page=0,answers={},showingResult=false;
let TOTAL=32;
const SIZE=4;
const modeNames={32:'基础探索',64:'进阶探索',84:'完整画像'};
function activeQuestions(){return QUESTIONS.slice(0,TOTAL);}
function validAnswer(q){return Number.isInteger(answers[q.id])&&answers[q.id]>=1&&answers[q.id]<=5;}
function selectMode(total){
 if(![32,64,84].includes(total))throw new Error('无效的测试版本。');
 TOTAL=total;syncMode();const first=activeQuestions().findIndex(q=>!validAnswer(q));
 if(first<0){result();return;}
 page=Math.floor(first/SIZE);render(true);
}
function syncMode(){
 document.querySelectorAll('[data-total]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.total)===TOTAL?'true':'false'));
 $('mode-description').textContent=TOTAL===32?'先用 32 题了解四维偏好，完成后可继续进阶。':TOTAL===64?'基础 32 题 + 扩展 32 题，比较两组结果并查看融合倾向。':'基础 32 题 + 扩展 32 题 + 大五 20 题，查看完整画像。';
 document.querySelector('.progress').setAttribute('aria-valuemax',TOTAL);
}
const stages=[['01','日常偏好','原量表 · 32 题'],['02','换个角度','扩展题池 · 32 题'],['03','补充画像','Mini-IPIP · 20 题']];
const dims={IE:['内向 I','外向 E','能量方向'],SN:['实感 S','直觉 N','感知方式'],FT:['情感 F','思考 T','决策偏好'],JP:['判断 J','知觉 P','生活方式']};
const traits={E:['外向性','社交活跃、主动表达'],A:['宜人性','共情、关心他人'],C:['尽责性','条理、及时完成事务'],N:['情绪敏感性','情绪波动、容易感到困扰'],O:['想象与智性','想象力、对抽象想法的兴趣']};
const descriptions={I:'你可能更喜欢先独自梳理，再与人交流。',E:'你可能更容易在互动和表达中找到能量。',S:'你可能更关注具体事实与可观察的细节。',N:'你可能更关注潜在联系与尚未实现的可能。',F:'你可能更重视个人价值及事情对他人的影响。',T:'你可能更重视逻辑一致性与判断依据。',J:'你可能更喜欢提前安排，让事情逐步确定。',P:'你可能更喜欢保持弹性，随着新信息调整安排。'};
function current(){return QUESTIONS.slice(page*SIZE,(page+1)*SIZE);}
function updateProgress(){const done=activeQuestions().filter(validAnswer).length;$('count').textContent=`${done} / ${TOTAL} 已完成`;$('progress').style.width=`${done/TOTAL*100}%`;document.querySelector('.progress').setAttribute('aria-valuenow',done);const missing=current().filter(q=>!answers[q.id]).length;$('remaining').textContent=missing?`本组还有 ${missing} 题`:'本组已完成';$('next').disabled=missing>0;}
function render(focus=false){
 showingResult=false;$('test').hidden=false;$('result').hidden=true;
 const stage=stages[page<8?0:page<16?1:2];$('chapter').textContent=`PART ${stage[0]} / ${stage[1]} / 第 ${page+1} 组，共 ${TOTAL/SIZE} 组`;
 $('question-heading').textContent=page<16?'凭第一感觉，选择最贴近你的描述':'这些描述，在多大程度上符合你？';
 document.querySelector('.hint').textContent=page<16?'从偏左、略偏左、两者之间、略偏右到偏右，选择一项。':'1 非常不符合 · 2 不太符合 · 3 中立 · 4 比较符合 · 5 非常符合';
 $('questions').innerHTML=current().map((q,i)=>`<fieldset><legend><span class="qnum">${String(page*SIZE+i+1).padStart(2,'0')}</span>${q.statement||'通常的我更倾向于…'}</legend><div class="question-row"><span class="endpoint" id="${q.id}-left">${q.left}</span><div class="options" role="radiogroup" aria-label="第 ${page*SIZE+i+1} 题：${q.statement||q.left+'，还是'+q.right}">${[1,2,3,4,5].map(v=>`<label class="option" title="${q.source==='mini'?['非常不符合','不太符合','中立','比较符合','非常符合'][v-1]:['偏左：'+q.left,'略偏左','两者之间','略偏右','偏右：'+q.right][v-1]}"><input type="radio" name="${q.id}" value="${v}" aria-label="${v}，${q.source==='mini'?['非常不符合','不太符合','中立','比较符合','非常符合'][v-1]:['偏左','略偏左','两者之间','略偏右','偏右'][v-1]}" ${answers[q.id]===v?'checked':''}><span>${v}</span></label>`).join('')}</div><span class="endpoint right">${q.right}</span></div><div class="scale-note"><span>${q.source==='mini'?'不符合':'偏左'}</span><span>${q.source==='mini'?'中立':'两者之间'}</span><span>${q.source==='mini'?'符合':'偏右'}</span></div></fieldset>`).join('');
 $('prev').disabled=page===0;$('next').textContent=page===TOTAL/SIZE-1?'查看'+modeNames[TOTAL]+'结果':page===7?'进入扩展题':page===15?'进入补充题':'下一组';updateProgress();
 document.querySelectorAll('#questions input').forEach(input=>input.addEventListener('change',()=>{answers[input.name]=Number(input.value);updateProgress();}));
 if(focus){$('question-heading').focus({preventScroll:true});document.querySelector('.workspace').scrollIntoView({behavior:'instant',block:'start'});}
}
function pct(s){return Math.round((s+1)*50);}
function direction(d,s){return Math.abs(s)<1e-9?'居中':d[s>0?1:0];}
function result(){
 const r=scoreAnswers(answers,TOTAL);showingResult=true;$('test').hidden=true;$('result').hidden=false;
 const advanced=TOTAL>=64,uncertain=r.dimensions.some(d=>d.letter==='X');
 const comparison=advanced?`<details class="comparison"><summary>查看两组结果如何融合</summary><p>原量表与扩展组各占 50%。两者同源，不能当作两次独立验证。两组方向相反时保留 X。</p><div class="table-wrap"><table><thead><tr><th>维度</th><th>原量表</th><th>扩展组</th><th>融合</th></tr></thead><tbody>${r.dimensions.map(d=>`<tr><td>${dims[d.dim][2]}</td><td>${direction(d.dim,d.base)} · ${pct(d.base)}</td><td>${direction(d.dim,d.ext)} · ${pct(d.ext)}</td><td>${d.letter} · ${pct(d.fused)}</td></tr>`).join('')}</tbody></table></div></details>`:'';
 const mini=r.mini.length?`<section class="bigfive"><div class="eyebrow">ANOTHER PERSPECTIVE</div><h2>五个连续维度，看见更多细节</h2><p class="result-intro">Mini-IPIP 独立计分，不参与四字母类型融合。</p>${r.mini.map(t=>`<div class="trait"><div><b>${traits[t.dim][0]}</b><span>${Math.round(t.score)} / 100</span></div><div class="trait-track"><span style="width:${t.score}%"></span></div><p>${traits[t.dim][1]} · 分数越高，本次自述越符合这些描述。</p></div>`).join('')}<p class="notice">每维仅 4 题，适合作为补充线索。分数不是好坏、临床指标或常模排名。中文翻译未经独立验证。</p></section>`:'';
 const upgrade=TOTAL<84?`<section class="upgrade"><h2>${TOTAL===32?'想再了解一点？':'还想看见更多细节？'}</h2><p>${TOTAL===32?'继续完成扩展题，比较另一组题目呈现的偏好。':'继续完成 Mini-IPIP，获得独立的大五画像。'}当前答案会保留，也可以就停在这里。</p><button class="primary" id="upgrade">${TOTAL===32?'继续进阶 · 最多再答 32 题':'补充大五 · 最多再答 20 题'}</button></section>`:'';
 $('result').innerHTML=`<div class="result-eyebrow">YOUR INNER ATLAS / ${modeNames[TOTAL]}</div><div class="type-code">${r.type}</div><h2 tabindex="-1" id="result-title">${uncertain?'有些偏好，值得继续探索':'这是你此刻呈现的偏好'}</h2><p class="result-intro">${uncertain?(advanced?'X 表示接近分界或两组答案方向不同。':'X 表示原量表得分接近分界。')+'保留这种不确定，比急着确定一个类型更有意义。':'四个字母描述本次作答的方向，可以帮助你观察自己，但不会定义你的能力与未来。'}</p><div class="result-tag">${TOTAL===32?'32 题 · OEJTS 基础结果':TOTAL===64?'64 题 · 四维融合结果':'64 题四维融合 ＋ 20 题独立大五画像'}</div>${r.dimensions.map(d=>`<div class="result-dim"><div class="dim-labels"><span>${dims[d.dim][0]}</span><b>${d.conflict?'两组有分歧':d.boundary?'接近分界':dims[d.dim][d.fused>0?1:0]}</b><span>${dims[d.dim][1]}</span></div><div class="dim-bar"><span style="width:${pct(d.fused)}%"></span><i style="left:${pct(d.fused)}%"></i></div><div class="dim-meta"><span>${dims[d.dim][2]}</span><span>${advanced?'融合':'原量表'}位置 ${pct(d.fused)} / 100</span></div></div>`).join('')}<p class="notice">位置分不是准确率或人群百分位。${advanced?'融合及分界保留规则':'分界保留规则'}为本站实验性设计，尚未经验证。</p>${comparison}<details class="comparison"><summary>核对原量表计分</summary><p>按原文严格 &gt;24 规则得到：<b>${r.dimensions.map(d=>d.dim[d.baseRaw>24?1:0]).join('')}</b>。原始分：${r.dimensions.map(d=>`${d.dim} ${d.baseRaw}`).join(' / ')}。原文将 24 分划入左侧；本站展示结果对分界附近保留 X。</p></details><div class="insight"><b>把结果放回真实生活</b>${r.dimensions.map(d=>d.letter==='X'?`<p>${dims[d.dim][2]}：回想你在熟悉与陌生环境中的具体选择，观察偏好是否随情境改变。</p>`:`<p>${descriptions[d.letter]}</p>`).join('')}</div>${mini}${upgrade}<div class="result-actions"><button class="secondary" id="review">返回检查答案</button><button class="secondary" id="restart">重新测试</button></div>`;
 $('review').onclick=()=>{page=0;render(true);};$('restart').onclick=()=>$('restart-confirm').showModal();
 if($('upgrade'))$('upgrade').onclick=()=>selectMode(TOTAL===32?64:84);
 $('result-title').focus({preventScroll:true});document.querySelector('.workspace').scrollIntoView({behavior:'instant'});
}
$('next').onclick=()=>{if(current().some(q=>!answers[q.id]))return;if(page===TOTAL/SIZE-1)result();else{page++;render(true);}};
$('prev').onclick=()=>{if(page>0){page--;render(true);}};
$('source-open').onclick=()=>$('sources').showModal();$('source-close').onclick=()=>$('sources').close();
$('cancel-restart').onclick=()=>$('restart-confirm').close();$('confirm-restart').onclick=()=>{$('restart-confirm').close();answers={};page=0;TOTAL=32;syncMode();render(true);};
document.querySelectorAll('[data-total]').forEach(b=>b.onclick=()=>selectMode(Number(b.dataset.total)));
syncMode();render();
window.addEventListener('beforeunload',e=>{if(Object.keys(answers).length&&!showingResult){e.preventDefault();e.returnValue='';}});
// Progressive enhancement: the same state and validation serve UI and agents.
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_personality_test',description:'Read the current questions, answer progress and completed report if available.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({answered:activeQuestions().filter(validAnswer).length,total:TOTAL,page:page+1,questions:current().map(q=>({id:q.id,statement:q.statement,left:q.left,right:q.right,answer:answers[q.id]??null})),result:showingResult?scoreAnswers(answers,TOTAL):null})});
 register({name:'answer_personality_questions',description:'Record explicit user-provided ratings from 1 to 5 for a batch of questionnaire items. Do not infer answers. Updates answers but does not submit the report.',inputSchema:{type:'object',properties:{answers:{type:'array',items:{type:'object',properties:{id:{type:'string'},value:{type:'integer',minimum:1,maximum:5}},required:['id','value'],additionalProperties:false}}},required:['answers'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!Array.isArray(input.answers)||input.answers.length===0||input.answers.some(a=>!activeQuestions().some(q=>q.id===a.id)||!Number.isInteger(a.value)||a.value<1||a.value>5))throw new Error('Invalid question IDs or ratings.');input.answers.forEach(a=>answers[a.id]=a.value);const next=activeQuestions().findIndex(q=>!validAnswer(q));page=next<0?TOTAL/SIZE-1:Math.floor(next/4);render();return {answered:activeQuestions().filter(validAnswer).length,total:TOTAL};}});
 register({name:'select_personality_version',description:'Select the 32, 64 or 84 item version, preserving existing answers. Opens the first unanswered group or its completed report.',inputSchema:{type:'object',properties:{total:{type:'integer',enum:[32,64,84]}},required:['total'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{selectMode(input?.total);return {total:TOTAL,answered:activeQuestions().filter(validAnswer).length};}});
 register({name:'complete_personality_test',description:'Complete the questionnaire and display the report, only after every rating for the selected 32, 64 or 84 item version is recorded.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:()=>{const r=scoreAnswers(answers,TOTAL);result();return r;}});
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

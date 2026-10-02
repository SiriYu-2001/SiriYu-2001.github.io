// Questionnaire translations: CC BY-NC-SA 4.0 for OEJTS and its development pool.
// Mini-IPIP source items are public domain. See methodology in the website.
const BASE = [
['会列清单','靠记忆安排事情','JP',1],['习惯持怀疑态度','愿意选择相信','FT',-1],['独处容易无聊','需要独处时间','IE',-1],['接受事物现有的样子','不满足于事物现状','SN',1],
['保持房间整洁','东西随手放','JP',1],['觉得被说像机器是一种冒犯','希望思维像机器一样运作','FT',1],['精力充沛','平和舒缓','IE',-1],['偏爱选择题','偏爱论述题','SN',1],
['生活比较杂乱','生活井然有序','JP',-1],['容易感到受伤','不容易被伤到','FT',1],['团队合作时发挥更好','独自工作时发挥更好','IE',-1],['关注当下','关注未来','SN',1],
['很早就做计划','临近时才做计划','JP',1],['希望得到他人的尊重','希望得到他人的喜爱','FT',-1],['聚会让我疲惫','聚会让我兴奋','IE',1],['容易融入群体','显得与众不同','SN',1],
['保留选择的余地','作出承诺并确定下来','JP',-1],['希望擅长修好东西','希望擅长帮助人解决自身问题','FT',-1],['更多时候在说话','更多时候在倾听','IE',-1],['描述事件时讲发生了什么','描述事件时讲它意味着什么','SN',1],
['马上完成工作','会拖延工作','JP',1],['跟随内心感受','跟随理性思考','FT',1],['待在家里','外出活动','IE',1],['想了解整体全貌','想了解具体细节','SN',-1],
['即兴发挥','提前准备','JP',-1],['以公正作为道德基础','以同情作为道德基础','FT',-1],['很难大声喊出来','能自然地大声呼喊远处的人','IE',1],['偏重理论','偏重实证','SN',-1],
['努力工作','尽情玩乐','JP',1],['面对情感有些不自在','重视情感','FT',-1],['喜欢在人前表现','回避公开讲话','IE',-1],['喜欢问谁、什么、何时','喜欢问为什么','SN',1]
];
// Explicit editorial selection: eight unique pairs per dimension. No claim that
// this selection is a published validated scale. Signed source differences are
// descriptive group differences, never fitted weights or accuracy estimates.
const EXT = {
IE:[
['喜欢闲聊','不喜欢闲聊',-1,'likes small talk; hates small talk',0.98],
['待人友好亲近','与人保持距离',-1,'friendly; distant',1.26],
['对人敞开心扉','对人有所保留',-1,'open; guarded',1.41],
['更愿意做领队','更愿意做副手',-1,'prefers to be captain; rather be first mate',1.02],
['难以解释自己的想法','能自信地解释自己的想法',1,'has difficulty explaining their ideas; confident explaining their ideas',1.02],
['走到前台带领大家','在幕后推动事情',-1,'leads from the front; manipulates things behind the scenes',1.16],
['沉静严肃','热情洋溢',1,'somber; enthusiastic',1.33],
['谨慎行事','大胆行动',1,'cautious; bold',1.04]],
SN:[
['关注现实情况','关注各种可能性',1,'interested in realities; interested in possibilities',0.75],
['尝试稳妥实际的解决办法','尝试巧妙的解决办法',1,'tries a sensible solution; tries a clever solution',0.63],
['按逼真程度评价一幅画','按更深层的标准评价一幅画',1,'judges a painting on how realistic it is; judges a painting by deeper criteria',0.74],
['喜欢知道所有事实','喜欢自己填补信息空白',1,'likes knowing all the facts; likes filling in the blanks',0.52],
['遵循规则的字面条文','遵循规则背后的精神',1,'respects the letter of the law; follows the spirit of the law',0.51],
['喜欢动作情节丰富的故事','喜欢情节转折丰富的故事',1,'likes stories with lots of action; likes stories with lots of twists',0.51],
['风格比较常规','风格比较另类',1,'normal; alternative',0.61],
['放松休息','沉浸在遐想中',1,'relaxes; daydreams',0.48]],
FT:[
['运用理性','运用本能',-1,'uses reason; uses instinct',1.17],
['关心一件事是好是坏','关心一件事是真是假',1,'cares if something is good or bad; cares if something is true or false',1.12],
['追求清晰明确','追求和谐融洽',-1,'seeks clarity; seeks harmony',1.05],
['想发表令人信服的演说','想发表鼓舞人心的演说',-1,'tries to give convincing speeches; tries to give inspiring speeches',1.04],
['多愁善感','严肃冷峻',1,'sentimental; grim',1.07],
['说话委婉','说话直率',1,'tactful with others; blunt with others',0.86],
['评价别人时考虑动机','评价别人时只考虑结果',1,'when judging others, considers intent; only considers outcome',0.64],
['通过暗示表达','直接说出来',1,'gives hints; tell it straight up',0.75]],
JP:[
['固定日程让我安心','固定日程让我无聊',1,'assured by routine; bored by routine',0.82],
['需要确定性','需要灵活性',1,'needs certainty; needs flexibility',0.82],
['坚持原定计划','随情况调整计划',1,'sticks to the plan; adapts the plan on the fly',1.07],
['反复检查自己的工作','期待事情顺利就好',1,'double checks their work; hopes for the best',0.82],
['立即回复邮件','常常来不及回复邮件',1,'answers mail right away; gets behind on answering mail',0.70],
['总会把一句话说完整','有时说到一半就没下文',1,'always finishes sentences; can trail off in the middle of a sentences',0.63],
['对时间有准确的感知','常常不知道时间过去多久',1,'has an accurate internal clock; often has no idea what time it is',0.59],
['一阵一阵地投入工作','以稳定节奏推进工作',-1,'works in fits and bursts; works through it steadily',0.84]]
};
const MINI = {
E:[['我常是聚会中活跃气氛的人',1,'Am the life of the party.'],['我在聚会上会和许多不同的人交谈',1,'Talk to a lot of different people at parties.'],['我话不多',-1,"Don't talk a lot."],['我倾向于待在不引人注意的位置',-1,'Keep in the background.']],
A:[['我能同情他人的感受',1,"Sympathize with others’ feelings."],['我能感受到他人的情绪',1,"Feel others’ emotions."],['我对别人没有太大兴趣',-1,'Am not really interested in others.'],['我对别人的问题不感兴趣',-1,"Am not interested in other people’s problems."]],
C:[['我会马上把杂事做完',1,'Get chores done right away.'],['我喜欢井然有序',1,'Like order.'],['我经常忘记把东西放回原处',-1,'Often forget to put things back in their proper place.'],['我常把东西弄得乱七八糟',-1,'Make a mess of things.']],
N:[['我的情绪经常起伏',1,'Have frequent mood swings.'],['我很容易心烦意乱',1,'Get upset easily.'],['我大部分时间都很放松',-1,'Am relaxed most of the time.'],['我很少感到低落',-1,'Seldom feel blue.']],
O:[['我有生动丰富的想象力',1,'Have a vivid imagination.'],['我很难理解抽象的概念',-1,'Have difficulty understanding abstract ideas.'],['我对抽象的想法不感兴趣',-1,'Am not interested in abstract ideas.'],['我的想象力不太好',-1,'Do not have a good imagination.']]
};
const QUESTIONS = BASE.map((q,i)=>({id:'base-'+(i+1),left:q[0],right:q[1],dim:q[2],sign:q[3],source:'base',ref:'OEJTS 1.2 · Q'+(i+1)}));
for(let i=0;i<8;i++) for(const dim of ['IE','SN','FT','JP']) {const q=EXT[dim][i];QUESTIONS.push({id:`ext-${dim}-${i+1}`,left:q[0],right:q[1],dim,sign:q[2],english:q[3],sourceDifference:q[4],source:'ext',ref:'开放开发题池 · '+dim+' '+(i+1)});}
for(let i=0;i<4;i++) for(const dim of ['E','A','C','N','O']) {const q=MINI[dim][i];QUESTIONS.push({id:`mini-${dim}-${i+1}`,statement:q[0],left:'非常不符合',right:'非常符合',dim,sign:q[1],english:q[2],source:'mini',ref:'Mini-IPIP · '+dim+' '+(i+1)});}
function scoreAnswers(answers){
 if(QUESTIONS.some(q=>!Number.isInteger(answers[q.id])||answers[q.id]<1||answers[q.id]>5))throw new Error('请完成全部 84 道题后查看结果。');
 const value=(source,dim)=>{const qs=QUESTIONS.filter(q=>q.source===source&&q.dim===dim);return qs.reduce((sum,q)=>sum+(answers[q.id]-3)*q.sign,0)/(2*qs.length);};
 const dimensions=['IE','SN','FT','JP'].map(dim=>{const base=value('base',dim),ext=value('ext',dim),fused=(base+ext)/2;const conflict=base*ext<0;const boundary=Math.abs(fused)<=0.125;return {dim,base,ext,fused,conflict,boundary,letter:conflict||boundary?'X':dim[fused>0?1:0],baseRaw:24+16*base};});
 return {dimensions,type:dimensions.map(d=>d.letter).join(''),mini:['E','A','C','N','O'].map(dim=>({dim,score:50+50*value('mini',dim)}))};
}
if(typeof module!=='undefined')module.exports={QUESTIONS,scoreAnswers};

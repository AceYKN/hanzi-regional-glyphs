import { mkdir, writeFile } from "node:fs/promises";
import { pinyin } from "pinyin-pro";

const PRIORITY = Array.from(new Set(Array.from(
  "的一是不了在人有我他这中来上大为和国地到以说时要就出会可也你对生能而子那得于着下自之年过发后作里用道行所然家种事成方多经去法学如都同现当没动面起看定天分还进好小部其些主样理心她本前开但因只从想实日军者意无力与长把机十民第公此已工使情明性知全三又关点正业外将两高间由问很最重并物手应战向头文体政美相见被利二等产或新己制身果加西月话合回特代内信表化老给世位次度门任常先海通教儿原东声提立及比员解水名真论处走义各入几口认条平系气题活更别打女变四总何电数安少报才结反受目太量再感建务做接必场件计管期市直德资命山金指克许统区保至队形社便空决治展马科司五基眼书非则听白界达光放强即像难权思王完设式色路记南品住告类求据程北边张该交规万取拉格望觉术领共确传师观清今切院让识候带导争运笑飞风步改收根干造言联持组每济车亲极林服快办议往元英士证近失转夫令准布始存远叫台单影具罗字爱击流备兵连调深商算质团集百需价花党华城石级整府离况亚请技际约示复病息究线似官火断精满支视消越器容照须九增研写称企八功包片史委查轻易早曾除农找装广显李标谈吃图念六引历首医局突专费号尽另周较注语考落青随选列武红响推势参希古众构房半节土投某案黑维革划敌致陈律足态护七兴派孩验责营星够章音跟志底站严例防族供效续施留讲型料终答紧黄绝奇察母京段依批群项故按河米围江织害斗双境客纪采举攻父密低朝友诉止细愿千值仍男钱破网热助倒育属坐帝限船脸职速刻乐否刚威毛状率甚独球般普怕弹校苦创假久错承印晚试股拿脑预谁益阳若微继送急血惊伤素药适波夜省初喜卫源食险待述陆习置居劳财环排福纳欢雷警获模充负云停木游龙树疑层冷洲冲射略范句室异激汉村策演简卡判担州静退既衣宗积余痛检差富灵协角占配征修皮挥胜降阶审沉坚善读超免压银买皇养怀执副乱抗犯追帮宣岁航优怪香著田铁控税左岭右序敢妇遍婚蓝彦宝赶甜危寻聊欢迎見東國龍髮發竜"
)));

const rank = new Map(PRIORITY.map((char, index) => [char, index]));
const syllablePriority = {
  gu: "古故顾谷骨鼓姑固孤估雇辜咕箍沽菇",
  jian: "见间件建检简坚减剪健兼监剑鉴肩渐践荐艰尖",
  dong: "东动懂冬洞董栋冻咚侗",
  fa: "发法罚乏伐阀筏珐",
};
const entries = new Map();

function add(syllable, char) {
  if (!/^[a-zv]+$/.test(syllable)) return;
  const list = entries.get(syllable) ?? [];
  if (!list.includes(char)) list.push(char);
  entries.set(syllable, list);
}

for (let codePoint = 0x3400; codePoint <= 0x9fff; codePoint += 1) {
  const char = String.fromCodePoint(codePoint);
  const readings = pinyin(char, { toneType: "none", type: "array", multiple: true, v: true, traditional: true });
  for (const reading of readings) {
    if (reading !== char) add(reading.toLowerCase(), char);
  }
}

const sortedEntries = Object.fromEntries(
  [...entries.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([syllable, chars]) => [
      syllable,
      chars.sort((a, b) => {
        const localRank = syllablePriority[syllable]?.indexOf(a) ?? -1;
        const otherLocalRank = syllablePriority[syllable]?.indexOf(b) ?? -1;
        const scoreA = localRank >= 0 ? localRank : 1000 + (rank.get(a) ?? 100000 + a.codePointAt(0));
        const scoreB = otherLocalRank >= 0 ? otherLocalRank : 1000 + (rank.get(b) ?? 100000 + b.codePointAt(0));
        return scoreA - scoreB;
      }).join(""),
    ]),
);

const output = {
  version: "pinyin-pro-3.29.3-cjk-basic",
  entries: sortedEntries,
};

await mkdir(new URL("../public/index/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/index/pinyin.json", import.meta.url), `${JSON.stringify(output)}\n`);
console.log(`Generated ${Object.keys(sortedEntries).length} pinyin keys.`);

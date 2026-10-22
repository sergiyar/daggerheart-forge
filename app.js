'use strict';
/* Кузница героя Daggerheart. Данные: window.DH (data.js, SRD 1.0 с ru.daggerheart.su). */
const D = window.DH;
const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
const CLS = byId(D.classes), ANC = byId(D.ancestries), COM = byId(D.communities);
const CARD = byId(D.cards), WPN = byId(D.weapons), ARM = byId(D.armor), ITEM = byId(D.items);

const TR = [
  ['agi', 'Проворность', 'Пробежать, прыгнуть, маневрировать', 'agility'],
  ['str', 'Сила', 'Поднять, крушить, схватить', 'strength'],
  ['fin', 'Искусность', 'Взломать, скрыться, смастерить', 'finesse'],
  ['ins', 'Инстинкт', 'Увидеть, почувствовать, ориентироваться', 'instinct'],
  ['pre', 'Влияние', 'Очаровать, выступить, обмануть', 'presence'],
  ['kno', 'Знание', 'Вспоминать, анализировать, понимать', 'knowledge'],
];
const TN = Object.fromEntries(TR.map((t) => [t[0], t[1]]));
const SPELL = { agility: 'agi', strength: 'str', finesse: 'fin', instinct: 'ins', presence: 'pre', knowledge: 'kno' };
const POOL = [2, 1, 1, 0, 0, -1];

/* ---------- гайды и советы (собственные тексты конструктора) ---------- */
const ROLE = {
  bard: 'Душа компании и поддержка: вдохновляет союзников костями Сплочения, силён в разговоре и магии слова.',
  druid: 'Превращается в зверей и управляет природой. Гибкий: разведка, бой в звериной форме, лечение или стихии.',
  guardian: 'Танк. Держит удар, прикрывает союзников и не даёт врагам пройти.',
  ranger: 'Охотник и стрелок. Метит добычу, хорош на дистанции, может завести зверя-компаньона.',
  rogue: 'Скрытность, точные удары из тени, ловушки, связи в преступном мире.',
  seraph: 'Божественный воин: бьёт, лечит и защищает силой молитвы. Может летать на крыльях.',
  sorcerer: 'Врождённая магия: мощные заклинания стихий, иллюзии, чутьё на магию вокруг.',
  warrior: 'Мастер оружия. Лучше всех в ближнем бою, наказывает врагов, которые пытаются уйти.',
  wizard: 'Учёный маг. Гибкие заклинания из книг, много знаний, полезен вне боя.',
};
const DOMAIN_INFO = {
  arcana: 'врождённая стихийная магия, сырая сила',
  blade: 'мастерство оружия и боевые приёмы',
  bone: 'тактика, ловкость тела, чтение боя',
  codex: 'книжная магия, гримуары, универсальные заклинания',
  grace: 'обаяние, слово, иллюзии и очарование',
  midnight: 'тени, скрытность, тайны и проклятия',
  sage: 'природа, звери, растения, исцеление земли',
  splendor: 'божественный свет, исцеление, защита от смерти',
  valor: 'стойкость, защита союзников, щит и броня',
};
/* Типичные раскладки — подсказка конструктора, не официальная таблица. */
const LAYOUT = {
  bard: { pre: 2, fin: 1, kno: 1, agi: 0, ins: 0, str: -1 },
  druid: { ins: 2, agi: 1, pre: 1, str: 0, kno: 0, fin: -1 },
  guardian: { str: 2, agi: 1, pre: 1, ins: 0, kno: 0, fin: -1 },
  ranger: { agi: 2, fin: 1, ins: 1, str: 0, kno: 0, pre: -1 },
  rogue: { fin: 2, agi: 1, pre: 1, ins: 0, kno: 0, str: -1 },
  seraph: { str: 2, pre: 1, ins: 1, agi: 0, kno: 0, fin: -1 },
  sorcerer: { ins: 2, pre: 1, kno: 1, agi: 0, fin: 0, str: -1 },
  warrior: { str: 2, agi: 1, ins: 1, fin: 0, kno: 0, pre: -1 },
  wizard: { kno: 2, ins: 1, pre: 1, agi: 0, fin: 0, str: -1 },
};
const EXP_EXAMPLES = [
  ['Прошлое', 'Бывший гладиатор · Корабельный кок · Беглый послушник · Сын рыбака · Наёмник'],
  ['Черта', 'Обаятельный · Упрямый · Наблюдательный · Хладнокровный · Меня не запугать'],
  ['Специальность', 'Целитель · Следопыт · Картограф · Кузнец · Моряк'],
  ['Навык', 'Карманник · Скалолаз · Торговец · Знаток ядов · Морской узел'],
  ['Фраза', 'Знаю парня, который знает парня · Меня так просто не убить · Публика меня любит'],
];
const GUIDE = {
  class: ['Класс задаёт стартовое <b>Уклонение</b> (насколько трудно по тебе попасть) и число <b>ячеек Ран</b>.',
    'Даёт два <b>домена</b>: из них ты берёшь карты умений и заклинаний на каждом уровне.',
    '<b>Свойство Надежды</b> — особый приём класса, на него тратят 3 Надежды.',
    'Классовые свойства работают с первого уровня и всегда.'],
  subclass: ['Подкласс задаёт стиль внутри класса. На 1 уровне работают свойства <b>Основы</b>.',
    '<b>Специализация</b> и <b>Мастерство</b> открываются позже при повышении уровня, на старших рангах.',
    '<b>Характеристика Заклинателя</b> — черта для Бросков Заклинания. У Воина и Стража её нет: их домены почти целиком из умений.'],
  ancestry: ['Родословная — это народ персонажа: внешность и два свойства.',
    'Можно взять <b>смешанную родословную</b>: первое свойство одной и второе свойство другой.',
    'Свойства Великана, Человека, Симиана, Галапы и Кланка меняют цифры, конструктор учтёт их сам.'],
  community: ['Сообщество — где и как персонаж вырос. Даёт одно свойство, чаще всего для разговоров и исследования.',
    'Оно не обязано совпадать с родословной: орк вполне может вырасти среди знати.'],
  traits: ['Распредели значения <b>+2, +1, +1, 0, 0, −1</b> по шести характеристикам.',
    'Любой бросок действия — это 2d12 плюс характеристика. Между +2 и −1 разница в 3 пункта на каждом броске.',
    'Оружие атакует своей характеристикой (она указана на оружии), заклинания — Характеристикой Заклинателя. Туда стоит поставить +2.',
    'Уклонение не зависит от Проворности: оно берётся из класса и брони.'],
  gear: ['Возьми основное оружие 1 ранга. Если оно одноручное, можно добавить вспомогательное: щит, кинжал, короткий меч.',
    'Урон оружия = <b>Мастерство</b> костей урона + бонус оружия. На 1 уровне Мастерство равно 1.',
    'Броня задаёт <b>пороги урона</b>: чем они выше, тем реже удар снимает 2 или 3 Раны. <b>Показатель Брони</b> — сколько раз можно отметить ячейку брони, чтобы ослабить удар на ступень.',
    'Тяжёлая броня и большие щиты снижают Уклонение. Пороги растут с уровнем.'],
  exp: ['<b>Опыт</b> — короткая фраза о прошлом, навыке, черте или профессии. На 1 уровне их два, каждый +2.',
    'Перед броском можно потратить 1 Надежду и добавить подходящий Опыт. Он работает и в бою, и вне его.',
    'Не делай его слишком широким («Хорош во всём») или слишком узким («Открываю синие двери»).'],
  cards: ['На 1 уровне берёшь <b>2 карты 1 уровня</b> из доменов класса. Можно обе из одного домена.',
    'В <b>Руке</b> до 5 активных карт, остальные лежат в <b>Хранилище</b>. Достать карту из Хранилища вне отдыха стоит Стресса, это число на карте (стоимость Призыва). Во время отдыха меняешь карты бесплатно.',
    '<b>Умения</b> работают без броска магии, <b>Заклинания</b> требуют Броска Заклинания, <b>Гримуар</b> — несколько мелких заклинаний на одной карте.'],
  story: ['Это не механика, а крючки для Мастера: чем конкретнее ответы, тем больше сюжета вокруг персонажа.',
    'Вопросы связей задают другим игрокам на нулевой сессии.'],
};

/* ---------- состояние ---------- */
const KEY = 'dh-forge-v1';
function bronk() {
  const b = blank();
  return merge(Object.assign(b, {
    view: 'build', step: 9,
    classId: 'warrior', subclassId: 'call-of-the-brave', ancestryId: 'orc', communityId: 'highborne',
    traits: { agi: 1, str: 2, fin: 0, ins: 0, pre: 1, kno: -1 },
    primary: 'mace', secondary: 'round-shield', armor: 'leather-armor', potion: 'minor-health-potion',
    experiences: [{ name: 'Любимец публики', mod: 2 }, { name: 'Ветеран ринга', mod: 2 }],
    cards: ['get-back-up', 'whirlwind'],
    name: 'Бронк Несокрушимый', pronouns: 'он', portrait: window.DH_BRONK_PORTRAIT || '',
    look: { clothes: 'Кожаный жилет, кушак бойца, бинты на руках', eyes: 'Тёмные, с хитринкой', body: 'Широкие плечи, сломанный нос', skin: 'Серо-зелёная', manner: 'Улыбается так, будто на него смотрит вся арена' },
    connections: 'Проклинает «самодовольных приключенцев», которые открыли тюрьму Аликсиана. Не знает, кто это был.',
    notes: 'Вечный второй арены Маркета. Титульный бой сорвался в день, когда Аликсиан разнёс арену. Везёт с собой афишу несостоявшегося поединка. Плывёт в Рутвен начать заново и уверен, что там его встретят как звезду.\nПредставляется полным титулом. Считает аплодисменты. «Если б не те идиоты с ключом…»',
  }));
}
function blank() {
  return {
    v: 1, view: 'build', step: 0,
    classId: null, subclassId: null, ancestryId: null, mixed: false, ancestry2Id: null, communityId: null,
    traits: { agi: null, str: null, fin: null, ins: null, pre: null, kno: null },
    primary: null, secondary: null, armor: null, wheelchair: false, potion: 'minor-health-potion', classItem: '',
    experiences: [{ name: '', mod: 2 }, { name: '', mod: 2 }], clankExp: 0,
    cards: [], vault: [],
    name: '', pronouns: '', portrait: '', look: { clothes: '', eyes: '', body: '', skin: '', manner: '' },
    answers: {}, connections: '', notes: '',
    level: 1, adj: { hp: 0, stress: 0, eva: 0, armor: 0, prof: 0 },
    play: { hp: 0, stress: 0, hope: 2, armor: 0, gold: { h: 1, b: 0, c: 0 }, extra: [], inv: '', log: [], fx: {}, uses: {}, massiveRule: false, unstoppable: 0, impenUsed: false },
    filters: { wTrait: 'best', wShowAll: false },
  };
}
function merge(o) {
  const b = blank();
  const m = Object.assign(b, o || {});
  for (const k of ['traits', 'look', 'adj', 'filters']) m[k] = Object.assign(blank()[k], (o || {})[k] || {});
  m.play = Object.assign(blank().play, (o || {}).play || {});
  m.play.gold = Object.assign(blank().play.gold, ((o || {}).play || {}).gold || {});
  m.play.fx = Object.assign({}, ((o || {}).play || {}).fx || {});
  m.play.uses = Object.assign({}, ((o || {}).play || {}).uses || {});
  for (const k of ['experiences', 'cards', 'vault']) if (!Array.isArray(m[k])) m[k] = blank()[k];
  for (const k of ['extra', 'log']) if (!Array.isArray(m.play[k])) m.play[k] = [];
  return m;
}
let C;
try { C = merge(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { C = blank(); }
let saveTimer;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) {} }, 150); }

/* ---------- утилиты ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
const num = (v) => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
const strip = (h) => String(h || '').replace(/<[^>]+>/g, '');
function d(n) { const a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + (a[0] % n); }
const feat = (f, src) => `<div class="feat">${src ? `<span class="feat-src">${esc(src)}</span>` : ''}<span class="feat-name">${esc(f.name)}</span><div class="rich">${f.text}</div></div>`;
const ICONS = window.DH_ICONS || {};
const SITE = 'https://ru.daggerheart.su';
function ico(key, color, size = '') {
  const ds = ICONS[key]; if (!ds) return '';
  return `<span class="ico ${size}" style="--c:var(--dm-${color || 'none'}, var(--accent))" aria-hidden="true"><svg viewBox="0 0 512 512">${ds.map((d0) => `<path d="${d0}"/>`).join('')}</svg></span>`;
}
const W_RULES = [[/wheelchair/, 'w-chair'], [/tower shield|braveshield/, 'w-tower'], [/shield|buckler/, 'w-shield'], [/crossbow/, 'w-crossbow'], [/bow/, 'w-bow'],
  [/whip|ropeblade/, 'w-whip'], [/grappler/, 'w-grapple'], [/knuckle|talon|claws/, 'w-knuckle'], [/gauntlet|gloves/, 'w-fist'], [/dagger|anlace/, 'w-dagger'],
  [/flail/, 'w-flail'], [/scythe/, 'w-scythe'], [/halberd|polearm/, 'w-polearm'], [/spear/, 'w-spear'], [/hammer|sledge/, 'w-hammer'], [/mace/, 'w-mace'],
  [/axe|labrys/, 'w-axe'], [/staff/, 'w-staff'], [/wand|scepter/, 'w-wand'], [/rune/, 'w-rune'], [/ring|orb|pendant|shard/, 'w-orb'], [/sling/, 'w-sling'],
  [/revolver|rifle|cannon|blunderbuss/, 'w-gun'], [/./, 'w-sword']];
const wIcon = (w) => ico((W_RULES.find(([re]) => re.test((w.en || '').toLowerCase())) || [0, 'w-sword'])[1], w.magic ? 'arcana' : 'blade');
const aIcon = (a) => { const e = (a.en || '').toLowerCase(); return ico(/leather/.test(e) ? 'a-leather' : /gambeson/.test(e) ? 'a-gambeson' : /chain/.test(e) ? 'a-chain' : /plate/.test(e) ? 'a-plate' : 'a-other', 'valor'); };
const iIcon = (i, size = 'sm') => ico(i.kind === 'consumable' ? 'i-potion' : 'i-item', i.kind === 'consumable' ? 'sage' : 'bone', size);
const clsIcon = (c, size) => ico('cls-' + c.id, c.domains[0], size);
const dmIcon = (dm, size = 'sm') => ico('dm-' + dm, dm, size);
const site = (path, label = 'На сайте') => `<a class="site" href="${SITE}${path}" target="_blank" rel="noopener">${label} ↗</a>`;
const portraitHTML = (size = '') => C.portrait ? `<img class="portrait ${size}" src="${C.portrait}" alt="Портрет персонажа">` : '';
const term = (id, text) => `<span class="term" data-rule="${id}">${text}</span>`;

/* Числовые модификаторы из свойств брони и оружия: «+1 к Показателю Брони», «−1 к Уклонению» и т.п. */
function modsOf(features) {
  const out = [];
  for (const f of features || []) {
    const t = strip(f.text);
    const re = /([+−-])\s*(\d+)\s*к\s*(Показател[а-яё]*\s+Брони|Уклонени[а-яё]*|Проворност[а-яё]*|Сил[а-яё]*|Искусност[а-яё]*|Инстинкт[а-яё]*|Влияни[а-яё]*|Знани[а-яё]*|броскам атаки)/gi;
    let m;
    while ((m = re.exec(t))) {
      const v = (m[1] === '+' ? 1 : -1) * num(m[2]);
      const w = m[3].toLowerCase();
      const key = w.startsWith('показат') ? 'armor' : w.startsWith('уклон') ? 'eva' : w.startsWith('провор') ? 'agi' : w.startsWith('сил') ? 'str'
        : w.startsWith('искус') ? 'fin' : w.startsWith('инстин') ? 'ins' : w.startsWith('влиян') ? 'pre' : w.startsWith('знан') ? 'kno' : 'attack';
      out.push({ key, v, src: f.name });
    }
  }
  return out;
}

/* ---------- расчёт персонажа ---------- */
const SUB_TIERS = ['foundation', 'specialization', 'mastery'];
const SUB_TIER_NAME = { foundation: 'Основа', specialization: 'Специализация', mastery: 'Мастерство' };
function derive() {
  const cls = CLS[C.classId] || null;
  const sub = cls ? cls.subclasses.find((s) => s.id === C.subclassId) || null : null;
  const a1 = ANC[C.ancestryId] || null, a2 = C.mixed ? ANC[C.ancestry2Id] || null : null;
  const ancFeats = a1 ? (C.mixed && a2 ? [{ ...a1.features[0], from: a1.name }, { ...a2.features[1], from: a2.name }] : a1.features.map((f) => ({ ...f, from: a1.name }))) : [];
  const has = (name) => ancFeats.some((f) => f.name === name);
  const com = COM[C.communityId] || null;
  const L = Math.max(1, num(C.level));
  const LV = levelState(L);
  const prof = 1 + LV.prof + num(C.adj.prof);
  const pw = WPN[C.primary] || null;
  const sw = pw && pw.burden.startsWith('Двуруч') ? null : WPN[C.secondary] || null;
  const arm = ARM[C.armor] || null;
  const tier = tierOf(L);
  /* активные свойства подкласса: Основа + взятые позже ступени */
  const subTierIdx = Math.max(LV.sub, SUB_TIERS.indexOf(C.subTier || 'foundation'));
  const subFeats = sub ? SUB_TIERS.slice(0, subTierIdx + 1).flatMap((t) => sub[t].map((f) => ({ ...f, tier: t }))) : [];
  const hasSub = (name) => subFeats.some((f) => f.name === name);
  const hand = new Set(C.cards); // работают только карты в Руке
  const inHand = (id) => hand.has(id);
  const armFeat = (name) => !!arm && arm.features.some((f) => f.name.toLowerCase() === name.toLowerCase());
  const bare = !arm && inHand('bare-bones');
  const BARE_THR = [null, [9, 19], [11, 24], [13, 31], [15, 38]][tier];
  const fx = C.play.fx || {};
  const beast = C.play.beast ? D.beastforms.find((b) => b.id === C.play.beast) || null : null;
  const bst = beast ? beastStats(beast) : null;

  const equipMods = [...modsOf(arm?.features).map((m) => ({ ...m, src: (arm?.name || '') + ': ' + m.src })),
    ...[pw, sw].filter(Boolean).flatMap((w) => modsOf(w.features).filter((m) => m.key !== 'attack').map((m) => ({ ...m, src: w.name + ': ' + m.src })))];
  const sumOf = (k) => equipMods.filter((m) => m.key === k).reduce((s, m) => s + m.v, 0);

  const traits = {};
  for (const [k] of TR) {
    const base = C.traits[k];
    const mods = equipMods.filter((m) => m.key === k);
    if (LV.traits[k]) mods.push({ key: k, v: LV.traits[k], src: 'повышения уровня' });
    if (bst && bst.trait === k) mods.push({ key: k, v: bst.traitBonus, src: 'Звериная форма' });
    if (C.play.fx?.tr?.[k]) mods.push({ key: k, v: C.play.fx.tr[k], src: 'зелье до отдыха' });
    if (beast && C.play.evolveTrait === k) mods.push({ key: k, v: 1, src: 'Эволюция' });
    traits[k] = { base, mods, total: base == null ? null : base + mods.reduce((s, m) => s + m.v, 0) };
  }

  const eva = { parts: [] };
  if (cls) eva.parts.push([cls.name, cls.evasion]);
  if (has('Ловкий')) eva.parts.push(['Симиан: Ловкий', 1]);
  if (hasSub('Мимолетная тень')) eva.parts.push(['Тень: Мимолетная тень', 1]);
  if (inHand('untouchable')) { const v = Math.ceil((traits.agi.total ?? 0) / 2); if (v) eva.parts.push(['Карта «Неуловимый»: ½ Проворности', v]); }
  equipMods.filter((m) => m.key === 'eva').forEach((m) => eva.parts.push([m.src, m.v]));
  if (LV.eva) eva.parts.push(['повышения уровня', LV.eva]);
  if (bst && bst.eva) eva.parts.push([`Звериная форма: ${beast.name}`, bst.eva]);
  if (fx.rogueDodge) eva.parts.push(['Уклонение Плута (до попадания или отдыха)', 2]);
  if (C.adj.eva) eva.parts.push(['ручная поправка', num(C.adj.eva)]);
  eva.total = eva.parts.reduce((s, p) => s + p[1], 0);
  const evaCond = [];
  if (hasSub('Призыв щита')) evaCond.push(`+${prof} пока у тебя 2+ Надежды (Школа войны: Призыв щита)`);
  if (hasSub('Связанные битвой')) evaCond.push('+2 против врага рядом с компаньоном');
  if (hasSub('Неуловимый хищник')) evaCond.push('+2 против цели с твоей Меткой');
  if (has('Крылья')) evaCond.push('+2 за Стресс, когда летишь');

  const hp = { parts: [] };
  if (cls) hp.parts.push([cls.name, cls.hp]);
  if (has('Выносливость')) hp.parts.push(['Великан: Выносливость', 1]);
  if (hasSub('Боевой маг')) hp.parts.push(['Школа войны: Боевой маг', 1]);
  if (LV.hp) hp.parts.push(['повышения уровня', LV.hp]);
  if (C.adj.hp) hp.parts.push(['ручная поправка', num(C.adj.hp)]);
  hp.total = Math.min(12, hp.parts.reduce((s, p) => s + p[1], 0));

  const stress = { parts: [['все персонажи', 6]] };
  if (has('Высокая выносливость')) stress.parts.push(['Человек: Высокая выносливость', 1]);
  if (hasSub('Спокойствие')) stress.parts.push(['Мститель: Спокойствие', 1]);
  if (LV.stress) stress.parts.push(['повышения уровня', LV.stress]);
  if (C.adj.stress) stress.parts.push(['ручная поправка', num(C.adj.stress)]);
  stress.total = Math.min(12, stress.parts.reduce((s, p) => s + p[1], 0));

  const ar = { parts: [] };
  if (arm) ar.parts.push([arm.name, arm.score]);
  else if (bare) ar.parts.push(['Ничего лишнего: 3', 3], ['+ Сила', num(traits.str.total)]);
  equipMods.filter((m) => m.key === 'armor').forEach((m) => ar.parts.push([m.src, m.v]));
  if (fx.tava) ar.parts.push(['Доспехи Тавы (Книга Авы)', 1]);
  if (C.adj.armor) ar.parts.push(['ручная поправка', num(C.adj.armor)]);
  ar.total = Math.max(0, Math.min(12, ar.parts.reduce((s, p) => s + p[1], 0)));

  const thr = { parts: [], temp: [] };
  let maj, sev;
  if (arm) { maj = arm.major + L; sev = arm.severe + L; thr.parts.push([arm.name + ' (база)', `${arm.major} / ${arm.severe}`], ['уровень', `+${L}`]); }
  else if (bare) { maj = BARE_THR[0] + L; sev = BARE_THR[1] + L; thr.parts.push([`Ничего лишнего, ранг ${tier} (база)`, `${BARE_THR[0]} / ${BARE_THR[1]}`], ['уровень', `+${L}`]); }
  else { maj = L; sev = 2 * L; thr.parts.push(['без брони: уровень и удвоенный уровень', `${maj} / ${sev}`]); }
  const both = (v, src) => { maj += v; sev += v; thr.parts.push([src, `+${v}`]); };
  if (has('Панцирь')) both(prof, 'Галапа: Панцирь (Мастерство)');
  if (hasSub('Непоколебимый')) both(1, 'Заступник: Непоколебимый');
  if (hasSub('Неумолимый')) both(2, 'Заступник: Неумолимый');
  if (hasSub('Неустрашимый')) both(3, 'Заступник: Неустрашимый');
  if (hasSub('Вознесённый')) { sev += 4; thr.parts.push(['Крылатый страж: Вознесённый (только Тяжёлый)', '+4']); }
  if (arm && inHand('fortified-armor')) both(2, 'Карта «Усиленная броня»');
  /* временные эффекты */
  thr.baseMaj = maj; thr.baseSev = sev;
  const tmp = (v, vs, src) => { maj += v; sev += vs; thr.temp.push([src, v === vs ? `+${v}` : `+${v} / +${vs}`]); };
  if (fx.earth && hasSub('Стихийное воплощение')) tmp(prof, prof, 'Воплощение Земли (Мастерство)');
  if (fx.transcend && hasSub('Трансцендентность')) tmp(0, 4, 'Трансцендентность: +4 к Тяжёлому');
  if (armFeat('Усиленное') && ar.total > 0 && num(C.play.armor) >= ar.total) tmp(2, 2, 'Броня «Усиленное»: все ячейки отмечены');
  if (C.adj.thr) tmp(num(C.adj.thr), num(C.adj.thr), 'ручная поправка');
  thr.maj = maj; thr.sev = sev;

  const spellKey = sub?.spellcast ? SPELL[sub.spellcast] : null;
  const allExps = [...C.experiences, ...LV.newExps.map((n) => ({ name: n, mod: 2, fromLevel: true }))];
  const exps = allExps.map((e, i) => ({ ...e, mod: num(e.mod) + (LV.exps[i] || 0) + (has('Целенаправленный дизайн') && i === num(C.clankExp) ? 1 : 0) }));
  const hopeMax = Math.max(0, 6 - num(C.play.scars) + (C.play.companion?.lightInDark ? 1 : 0));
  const extraCards = sub ? sub.foundation.filter((f) => /дополнительную\s*Карту Домена/i.test(strip(f.text))).length : 0;
  return { LV, beast, bst, hopeMax, bare, cls, sub, subFeats, hasSub, inHand, armFeat, fx, tier, a1, a2, ancFeats, has, com, L, prof, pw, sw, arm, eva, evaCond, hp, stress, ar, thr, traits, spellKey, exps, cardsNeeded: 2 + extraCards, sumOf };
}

/* ---------- шаги ---------- */
const STEPS = [
  { id: 'class', t: 'Класс', done: () => !!C.classId, sub: (x) => x.cls?.name },
  { id: 'subclass', t: 'Подкласс', done: (x) => !!x.sub, sub: (x) => x.sub?.name },
  { id: 'ancestry', t: 'Родословная', done: () => !!C.ancestryId && (!C.mixed || !!C.ancestry2Id), sub: (x) => x.a1 ? (x.a2 ? x.a1.name + ' + ' + x.a2.name : x.a1.name) : '' },
  { id: 'community', t: 'Сообщество', done: () => !!C.communityId, sub: (x) => x.com?.name },
  { id: 'traits', t: 'Характеристики', done: () => poolLeft().length === 0, sub: () => poolLeft().length ? `осталось ${poolLeft().length}` : 'распределены' },
  { id: 'gear', t: 'Снаряжение', done: (x) => !!x.pw && !!C.armor, sub: (x) => x.pw?.name },
  { id: 'exp', t: 'Опыт', done: () => C.experiences.filter((e) => e.name.trim()).length >= 2, sub: () => C.experiences.filter((e) => e.name.trim()).map((e) => e.name).join(', ') },
  { id: 'cards', t: 'Карты домена', done: (x) => C.cards.length + C.vault.length >= x.cardsNeeded, sub: (x) => `${C.cards.length + C.vault.length} из ${x.cardsNeeded}` },
  { id: 'story', t: 'Образ и история', done: () => !!C.name.trim(), sub: () => C.name },
  { id: 'done', t: 'Готово', done: () => STEPS.slice(0, -1).every((s) => s.done(derive())), sub: () => '' },
];
function poolLeft() {
  const left = [...POOL];
  for (const v of Object.values(C.traits)) { if (v == null) continue; const i = left.indexOf(v); if (i >= 0) left.splice(i, 1); }
  return Object.values(C.traits).some((v) => v == null) ? left : [];
}
function poolRemaining() {
  const left = [...POOL];
  for (const v of Object.values(C.traits)) { if (v == null) continue; const i = left.indexOf(v); if (i >= 0) left.splice(i, 1); }
  return left;
}

/* ---------- рендер ---------- */
function render() {
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === C.view)));
  const app = $('#app');
  if (C.view === 'sheet') app.innerHTML = renderSheet();
  else if (C.view === 'ref') app.innerHTML = renderRef();
  else if (C.view === 'notes') app.innerHTML = renderNotes();
  else app.innerHTML = renderBuilder();
  hidePop();
}

function renderBuilder() {
  const x = derive();
  const st = STEPS[C.step] || STEPS[0];
  const rail = STEPS.map((s, i) => `<button class="step-btn ${s.done(x) ? 'done' : ''}" data-step="${i}" ${i === C.step ? 'aria-current="step"' : ''}>
      <span class="n">${s.done(x) && i !== STEPS.length - 1 ? '✓' : i + 1}</span><span>${s.t}<small>${esc(s.sub(x) || '')}</small></span></button>`).join('');
  const body = ({ class: stepClass, subclass: stepSub, ancestry: stepAnc, community: stepCom, traits: stepTraits, gear: stepGear, exp: stepExp, cards: stepCards, story: stepStory, done: stepDone })[st.id](x);
  const guide = GUIDE[st.id] ? `<div class="guide"><h3>Как это влияет на игру</h3><ul>${GUIDE[st.id].map((g) => `<li>${g}</li>`).join('')}</ul></div>` : '';
  const nav = `<div class="navrow"><button data-go="${C.step - 1}" ${C.step === 0 ? 'disabled' : ''}>← Назад</button>${C.step < STEPS.length - 1 ? `<button class="primary" data-go="${C.step + 1}">Дальше: ${STEPS[C.step + 1].t} →</button>` : ''}</div>`;
  return `<div class="builder">
    <nav class="rail" aria-label="Шаги создания">${rail}</nav>
    <section class="stack" aria-labelledby="step-title"><div class="step-head"><span class="lbl">Шаг ${C.step + 1} из ${STEPS.length}</span><h1 id="step-title">${st.t}</h1></div>${guide}${body}${nav}</section>
    <aside class="summary panel" id="summary">${renderSummary(x)}</aside></div>`;
}

function renderSummary(x) {
  const t = (k) => x.traits[k].total == null ? '—' : sign(x.traits[k].total);
  return `<div class="row" style="flex-wrap:nowrap">${C.portrait ? portraitHTML('sm') : x.cls ? clsIcon(x.cls) : ''}<h3>${esc(C.name || 'Безымянный герой')}</h3></div>
    <div class="muted small">${[x.cls?.name, x.sub?.name, x.a1 && (x.a2 ? x.a1.name + '/' + x.a2.name : x.a1.name), x.com?.name].filter(Boolean).map(esc).join(' · ') || 'Начни с выбора класса'}</div>
    <div class="sum-grid">
      <div><b>${x.cls ? x.eva.total : '—'}</b><span class="lbl">${term('evasion', 'Уклонение')}</span></div>
      <div><b>${x.cls ? x.hp.total : '—'}</b><span class="lbl">${term('hit-points', 'Раны')}</span></div>
      <div><b>${x.stress.total}</b><span class="lbl">${term('stress', 'Стресс')}</span></div>
      <div><b>${x.ar.total}</b><span class="lbl">${term('armor-score', 'Броня')}</span></div>
      <div><b>${x.thr.maj}/${x.thr.sev}</b><span class="lbl">${term('damage-threshold', 'Пороги')}</span></div>
      <div><b>2</b><span class="lbl">${term('hope', 'Надежда')}</span></div>
    </div>
    <div class="sum-list">${TR.map(([k, n]) => `<div><span>${n}${x.spellKey === k ? ' ✦' : ''}</span><span class="mono">${t(k)}</span></div>`).join('')}</div>
    ${x.spellKey ? `<div class="muted small">✦ ${term('spellcast-trait', 'Характеристика Заклинателя')}</div>` : ''}
    <div class="sum-list">
      <div><span>Оружие</span><span>${esc([x.pw?.name, x.sw?.name].filter(Boolean).join(' + ') || '—')}</span></div>
      <div><span>Броня</span><span>${esc(x.arm?.name || (C.armor === 'none' ? (x.bare ? 'нет · Ничего лишнего' : 'без брони') : '—'))}</span></div>
      <div><span>${term('experience', 'Опыт')}</span><span>${esc(x.exps.filter((e) => e.name).map((e) => e.name + ' ' + sign(e.mod)).join(', ') || '—')}</span></div>
      <div><span>Карты</span><span>${esc([...C.cards, ...C.vault].map((id) => CARD[id]?.name).filter(Boolean).join(', ') || '—')}</span></div>
    </div>`;
}

/* --- шаг: класс --- */
function stepClass(x) {
  const grid = D.classes.map((c) => `<button class="choice" data-pick="classId" data-val="${c.id}" aria-pressed="${C.classId === c.id}">
      <span class="choice-head">${clsIcon(c)}<h3>${esc(c.name)}</h3></span><span class="tagline">${esc(ROLE[c.id] || strip(c.tagline))}</span>
      <span class="chips">${c.domains.map((dm) => `<span class="chip dm" style="--c:var(--dm-${dm})">${esc(D.domains[dm])}</span>`).join('')}<span class="chip">Уклонение ${c.evasion}</span><span class="chip">Раны ${c.hp}</span></span></button>`).join('');
  let det = '';
  if (x.cls) {
    const c = x.cls;
    det = `<div class="detail"><div class="spread"><span class="choice-head">${clsIcon(c, 'lg')}<h2>${esc(c.name)}</h2></span><span class="row">${site('/class/' + c.id, 'Арт и описание на сайте')}</span></div>
      <div class="rich muted">${c.intro}</div>
      <div class="impact"><div><span class="lbl">Уклонение</span><b>${c.evasion}</b><span class="small muted">База защиты</span></div><div><span class="lbl">Ячейки Ран</span><b>${c.hp}</b><span class="small muted">Сколько ран выдержишь</span></div>
      ${c.domains.map((dm) => `<div><span class="row" style="gap:6px">${dmIcon(dm)}<span class="lbl">${esc(D.domains[dm])}</span></span><span class="small" style="display:block">${DOMAIN_INFO[dm]}</span></div>`).join('')}</div>
      ${c.hopeFeature ? feat(c.hopeFeature, 'Свойство Надежды · 3 Надежды') : ''}
      ${c.features.map((f) => feat(f, 'Свойство класса')).join('')}</div>`;
  }
  const hint = !C.classId ? `<div class="note spread"><span>Хочешь посмотреть, как выглядит готовый персонаж? Загрузи пример и пройдись по шагам.</span><button data-act="sample">Пример: Бронк</button></div>` : '';
  return `${hint}<div class="choices">${grid}</div>${det}`;
}

/* --- шаг: подкласс --- */
function stepSub(x) {
  if (!x.cls) return `<div class="empty">Сначала выбери класс.</div>`;
  return `<div class="optlist">${x.cls.subclasses.map((s) => `<div class="opt sub ${C.subclassId === s.id ? 'on' : ''}">
    <button class="pickbtn" data-pick="subclassId" data-val="${s.id}" aria-pressed="${C.subclassId === s.id}" aria-label="Выбрать ${esc(s.name)}"><span class="radio"></span></button>
    <div class="stack" style="gap:8px"><div class="spread"><button class="linklike choice-head" data-pick="subclassId" data-val="${s.id}">${clsIcon(x.cls, 'sm')}<h3>${esc(s.name)}</h3></button>${s.spellcast ? `<span class="chip accent">Заклинатель: ${esc(TN[SPELL[s.spellcast]])}</span>` : '<span class="chip">без заклинаний</span>'}</div>
    <span class="muted">${esc(s.blurb)}</span>
    ${s.foundation.map((f) => feat(f, 'Основа · с 1 уровня')).join('')}
    <details><summary>Что откроется позже: ${[...s.specialization, ...s.mastery].map((f) => esc(f.name)).join(', ')}</summary><div>
      ${s.specialization.map((f) => feat(f, 'Специализация · обычно с 5 уровня')).join('')}${s.mastery.map((f) => feat(f, 'Мастерство · обычно с 8 уровня')).join('')}
      <span class="small muted">Специализацию и Мастерство берут как улучшение при повышении уровня, когда открывается новый ранг.</span></div></details>
    <span>${site('/subclass/' + s.id)}</span>
    </div></div>`).join('')}</div>`;
}

/* --- шаг: родословная --- */
function stepAnc(x) {
  const card = (a, field) => `<button class="choice" data-pick="${field}" data-val="${a.id}" aria-pressed="${C[field] === a.id}"><span class="choice-head">${ico('anc-' + a.id, 'bone')}<h3>${esc(a.name)}</h3></span>
    <span class="tagline rich">${a.prelude}</span>${a.features.map((f, i) => `<span class="small"><b>${i + 1}. ${esc(f.name)}</b></span>`).join('')}${effectChips(a.features)}</button>`;
  const mix = `<label class="row"><input type="checkbox" id="mixed" data-toggle="mixed" ${C.mixed ? 'checked' : ''}> Смешанная родословная: первое свойство одной, второе другой</label>`;
  let det = '';
  if (x.a1) det = `<div class="detail"><div class="spread"><span class="choice-head">${ico('anc-' + x.a1.id, 'bone', 'lg')}${x.a2 ? ico('anc-' + x.a2.id, 'bone', 'lg') : ''}<h2>${esc(x.a2 ? x.a1.name + ' + ' + x.a2.name : x.a1.name)}</h2></span><span class="row">${site('/ancestry/' + x.a1.id, 'Арт на сайте')}${x.a2 ? site('/ancestry/' + x.a2.id, x.a2.name) : ''}</span></div>${x.ancFeats.map((f) => feat(f, (C.mixed ? 'от: ' + f.from : 'Свойство родословной'))).join('')}</div>`;
  return `${mix}${C.mixed ? '<h3>Первое свойство берём у…</h3>' : ''}<div class="choices">${D.ancestries.map((a) => card(a, 'ancestryId')).join('')}</div>
    ${C.mixed ? `<h3>Второе свойство берём у…</h3><div class="choices">${D.ancestries.map((a) => card(a, 'ancestry2Id')).join('')}</div>` : ''}${det}`;
}
function effectChips(fs) {
  const names = fs.map((f) => f.name);
  const e = [];
  if (names.includes('Выносливость')) e.push('+1 Рана');
  if (names.includes('Высокая выносливость')) e.push('+1 Стресс');
  if (names.includes('Ловкий')) e.push('+1 Уклонение');
  if (names.includes('Панцирь')) e.push('пороги +Мастерство');
  if (names.includes('Целенаправленный дизайн')) e.push('+1 к Опыту');
  return e.length ? `<span class="chips">${e.map((t) => `<span class="chip ok">${t}</span>`).join('')}</span>` : '';
}

/* --- шаг: сообщество --- */
function stepCom(x) {
  return `<div class="choices">${D.communities.map((c) => `<button class="choice" data-pick="communityId" data-val="${c.id}" aria-pressed="${C.communityId === c.id}"><span class="choice-head">${ico('com-' + c.id, 'sage')}<h3>${esc(c.name)}</h3></span>
    <span class="tagline rich">${c.prelude}</span>${c.features.map((f) => `<span class="small"><b>${esc(f.name)}</b></span>`).join('')}</button>`).join('')}</div>
    ${x.com ? `<div class="detail"><div class="spread"><span class="choice-head">${ico('com-' + x.com.id, 'sage', 'lg')}<h2>${esc(x.com.name)}</h2></span>${site('/community/' + x.com.id, 'Арт на сайте')}</div>${x.com.features.map((f) => feat(f, 'Свойство сообщества')).join('')}</div>` : ''}`;
}

/* --- шаг: характеристики --- */
function stepTraits(x) {
  const left = poolRemaining();
  const key = new Set();
  if (x.spellKey) key.add(x.spellKey);
  if (x.pw && SPELL_TRAIT(x.pw.trait, x)) key.add(SPELL_TRAIT(x.pw.trait, x));
  const rows = TR.map(([k, n, h]) => {
    const cur = C.traits[k];
    const opts = [2, 1, 0, -1].map((v) => {
      const avail = left.includes(v) || cur === v;
      return `<button data-trait="${k}" data-v="${v}" aria-pressed="${cur === v}" ${avail ? '' : 'disabled'}>${sign(v)}</button>`;
    }).join('');
    const why = [];
    if (x.spellKey === k) why.push('Заклинатель');
    if (x.pw && SPELL_TRAIT(x.pw.trait, x) === k) why.push('твоё оружие');
    const mods = x.traits[k].mods.map((m) => `${m.src} ${sign(m.v)}`).join(', ');
    return `<div class="trait-row ${key.has(k) ? 'key' : ''}"><div><b>${term(TR.find((t) => t[0] === k)[3], n)}</b>${why.length ? ` <span class="chip accent">${why.join(', ')}</span>` : ''}<div class="small muted">${h}</div>${mods ? `<div class="small" style="color:var(--danger)">${esc(mods)}</div>` : ''}</div>
      <div class="vals">${opts}</div><button class="ghost" data-trait="${k}" data-v="clear" aria-label="Сбросить ${n}">✕</button></div>`;
  }).join('');
  const lay = x.cls ? LAYOUT[x.cls.id] : null;
  return `<div class="spread"><div class="row"><span class="lbl">Осталось распределить</span><span class="pool">${POOL.map((v, i) => `<span class="${isUsed(v, i) ? 'used' : ''}">${sign(v)}</span>`).join('')}</span></div>
    <div class="row">${lay ? `<button data-layout="1">Типичная раскладка для класса ${esc(x.cls.name)}</button>` : ''}<button class="ghost" data-layout="clear">Сбросить всё</button></div></div>
    ${lay ? `<div class="muted small">Типичная раскладка — подсказка конструктора, не официальная таблица: ${TR.map(([k, n]) => `${n} ${sign(lay[k])}`).join(', ')}.</div>` : ''}
    <div class="trait-rows">${rows}</div>`;
}
function isUsed(v, i) {
  // помечаем использованные значения пула слева направо
  const used = Object.values(C.traits).filter((t) => t != null);
  const sameBefore = POOL.slice(0, i).filter((p) => p === v).length;
  return used.filter((u) => u === v).length > sameBefore;
}
function SPELL_TRAIT(t, x) { return t === 'spell' ? x.spellKey : t; }

/* --- шаг: снаряжение --- */
function stepGear(x) {
  const f = C.filters;
  const best = TR.map((t) => t[0]).filter((k) => C.traits[k] != null).sort((a, b) => C.traits[b] - C.traits[a]);
  const topVal = best.length ? C.traits[best[0]] : null;
  const maxT = x.tier, gt = f.gTier && num(f.gTier) <= maxT ? num(f.gTier) : 0;
  const tierOk = (it) => it.tier <= maxT && (!gt || it.tier === gt);
  const prim = D.weapons.filter((w) => tierOk(w) && w.slot === 'primary' && (C.wheelchair ? w.wheelchair : !w.wheelchair)).sort((a, b) => b.tier - a.tier);
  const trFilter = (w) => {
    const tk = SPELL_TRAIT(w.trait, x);
    if (f.wTrait === 'all') return true;
    if (f.wTrait === 'best') return topVal == null || (tk && C.traits[tk] != null && C.traits[tk] >= Math.min(1, topVal));
    return tk === f.wTrait;
  };
  const wRow = (w, field) => {
    const tk = SPELL_TRAIT(w.trait, x);
    const tv = tk ? x.traits[tk].total : null;
    const warn = w.magic && !x.spellKey;
    const atk = modsOf(w.features).filter((m) => m.key === 'attack').reduce((s, m) => s + m.v, 0);
    return `<button class="opt" data-pick="${field}" data-val="${w.id}" aria-pressed="${C[field] === w.id}"><span class="radio"></span><span class="stack" style="gap:4px">
      <span class="spread"><span class="row" style="gap:8px">${wIcon(w)}<b>${esc(w.name)}</b></span><span class="chips">${w.magic ? `<span class="chip ${warn ? 'warn' : 'accent'}">магическое</span>` : '<span class="chip">физическое</span>'}<span class="chip">${esc(w.burden)}</span>${maxT > 1 ? `<span class="chip">ранг ${w.tier}</span>` : ''}</span></span>
      <span class="stats"><span>Характеристика <b>${w.trait === 'spell' ? 'Заклинателя' : esc(TN[w.trait] || w.trait)}${tv != null ? ' (' + sign(tv) + ')' : ''}</b></span><span>Дистанция <b>${esc(w.range)}</b></span><span>Урон <b>${x.prof}${esc(w.die)}${w.bonus ? '+' + w.bonus : ''}</b></span>${atk ? `<span>Атака <b>${sign(atk)}</b></span>` : ''}</span>
      ${w.features.map((ft) => `<span class="small">${ft.name ? `<b>${esc(ft.name)}:</b> ` : ''}${ft.text}</span>`).join('')}
      ${warn ? '<span class="small" style="color:var(--danger)">Магическим оружием по правилам пользуются персонажи с Характеристикой Заклинателя. У твоего подкласса её нет, уточни у Мастера.</span>' : ''}
    </span></button>`;
  };
  const twoH = x.pw && x.pw.burden.startsWith('Двуруч');
  const secs = D.weapons.filter((w) => tierOk(w) && w.slot === 'secondary').sort((a, b) => b.tier - a.tier);
  const arms = D.armor.filter(tierOk).sort((a, b) => b.tier - a.tier);
  const traitOpts = `<option value="best" ${f.wTrait === 'best' ? 'selected' : ''}>под мои лучшие характеристики</option><option value="all" ${f.wTrait === 'all' ? 'selected' : ''}>всё оружие</option>` + TR.map(([k, n]) => `<option value="${k}" ${f.wTrait === k ? 'selected' : ''}>${n}</option>`).join('');
  const L = x.L;
  const armRow = (a) => {
    const mods = modsOf(a.features);
    const ev = x.cls ? x.cls.evasion + (x.has('Ловкий') ? 1 : 0) + mods.filter((m) => m.key === 'eva').reduce((s, m) => s + m.v, 0) : null;
    return `<button class="opt" data-pick="armor" data-val="${a.id}" aria-pressed="${C.armor === a.id}"><span class="radio"></span><span class="stack" style="gap:4px">
      <span class="row" style="gap:8px">${aIcon(a)}<b>${esc(a.name)}</b>${maxT > 1 ? `<span class="chip">ранг ${a.tier}</span>` : ''}</span>
      <span class="stats"><span>Пороги <b>${a.major + L} / ${a.severe + L}</b></span><span>Броня <b>${a.score}</b></span>${ev != null ? `<span>Уклонение станет <b>${ev}</b></span>` : ''}</span>
      ${a.features.map((ft) => `<span class="small"><b>${esc(ft.name)}:</b> ${ft.text}</span>`).join('')}
      <span class="small muted">Удар до ${a.major + L - 1} снимет 1 Рану, ${a.major + L}–${a.severe + L - 1} две, от ${a.severe + L} три.</span></span></button>`;
  };
  const items = x.cls?.items || [];
  const tierBar = maxT > 1 ? `<div class="note">Ты на ${x.L} уровне (ранг ${maxT}): можно носить снаряжение ${maxT === 1 ? '1 ранга' : `рангов 1–${maxT}`}. Снаряжение выше 1 ранга обычно находят или покупают в игре, так что бери то, что у тебя реально есть. Ранг снаряжения выше твоего надеть нельзя.
      <div class="row small" style="margin-top:6px">Показать ранг <select id="gTier" data-filter="gTier"><option value="0">все доступные</option>${Array.from({ length: maxT }, (_, i) => `<option value="${i + 1}" ${gt === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div></div>` : '';
  return `${tierBar}<h2>Основное оружие</h2>
    <div class="filters"><label class="row small">Показать <select id="wTrait" data-filter="wTrait">${traitOpts}</select></label>
      <label class="row small"><input type="checkbox" data-toggle="wheelchair" ${C.wheelchair ? 'checked' : ''}> боевая коляска вместо оружия</label></div>
    <div class="optlist">${prim.filter(trFilter).map((w) => wRow(w, 'primary')).join('') || '<div class="empty">Под этот фильтр ничего нет.</div>'}</div>
    <h2>Вспомогательное оружие</h2>
    ${twoH ? '<div class="note">Основное оружие двуручное, вспомогательное взять нельзя.</div>' : `<div class="optlist"><button class="opt" data-pick="secondary" data-val="" aria-pressed="${!C.secondary}"><span class="radio"></span><span>Без вспомогательного оружия</span></button>${secs.map((w) => wRow(w, 'secondary')).join('')}</div>`}
    <h2>Броня</h2><div class="optlist">${noArmorRow(x)}${arms.map(armRow).join('')}</div>
    <h2>Стартовые вещи</h2>
    <div class="note">Есть у всех: факел, верёвка (15 м), базовые припасы, горсть золота.</div>
    <div class="optlist">${['minor-health-potion', 'minor-stamina-potion'].map((id) => `<button class="opt" data-pick="potion" data-val="${id}" aria-pressed="${C.potion === id}"><span class="radio"></span><span class="row" style="gap:8px;flex-wrap:nowrap">${iIcon(ITEM[id], '')}<span><b>${esc(ITEM[id].name)}</b><span class="rich small">${ITEM[id].text}</span></span></span></button>`).join('')}</div>
    ${items.length ? `<h3>Классовый предмет</h3><div class="optlist">${items.map((it) => `<button class="opt" data-pick="classItem" data-val="${esc(strip(it))}" aria-pressed="${C.classItem === strip(it)}"><span class="radio"></span><span class="rich">${it}</span></button>`).join('')}</div>` : ''}`;
}

function noArmorRow(x) {
  const L = x.L, hasBare = [...C.cards].includes('bare-bones');
  const T = [null, [9, 19], [11, 24], [13, 31], [15, 38]][tierOf(L)];
  const str = num(C.traits.str);
  const ev = x.cls ? x.cls.evasion + (x.has('Ловкий') ? 1 : 0) : null;
  const maj = hasBare ? T[0] + L : L, sev = hasBare ? T[1] + L : 2 * L, sc = hasBare ? 3 + str : 0;
  const bareOk = x.cls && x.cls.domains.includes('valor');
  return `<button class="opt" data-pick="armor" data-val="none" aria-pressed="${C.armor === 'none'}"><span class="radio"></span><span class="stack" style="gap:4px">
    <span class="row" style="gap:8px">${ico('ui-portrait', 'none')}<b>Без брони</b>${hasBare ? '<span class="chip ok">с картой «Ничего лишнего»</span>' : ''}</span>
    <span class="stats"><span>Пороги <b>${maj} / ${sev}</b></span><span>Броня <b>${sc}</b></span>${ev != null ? `<span>Уклонение <b>${ev}</b></span>` : ''}</span>
    <span class="small muted">${hasBare ? `Карта «Ничего лишнего»: Показатель Брони 3 + Сила (${sign(str)}), базовые пороги ранга ${tierOf(L)} ${T[0]}/${T[1]}, плюс уровень.`
      : `По правилам без брони Показатель Брони 0, Ощутимый порог равен уровню, Тяжёлый — удвоенному уровню. ${bareOk ? 'Твой класс может взять карту Доблести «Ничего лишнего»: без брони она даёт Броню 3 + Сила и пороги 9/19 на 1 ранге. Возьми её на шаге «Карты домена», и цифры здесь пересчитаются.' : 'Карта «Ничего лишнего» из домена Доблесть делает этот вариант сильным, но она доступна только классам с Доблестью или через мультикласс.'}`}</span>
    <span class="small muted">Удар до ${maj - 1} снимет 1 Рану, ${maj}–${sev - 1} две, от ${sev} три.</span></span></button>`;
}

/* --- шаг: опыт --- */
function stepExp(x) {
  const clank = x.has('Целенаправленный дизайн');
  return `<div class="stack">${C.experiences.map((e, i) => `<div class="row" style="flex-wrap:nowrap"><input id="exp-${i}" data-bind="experiences.${i}.name" value="${esc(e.name)}" placeholder="Опыт ${i + 1}" maxlength="60"><span class="chip accent mono">${sign(x.exps[i].mod)}</span>
      ${clank ? `<label class="row small" style="flex-wrap:nowrap"><input type="radio" name="clank" data-clank="${i}" ${num(C.clankExp) === i ? 'checked' : ''}> Кланк +1</label>` : ''}</div>`).join('')}</div>
    <details open><summary>Примеры для вдохновения</summary><div>${EXP_EXAMPLES.map(([k, v]) => `<div><span class="lbl">${k}</span><div class="small">${v.split(' · ').map((s) => `<button class="ghost" data-exp-example="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`).join('')}<div class="muted small">Нажми на пример, чтобы вписать его в первое пустое поле.</div></div></details>`;
}

/* --- шаг: карты --- */
function stepCards(x) {
  if (!x.cls) return `<div class="empty">Сначала выбери класс.</div>`;
  const chosen = [...C.cards, ...C.vault];
  const need = x.cardsNeeded;
  const cols = x.cls.domains.map((dm) => {
    const list = D.cards.filter((c) => c.domain === dm && c.level <= x.L).sort((a, b) => a.level - b.level);
    return `<div class="stack domain-col"><h3>${dmIcon(dm, '')}${esc(D.domains[dm])} <span class="chip">${DOMAIN_INFO[dm]}</span></h3>
      ${list.map((c) => {
        const on = chosen.includes(c.id);
        const full = !on && chosen.length >= need;
        return `<button class="opt check" data-card="${c.id}" aria-pressed="${on}" ${full ? 'disabled' : ''}><span class="radio"></span><span class="stack" style="gap:4px">
          <span class="spread"><b>${esc(c.name)}</b><span class="chips"><span class="chip">${esc(c.type)}</span><span class="chip">ур. ${c.level}</span><span class="chip" title="Стоимость Призыва">Призыв ${c.recall}</span></span></span>
          <span class="rich small">${c.text}</span>${c.id === 'bare-bones' ? `<span class="small ${C.armor === 'none' ? '' : 'muted'}" style="${C.armor === 'none' ? 'color:var(--ok)' : ''}">${C.armor === 'none' ? 'Ты без брони: конструктор пересчитает Броню и пороги по этой карте.' : 'Работает, только если на шаге «Снаряжение» выбрать «Без брони».'}</span>` : ''}<span>${site('/domain-card/' + c.id, 'Карта на сайте')}</span>${c.type === 'Заклинание' && !x.spellKey ? '<span class="small" style="color:var(--danger)">Нужен Бросок Заклинания, а у подкласса нет Характеристики Заклинателя.</span>' : ''}</span></button>`;
      }).join('')}</div>`;
  }).join('');
  return `<div class="spread"><b>Выбрано ${chosen.length} из ${need}</b>${need > 2 ? '<span class="chip ok">подкласс даёт дополнительную карту</span>' : ''}</div>
    <div class="stack">${cols}</div>`;
}

/* --- шаг: образ --- */
function stepStory(x) {
  const look = [['clothes', 'Одежда'], ['eyes', 'Глаза'], ['body', 'Телосложение'], ['skin', 'Кожа, шерсть, чешуя'], ['manner', 'Манера держаться']];
  const qs = x.cls?.questions || [];
  return `<div class="panel"><div class="row" style="align-items:flex-start">${C.portrait ? portraitHTML('lg') : `<div class="portrait lg empty-portrait">${ico('ui-portrait', 'none', 'lg')}</div>`}
      <div class="stack" style="gap:6px;flex:1;min-width:200px"><span class="lbl">Портрет</span><span class="small muted">Своя картинка: нарисованная, сгенерированная или любая другая. Хранится только в этом браузере и в коде персонажа.</span>
      <span class="row"><label class="btnlike">Загрузить картинку<input type="file" id="portrait-file" accept="image/*" hidden></label>${C.portrait ? '<button class="ghost danger" data-act="portrait-clear">Убрать</button>' : ''}</span><span class="err" id="portrait-err"></span></div></div>
      <div class="impact" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
      <label class="stack" style="gap:3px"><span class="lbl">Имя</span><input id="nm" data-bind="name" value="${esc(C.name)}"></label>
      <label class="stack" style="gap:3px"><span class="lbl">Местоимения</span><input id="pr" data-bind="pronouns" value="${esc(C.pronouns)}"></label></div>
      <div class="impact" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${look.map(([k, n]) => `<label class="stack" style="gap:3px"><span class="lbl">${n}</span><input id="lk-${k}" data-bind="look.${k}" value="${esc(C.look[k])}"></label>`).join('')}</div></div>
    <h2>Вопросы предыстории</h2>
    ${qs.length ? qs.map((q, i) => `<label class="stack" style="gap:4px"><span class="rich">${q}</span><textarea id="q-${i}" data-bind="answers.${i}">${esc(C.answers[i] || '')}</textarea></label>`).join('') : '<div class="empty">Вопросы появятся после выбора класса.</div>'}
    <h2>Связи</h2>
    ${x.cls?.connections?.length ? `<div class="note"><span class="lbl">Спроси других игроков</span><ul style="margin:4px 0 0;padding-left:20px">${x.cls.connections.map((q) => `<li class="rich">${q}</li>`).join('')}</ul></div>` : ''}
    <textarea id="conn" data-bind="connections" placeholder="Что ответили другие игроки">${esc(C.connections)}</textarea>
    <h2>Заметки</h2><textarea id="notes" data-bind="notes">${esc(C.notes)}</textarea>`;
}

/* --- шаг: итог --- */
function stepDone(x) {
  const checks = STEPS.slice(0, -1).map((s, i) => `<div class="spread"><span>${s.done(x) ? '✓' : '○'} ${s.t}</span>${s.done(x) ? `<span class="muted small">${esc(s.sub(x) || '')}</span>` : `<button data-go="${i}">Заполнить</button>`}</div>`).join('');
  return `<div class="panel">${checks}</div>
    <div class="row"><button class="primary" data-view="sheet">Открыть игровой лист</button></div>
    ${renderSave()}`;
}

/* ---------- игровой лист ---------- */
function renderSheet() {
  const x = derive();
  if (!x.cls) return `<div class="empty">Персонаж ещё не создан. <button data-view="build">К созданию</button></div>`;
  const P = C.play;
  P.hp = Math.min(P.hp, x.hp.total); P.stress = Math.min(P.stress, x.stress.total); P.armor = Math.min(P.armor, x.ar.total); P.hope = Math.min(P.hope, x.hopeMax);
  const breakdown = (o) => o.parts.map((p) => `${esc(p[0])} ${typeof p[1] === 'number' ? sign(p[1]) : esc(p[1])}`).join(' · ');
  const traits = TR.map(([k, n, h, rid]) => `<button class="tcell" data-roll="${k}"><span class="nm">${n}${x.spellKey === k ? ' ✦' : ''}</span><span class="v">${x.traits[k].total == null ? '—' : sign(x.traits[k].total)}</span><span class="hint">${h}</span></button>`).join('');
  const track = (k, max, cls, label, rid) => {
    let h = '';
    for (let i = 0; i < max; i++) h += `<button class="box ${cls} ${i < P[k] ? 'on' : ''}" data-box="${k}" data-i="${i}" aria-label="${label} ${i + 1}"></button>`;
    return `<div class="track"><div class="spread"><span class="lbl">${term(rid, label)}</span><span class="mono small muted">${P[k]} / ${max}</span></div><div class="boxes">${h || '<span class="muted small">нет</span>'}</div></div>`;
  };
  const weapons = [x.pw, x.sw].filter(Boolean).map((w, i) => {
    const tk = SPELL_TRAIT(w.trait, x);
    const atk = modsOf(w.features).filter((m) => m.key === 'attack').reduce((s, m) => s + m.v, 0);
    return `<div class="wcard"><div class="spread"><span class="row" style="gap:8px">${wIcon(w)}<b>${esc(w.name)}</b></span><span class="row"><button data-atk="${w.id}">Атака</button><button data-dmg="${w.id}">Урон</button><button data-dmg="${w.id}" data-crit="1">Крит</button></span></div>
      <div class="small muted">${i === 0 ? 'Основное' : 'Вспомогательное'} · ${tk ? TN[tk] + ' ' + sign(x.traits[tk].total ?? 0) : 'Заклинатель'}${atk ? ' · атака ' + sign(atk) : ''} · ${esc(w.range)} · ${x.prof}${esc(w.die)}${w.bonus ? '+' + w.bonus : ''}${isWarrior(x) && !w.magic ? '+' + x.L : ''} ${w.magic ? 'маг.' : 'физ.'} · ${esc(w.burden)}</div>
      ${w.features.map((f) => `<div class="small">${f.name ? `<b>${esc(f.name)}:</b> ` : ''}${f.text}</div>`).join('')}</div>`;
  }).join('');
  const handCards = C.cards.map((id) => CARD[id]).filter(Boolean), vaultCards = C.vault.map((id) => CARD[id]).filter(Boolean);
  const dcard = (c, inHand) => `<div class="dcard ${inHand ? '' : 'vault'}" style="--c:var(--dm-${c.domain})"><div class="spread"><span class="row" style="gap:8px">${dmIcon(c.domain)}<b>${esc(c.name)}</b></span><span class="chips"><span class="chip">${esc(D.domains[c.domain])}</span><span class="chip">${esc(c.type)}</span><span class="chip">ур. ${c.level}</span><span class="chip">Призыв ${c.recall}</span></span></div>
    <div class="rich small">${c.text}</div>${inHand ? featUseHTML({ name: c.name, text: c.text }, 'card') : ''}<div class="row">${inHand ? `<button class="ghost" data-tovault="${c.id}">В Хранилище</button>` : `<button data-tohand="${c.id}" ${handCards.length >= 5 ? 'disabled' : ''}>В Руку (отметить ${c.recall} Стресса)</button><button class="ghost" data-tohand="${c.id}" data-free="1" ${handCards.length >= 5 ? 'disabled' : ''}>В Руку на отдыхе</button>`}<button class="ghost danger" data-dropcard="${c.id}">Убрать</button>${site('/domain-card/' + c.id)}</div></div>`;
  const addable = D.cards.filter((c) => x.cls.domains.includes(c.domain) && c.level <= x.L && !C.cards.includes(c.id) && !C.vault.includes(c.id));
  const feats = allActiveFeats(x).filter((a) => a.src !== 'card').map((a) => feat(a.f, a.label) + featUseHTML(a.f, a.src)).join('');
  const startInv = ['Факел', 'Верёвка (15 м)', 'Базовые припасы', ITEM[C.potion]?.name, C.classItem].filter(Boolean);
  const extra = P.extra.map((e, i) => { const it = ITEM[e.id]; return it ? `<div class="spread small"><span class="row" style="gap:6px;flex-wrap:nowrap">${iIcon(it)}<span><b>${esc(it.name)}</b> <span class="rich muted">${strip(it.text).slice(0, 120)}</span></span></span><span class="row">${it.kind === 'consumable' ? `<button class="small" data-consume="${i}">Использовать</button>` : ''}<input type="number" min="0" max="${it.kind === 'consumable' ? 5 : 99}" data-extra="${i}" value="${num(e.n)}" style="width:64px" aria-label="Количество"><button class="ghost danger" data-dropitem="${i}">✕</button></span></div>` : ''; }).join('');
  const bfs = x.cls.id === 'druid' ? D.beastforms.filter((b) => b.tier <= tierOf(x.L)) : [];
  return `<div class="sheet">
  <div class="stack">
    <section class="panel ident"><div class="ident-top">${C.portrait ? portraitHTML('xl') : clsIcon(x.cls, 'lg')}<div class="stack" style="gap:6px"><h1>${esc(C.name || 'Безымянный герой')}</h1>
      <div class="meta">${[C.pronouns, x.cls.name, x.sub?.name, x.a2 ? x.a1.name + '/' + x.a2.name : x.a1?.name, x.com?.name].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="row small"><span>Уровень <b class="mono">${x.L}</b></span><span class="muted">${term('tiers-of-play', 'Ранг')} ${tierOf(x.L)}</span><label class="row">${term('proficiency', 'Мастерство')} <b class="mono">${x.prof}</b></label><button class="ghost" data-view="build">Изменить в создании</button></div></div></div></section>
    <section class="panel"><h2>Характеристики <span class="lbl">клик — бросок</span></h2><div class="traits6">${traits}</div></section>
    <section class="panel"><h2>Защита</h2>
      <div class="defs"><div><span class="lbl">${term('evasion', 'Уклонение')}</span><b>${x.eva.total}</b></div><div><span class="lbl">${term('armor-score', 'Показатель Брони')}</span><b>${x.ar.total}</b></div><div><span class="lbl">${term('hope', 'Надежда')}</span><b>${P.hope}</b></div></div>
      ${x.evaCond.length ? `<div class="small"><span class="lbl">Уклонение в особых случаях</span>${x.evaCond.map((t) => `<div>· ${esc(t)}</div>`).join('')}</div>` : ''}
      <div class="thresh"><div><b>1</b><span class="small muted">${term('minor-damage', 'Лёгкий')}</span></div><div class="cut">${x.thr.maj}<span>ощутимый</span></div><div><b>2</b><span class="small muted">${term('major-damage', 'Ощутимый')}</span></div><div class="cut">${x.thr.sev}<span>тяжёлый</span></div><div><b>3</b><span class="small muted">${term('severe-damage', 'Тяжёлый')}</span></div></div>
      <details><summary>Откуда эти цифры</summary><div class="small"><div><b>Уклонение:</b> ${breakdown(x.eva)}</div><div><b>Раны:</b> ${breakdown(x.hp)}</div><div><b>Стресс:</b> ${breakdown(x.stress)}</div><div><b>Броня:</b> ${breakdown(x.ar) || '—'}</div><div><b>Пороги:</b> ${breakdown(x.thr)}</div></div></details>
    </section>
    <section class="panel"><h2>Состояние</h2>${track('hp', x.hp.total, 'hp', 'Раны', 'hit-points')}${track('stress', x.stress.total, 'stress', 'Стресс', 'stress')}${track('armor', x.ar.total, 'armor', 'Ячейки Брони', 'armor-slot')}${track('hope', x.hopeMax, 'hope', 'Надежда', 'hope')}${num(C.play.scars) ? `<div class="small muted">${term('scar', 'Шрамы')}: ${num(C.play.scars)} (ячейки Надежды зачёркнуты)</div>` : ''}
      ${deathHTML(x)}${condHTML(x)}</section>
    ${mechanicsHTML(x)}
    ${hitPanelHTML(x)}
    ${restHTML(x)}
    <section class="panel"><h2>Золото и вещи</h2>
      <div class="gold"><label><span class="lbl">Горсти</span><input type="number" min="0" id="g-h" data-bind="play.gold.h" data-num="1" value="${P.gold.h}"></label><label><span class="lbl">Мешки</span><input type="number" min="0" id="g-b" data-bind="play.gold.b" data-num="1" value="${P.gold.b}"></label><label><span class="lbl">Сундуки</span><input type="number" min="0" id="g-c" data-bind="play.gold.c" data-num="1" value="${P.gold.c}"></label></div>
      <div class="small muted">10 горстей = мешок, 10 мешков = сундук.</div>
      <div class="small"><b>С собой:</b> ${startInv.filter((n) => n !== ITEM[C.potion]?.name || !P.startPotionUsed).map(esc).join(' · ')}</div>
      ${ITEM[C.potion] && !P.startPotionUsed ? `<div class="row small">${iIcon(ITEM[C.potion])}<span>${esc(ITEM[C.potion].name)}</span><button class="small" data-act="start-potion">Использовать</button></div>` : ''}
      <div class="stack" style="gap:6px">${extra}</div>
      <div class="row"><select id="add-item" aria-label="Добавить предмет"><option value="">Добавить предмет или расходник…</option>${D.items.slice().sort((a, b) => a.name.localeCompare(b.name, 'ru')).map((i) => `<option value="${i.id}">${esc(i.name)}${i.kind === 'consumable' ? ' (расходник)' : ''}</option>`).join('')}</select><button data-act="add-item">Добавить</button></div>
      <textarea id="inv" data-bind="play.inv" placeholder="Прочие вещи и заметки по инвентарю">${esc(P.inv)}</textarea></section>
    ${levelHTML(x)}
  </div>
  <div class="stack">
    ${rollerHTML(x)}
    <section class="panel"><h2 class="spread">Оружие<button class="small" data-gear="1">Сменить снаряжение</button></h2>${weapons || '<div class="empty">Оружие не выбрано.</div>'}${invWeaponsHTML(x)}${isWarrior(x) ? '<div class="small muted">Боевая Подготовка воина уже добавлена к физическому урону.</div>' : ''}</section>
    <section class="panel"><h2>${term('experience', 'Опыт')}</h2>${x.exps.filter((e) => e.name).map((e) => `<div class="spread"><span>${esc(e.name)}${e.fromLevel ? ' <span class="small muted">(с повышения)</span>' : ''}</span><span class="chip accent mono">${sign(e.mod)}</span></div>`).join('') || '<div class="muted">Опыт не заполнен.</div>'}</section>
    <section class="panel"><h2>Карты домена</h2><div class="small muted">${term('loadout-and-vault', 'Рука')}: ${handCards.length} из 5.</div>
      ${handCards.map((c) => dcard(c, true)).join('') || '<div class="muted">В Руке пусто.</div>'}
      ${vaultCards.length ? `<h3>Хранилище</h3>${vaultCards.map((c) => dcard(c, false)).join('')}` : ''}
      ${addable.length ? `<div class="row"><select id="add-card" aria-label="Добавить карту"><option value="">Добавить карту (уровень ${x.L} и ниже)…</option>${addable.map((c) => `<option value="${c.id}">${esc(c.name)} · ${esc(D.domains[c.domain])} · ур. ${c.level}</option>`).join('')}</select><button data-act="add-card">Добавить</button></div>` : ''}</section>
    <section class="panel"><h2>Свойства</h2>${feats}</section>
    ${bfs.length ? `<section class="panel"><h2>${term('beastform', 'Звериные формы')} до ранга ${tierOf(x.L)}</h2>${bfs.map((b) => `<details><summary>${esc(b.name)} · ранг ${b.tier}</summary><div class="rich small">${b.html}</div></details>`).join('')}</section>` : ''}
    <section class="panel"><h2>История</h2>
      ${x.cls.questions.map((q, i) => C.answers[i] ? `<div><div class="small muted rich">${q}</div><div>${esc(C.answers[i])}</div></div>` : '').join('')}
      ${C.connections ? `<div><span class="lbl">Связи</span><div>${esc(C.connections)}</div></div>` : ''}
      ${C.notes ? `<div><span class="lbl">Заметки</span><div>${esc(C.notes)}</div></div>` : ''}
      <div class="small muted">${Object.entries(C.look).filter(([, v]) => v).map(([, v]) => esc(v)).join(' · ') || (!C.connections && !C.notes && !Object.values(C.answers).some(Boolean) ? 'Ответы на вопросы предыстории и связи заполняются на шаге «Образ и история».' : '')}</div></section>
    ${renderSave()}
  </div></div>`;
}
function dieHTML(k, label) {
  const v = lastRoll && lastRoll.h != null ? lastRoll[k] : null;
  const other = lastRoll && lastRoll.h != null ? lastRoll[k === 'h' ? 'f' : 'h'] : null;
  return `<div class="die ${k} ${v == null || v < other ? 'dim' : ''}" id="d-${k}">${v ?? '–'}<small>${label}</small></div>`;
}
function tierOf(L) { return L <= 1 ? 1 : L <= 4 ? 2 : L <= 7 ? 3 : 4; }
function isWarrior(x) { return x.cls?.features.some((f) => f.name === 'Боевая Подготовка'); }

function rollerHTML(x) {
  const opts = `<option value="">без характеристики</option>` + TR.map(([k, n]) => `<option value="${k}">${n} (${x.traits[k].total == null ? '—' : sign(x.traits[k].total)})${x.spellKey === k ? ' — заклинание' : ''}</option>`).join('');
  return `<section class="panel roller"><h2>${term('duality-dice', 'Кости Дуальности')} <span class="lbl">2d12</span></h2>
    <div class="rc"><label><span class="lbl">Характеристика</span><select id="r-trait">${opts}</select></label>
      <label><span class="lbl">${term('advantage-and-disadvantage', 'Преимущество')}</span><select id="r-adv"><option value="0">нет</option><option value="1">преимущество +d6</option><option value="-1">помеха −d6</option></select></label>
      <label><span class="lbl">Доп. модификатор</span><input id="r-mod" type="number" value="0"></label>
      <label><span class="lbl">${term('difficulty', 'Сложность')}</span><input id="r-dc" type="number" placeholder="если знаешь"></label></div>
    <div><span class="lbl">${term('utilize-an-experience', 'Опыт')} (1 Надежда за каждый)</span><div class="row">${x.exps.map((e, i) => e.name ? `<label class="row small"><input type="checkbox" data-exp="${i}"> ${esc(e.name)} ${sign(e.mod)}</label>` : '').join('') || '<span class="muted small">нет опыта</span>'}</div></div>
    <div class="row"><button class="primary" data-act="roll">Бросить</button><label class="row small"><input type="checkbox" id="r-react"> ${term('reaction-roll', 'бросок реакции')}</label><label class="row small"><input type="checkbox" id="r-auto" checked> менять Надежду и Стресс</label></div>
    <div class="err" id="r-err" role="alert"></div>
    <div class="result" id="r-out" aria-live="polite">${dieHTML('h', 'Надежда')}${dieHTML('f', 'Страх')}
      <div class="verdict">${lastRoll ? lastRoll.verdict : '<div class="how muted">Клик по характеристике или «Бросить»</div><div class="math">Больше на кости Надежды — ты получаешь Надежду, больше на кости Страха — Страх получает Мастер, дубль — критический успех.</div>'}</div></div>
    <details><summary>Другие броски</summary><div><div class="row"><label class="row small">Сколько <input id="q-n" type="number" min="1" max="20" value="1" style="width:56px"></label>${[4, 6, 8, 10, 12, 20, 100].map((s) => `<button data-q="${s}">d${s}</button>`).join('')}</div>
      <div class="row"><input id="q-f" placeholder="формула: 2d6+1d4+3" style="flex:1;min-width:150px" aria-label="Формула броска"><button data-act="formula">Бросить</button></div></div></details>
    <div><span class="lbl">Журнал</span><div class="log" id="log">${C.play.log.map((l) => `<div><span class="muted">${l.t}</span> ${l.h}</div>`).join('') || '<span class="muted small">Бросков пока не было.</span>'}</div></div></section>`;
}

/* ---------- справочник ---------- */
let refQuery = '', refType = 'all';
const REF_TYPES = [['all', 'Всё'], ['rule', 'Правила'], ['card', 'Карты'], ['weapon', 'Оружие'], ['armor', 'Броня'], ['item', 'Предметы'], ['anc', 'Родословные'], ['com', 'Сообщества'], ['beast', 'Звериные формы']];
function renderRef() {
  return `<div class="stack"><h1>Справочник</h1><input id="ref-q" placeholder="Поиск: правило, карта, оружие, предмет, родословная…" value="${esc(refQuery)}" aria-label="Поиск по справочнику">
    <div class="row" role="group" aria-label="Тип">${REF_TYPES.map(([k, n]) => `<button class="chipbtn ${refType === k ? 'sel' : ''}" data-reftype="${k}" aria-pressed="${refType === k}">${n}</button>`).join('')}</div>
    <div id="ref-res">${refResults()}</div><dialog id="ref-dlg" aria-label="Карточка справочника"></dialog>
    <p class="foot">Данные: Daggerheart SRD 1.0 в переводе ru.daggerheart.su. This product includes materials from the Daggerheart System Reference Document 1.0, © Critical Role, LLC, under the terms of the Darrington Press Community Gaming (DPCGL) License. Неофициальный фанатский инструмент. Иконки: <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a>, CC BY 3.0, авторы: ${(window.DH_ICON_AUTHORS || []).map(esc).join(', ')}. Оригинальный арт смотри по ссылкам «На сайте».</p></div>`;
}
let REF_INDEX = null, REF_SHOWN = [], refOpenIdx = -1;
function refOpen(i) {
  const dlg = $('#ref-dlg'); if (!dlg || !REF_SHOWN[i]) return;
  refOpenIdx = i; const { e } = REF_SHOWN[i];
  dlg.innerHTML = `<div class="dlg-in"><div class="spread dlg-head"><span class="lbl">${esc(e.kind)}</span><span class="row"><button class="ghost" data-refnav="-1" aria-label="Предыдущая" ${i ? '' : 'disabled'}>←</button><span class="small muted">${i + 1} из ${REF_SHOWN.length}</span><button class="ghost" data-refnav="1" aria-label="Следующая" ${i < REF_SHOWN.length - 1 ? '' : 'disabled'}>→</button><button class="ghost" data-refclose="1" aria-label="Закрыть">✕</button></span></div>
    <h2 class="row" style="gap:10px">${e.icon}${esc(e.title)}</h2><div class="rich">${e.short}</div>${e.full ? `<div class="rich dlg-full">${e.full}</div>` : ''}<div>${site(e.link)}</div></div>`;
  if (!dlg.open) dlg.showModal();
  dlg.querySelector('.dlg-in').scrollTop = 0;
}
function refClose() { const dlg = $('#ref-dlg'); hidePop(); document.body.appendChild(pop); if (dlg?.open) dlg.close(); refOpenIdx = -1; }
function refIndex() {
  if (REF_INDEX) return REF_INDEX;
  const R = [];
  const add = (type, kind, title, en, short, full, icon, link) => R.push({ type, kind, title, en: en || '', short, full, icon: icon || '', link, body: strip(full || short).toLowerCase() });
  for (const [id, r] of Object.entries(D.rules)) add('rule', 'Правило', r.t, '', r.d, r.full && strip(r.full).length > strip(r.d).length + 20 ? r.full : '', '', '/rule/' + id);
  for (const c of D.cards) add('card', `Карта · ${D.domains[c.domain]} · ур. ${c.level} · ${c.type}`, c.name, '', c.text, '', dmIcon(c.domain), '/domain-card/' + c.id);
  for (const w of D.weapons) add('weapon', `${w.slot === 'primary' ? 'Основное' : 'Вспомогательное'} оружие · ранг ${w.tier}`, w.name, w.en, `<p>${TN[w.trait] || 'Заклинатель'} · ${w.range} · ${w.die}${w.bonus ? '+' + w.bonus : ''} ${w.magic ? 'маг.' : 'физ.'} · ${w.burden}</p>` + w.features.map((f) => `<p>${f.name ? '<b>' + esc(f.name) + ':</b> ' : ''}${f.text}</p>`).join(''), '', wIcon(w), '/equipment/' + w.id);
  for (const a of D.armor) add('armor', `Броня · ранг ${a.tier}`, a.name, a.en, `<p>Пороги ${a.major}/${a.severe} · Броня ${a.score}</p>` + a.features.map((f) => `<p><b>${esc(f.name)}:</b> ${f.text}</p>`).join(''), '', aIcon(a), '/equipment/' + a.id);
  for (const i of D.items) add('item', i.kind === 'consumable' ? 'Расходник' : 'Предмет', i.name, i.en, i.text, '', iIcon(i), '/equipment/' + i.id);
  for (const a of D.ancestries) add('anc', 'Родословная', a.name, '', a.prelude, a.features.map((f) => `<p><b>${esc(f.name)}:</b> ${f.text}</p>`).join(''), ico('anc-' + a.id, 'bone', 'sm'), '/ancestry/' + a.id);
  for (const a of D.communities) add('com', 'Сообщество', a.name, '', a.prelude, a.features.map((f) => `<p><b>${esc(f.name)}:</b> ${f.text}</p>`).join(''), ico('com-' + a.id, 'sage', 'sm'), '/community/' + a.id);
  for (const b of D.beastforms) add('beast', `Звериная форма · ранг ${b.tier}`, b.name, '', b.html, '', '', '/beastform/' + b.id);
  return (REF_INDEX = R);
}
/** Ранг совпадения: 0 — название начинается с запроса, 1 — какое-то слово названия, 2 — внутри слова, 3 — в тексте. -1 — нет. */
function refScore(e, q) {
  const t = e.title.toLowerCase(), en = e.en.toLowerCase();
  if (t.startsWith(q) || en.startsWith(q)) return 0;
  const words = (t + ' ' + en).split(/[\s\-—«»"(),.:]+/);
  if (words.some((w) => w.startsWith(q))) return 1;
  if (q.length >= 3 && (t.includes(q) || en.includes(q))) return 2;
  if (q.length >= 3 && e.body.split(/[\s\-—«»"(),.:]+/).some((w) => w.startsWith(q))) return 3;
  return -1;
}
function refResults() {
  const q = refQuery.trim().toLowerCase();
  if (q.length < 2) return `<div class="empty">Введи хотя бы две буквы. Подсказки по терминам также открываются кликом по подчёркнутым словам на любой странице.</div>`;
  const hits = refIndex().filter((e) => refType === 'all' || e.type === refType).map((e) => [refScore(e, q), e]).filter(([sc]) => sc >= 0)
    .sort((a, b) => a[0] - b[0] || a[1].title.localeCompare(b[1].title, 'ru'));
  if (!hits.length) return `<div class="empty">Ничего не нашлось по «${esc(refQuery)}»${refType !== 'all' ? ' в этом разделе' : ''}.</div>`;
  const inText = hits.filter(([sc]) => sc === 3).length;
  REF_SHOWN = hits.slice(0, 80).map(([sc, e]) => ({ sc, e }));
  const card = ({ sc, e }, i) => `<button class="ref-item" data-refopen="${i}" aria-haspopup="dialog"><span class="lbl">${esc(e.kind)}</span><span class="ref-title">${e.icon}<b>${esc(e.title)}</b></span>
    <span class="ref-short">${strip(e.short)}</span>${sc === 3 ? '<span class="chip ref-flag">найдено в тексте</span>' : ''}</button>`;
  return `<div class="muted small">Найдено: ${hits.length}${inText ? `, из них ${inText} по тексту` : ''}${hits.length > 80 ? '. Показаны первые 80, уточни запрос' : ''}. Нажми на карточку, чтобы открыть целиком.</div><div class="ref-list">${REF_SHOWN.map(card).join('')}</div>`;
}

/* ---------- сохранение ---------- */
function renderSave() {
  return `<section class="panel"><h2>Сохранение</h2><div class="small muted">Персонаж сам сохраняется в этом браузере. Чтобы перенести его на другое устройство или показать Мастеру, скопируй код.</div>
    <div class="row"><button data-act="copy">Скопировать код персонажа</button><label class="row small">Открыть файл <input type="file" id="s-file" accept=".json,.txt,application/json,text/plain" style="width:auto"></label></div>
    <textarea id="s-text" placeholder="Вставь сюда код персонажа и нажми «Загрузить»" aria-label="Код персонажа"></textarea>
    <div class="row"><button data-act="load">Загрузить код</button><button data-act="sample" id="sample-btn">Пример: Бронк</button><button class="danger" data-act="reset" id="reset-btn">Начать заново</button></div><div class="err" id="s-msg" role="status"></div></section>`;
}

/* ---------- броски ---------- */
let lastRoll = null; // {h,f,verdict} — переживает перерисовку листа
function addLog(h) { C.play.log.unshift({ t: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), h }); C.play.log = C.play.log.slice(0, 40); const l = $('#log'); if (l) l.innerHTML = C.play.log.map((x) => `<div><span class="muted">${x.t}</span> ${x.h}</div>`).join(''); save(); }
function showVerdict(html, h = null, f = null) { lastRoll = { h, f, verdict: html }; const v = $('#r-out .verdict'); if (v) v.innerHTML = html; if (h == null) ['h', 'f'].forEach((k) => { const el = $('#d-' + k); if (el) { el.classList.add('dim'); el.firstChild.textContent = '–'; } }); }
function duality(traitKey, label, extra = 0) {
  const x = derive(); const err = $('#r-err'); if (err) err.textContent = '';
  const auto = $('#r-auto')?.checked ?? true;
  const picks = [...document.querySelectorAll('[data-exp]:checked')].map((el) => x.exps[+el.dataset.exp]).filter(Boolean);
  if (auto && picks.length > C.play.hope) { err.textContent = `Не хватает Надежды: нужно ${picks.length}, есть ${C.play.hope}.`; return; }
  const adv = num($('#r-adv')?.value), mod = num($('#r-mod')?.value) + extra;
  const dcRaw = $('#r-dc')?.value ?? '', dc = dcRaw === '' ? null : num(dcRaw);
  const react = $('#r-react')?.checked;
  const h = d(12), f = d(12), a = adv ? d(6) : 0;
  const tv = traitKey ? (x.traits[traitKey].total ?? 0) : 0;
  const ev = picks.reduce((s, e) => s + e.mod, 0);
  const total = h + f + tv + ev + mod + adv * a;
  if (auto && picks.length) C.play.hope -= picks.length;
  const crit = h === f, ok = crit ? true : dc == null ? null : total >= dc;
  let how, cls, eff;
  if (react) { how = crit ? 'Реакция: критический успех' : ok == null ? 'Бросок реакции' : ok ? 'Реакция: успех' : 'Реакция: провал'; cls = crit ? 'crit' : ok === false ? 'fear' : 'hope'; eff = 'Надежда и Страх не меняются'; }
  else if (crit) { how = 'Критический успех'; cls = 'crit'; eff = '+1 Надежда, −1 Стресс'; if (auto) { C.play.hope = Math.min(derive().hopeMax, C.play.hope + 1); C.play.stress = Math.max(0, C.play.stress - 1); } }
  else if (h > f) { how = ok == null ? 'С Надеждой' : ok ? 'Успех с Надеждой' : 'Провал с Надеждой'; cls = 'hope'; eff = '+1 Надежда'; if (auto) C.play.hope = Math.min(derive().hopeMax, C.play.hope + 1); }
  else {
    how = ok == null ? 'Со Страхом' : ok ? 'Успех со Страхом' : 'Провал со Страхом'; cls = 'fear'; eff = 'Мастер получает Страх';
    if (ok === false && x.sub?.foundation.some((ft) => ft.name === 'Храбрость')) { eff += ' · Храбрость: +1 Надежда'; if (auto) C.play.hope = Math.min(derive().hopeMax, C.play.hope + 1); }
  }
  const parts = [`${h}+${f}`];
  if (traitKey) parts.push(`${TN[traitKey]} ${sign(tv)}`);
  picks.forEach((e) => parts.push(`${e.name} ${sign(e.mod)}`));
  if (adv) parts.push(`${adv > 0 ? 'преим. +' : 'помеха −'}${a}`);
  if (mod) parts.push(`мод. ${sign(mod)}`);
  const math = parts.join(' · ') + (dc != null ? ` против ${dc}` : '') + ` → ${eff}`;
  const dh = $('#d-h'), df = $('#d-f');
  if (dh) { dh.innerHTML = `${h}<small>Надежда</small>`; df.innerHTML = `${f}<small>Страх</small>`; dh.classList.toggle('dim', h < f); df.classList.toggle('dim', f < h); [dh, df].forEach((el) => { el.classList.remove('spin'); void el.offsetWidth; el.classList.add('spin'); }); }
  showVerdict(`<div class="total">${total}</div><div class="how ${cls}">${how}</div><div class="math">${esc(math)}</div>`, h, f);
  addLog(`${esc(label)}: <b class="mono">${total}</b> ${how.toLowerCase()} <span class="muted">(${esc(math)})</span>`);
  document.querySelectorAll('[data-exp]:checked').forEach((el) => (el.checked = false));
  refreshTrackers(x);
}
function rollDamage(id, crit) {
  const x = derive(); const w = WPN[id]; if (!w) return;
  const sides = num((w.die.match(/d(\d+)/) || [])[1]); const n = Math.max(1, x.prof);
  const rolls = Array.from({ length: n }, () => d(sides));
  const lvl = isWarrior(x) && !w.magic ? x.L : 0;
  const critAdd = crit ? sides * n : 0;
  const total = rolls.reduce((s, v) => s + v, 0) + w.bonus + lvl + critAdd;
  const math = `${n}d${sides} [${rolls.join(', ')}]${w.bonus ? ' +' + w.bonus : ''}${lvl ? ' + уровень ' + lvl : ''}${crit ? ' + крит ' + critAdd : ''}`;
  showVerdict(`<div class="total">${total}</div><div class="how">${crit ? 'Критический урон' : 'Урон'}: ${esc(w.name)}</div><div class="math">${math} · ${w.magic ? 'магический' : 'физический'}</div>`);
  addLog(`Урон ${esc(w.name)}: <b class="mono">${total}</b> <span class="muted">(${math})</span>`);
}
function rollFormula(src) {
  const f = String(src || '').replace(/\s+/g, '').toLowerCase().replace(/к/g, 'd');
  const err = $('#r-err');
  if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(f)) { if (err) err.textContent = 'Формула выглядит так: 2d6+3 или 1d8+1d4-1.'; return; }
  if (err) err.textContent = '';
  let total = 0; const parts = [];
  for (const m of f.matchAll(/([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g)) {
    if (m[3]) { const sg = m[1] === '-' ? -1 : 1, n = Math.min(50, num(m[2] || 1)), s = Math.max(2, num(m[3])); const r = Array.from({ length: n }, () => d(s)); total += sg * r.reduce((a, b) => a + b, 0); parts.push(`${sg < 0 ? '−' : ''}${n}d${s} [${r.join(', ')}]`); }
    else if (m[5]) { const v = (m[4] === '-' ? -1 : 1) * num(m[5]); total += v; parts.push(sign(v)); }
  }
  showVerdict(`<div class="total">${total}</div><div class="how">${esc(f)}</div><div class="math">${parts.join(' ')}</div>`);
  addLog(`${esc(f)}: <b class="mono">${total}</b> <span class="muted">(${parts.join(' ')})</span>`);
}
function refreshTrackers() { const y = window.scrollY; render(); window.scrollTo(0, y); save(); }

/* ---------- подсказки по терминам ---------- */
const pop = $('#pop');
function showPop(el) {
  const id = el.dataset.rule, r = D.rules[id] || { t: el.textContent.trim(), d: '<p class="muted">Короткого описания нет в базе, полное правило есть на сайте.</p>' };
  const full = r.full && strip(r.full).length > strip(r.d).length + 20;
  pop.innerHTML = `<div class="spread"><h4>${esc(r.t)}</h4><button class="ghost" data-act="pop-close" aria-label="Закрыть">✕</button></div><div class="rich">${r.d}</div>
    ${full ? `<details class="pop-more"><summary>Подробнее</summary><div class="rich">${r.full}</div></details>` : ''}<div>${site('/rule/' + id, 'Правило на сайте')}</div>`;
  const dlg = $('#ref-dlg'), inDlg = dlg?.open && dlg.contains(el);
  (inDlg ? dlg : document.body).appendChild(pop);
  pop.style.position = inDlg ? 'fixed' : 'absolute';
  pop.hidden = false;
  const b = el.getBoundingClientRect();
  const w = pop.offsetWidth, vw = document.documentElement.clientWidth;
  let left = b.left + (inDlg ? 0 : window.scrollX); if (left + w > vw - 16) left = Math.max(16, vw - 16 - w);
  pop.style.left = left + 'px'; pop.style.top = (b.bottom + (inDlg ? 0 : window.scrollY) + 6) + 'px';
}
function hidePop() { if (pop) pop.hidden = true; }

/* ---------- события ---------- */
function setPath(path, val) { const ks = path.split('.'); let o = C; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; } o[ks.at(-1)] = val; }
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.bind) {
    setPath(el.dataset.bind, el.dataset.num ? num(el.value) : el.value);
    save();
    const s = $('#summary'); if (s) s.innerHTML = renderSummary(derive());
    if (C.view === 'sheet' && /^(level|adj\.|subTier)/.test(el.dataset.bind)) { clearTimeout(window.__rt); window.__rt = setTimeout(() => { const id = el.id; refreshTrackers(); const n = document.getElementById(id); if (n) { n.focus(); } }, 500); }
    if (C.view === 'build' && C.step === STEPS.findIndex((s) => s.id === 'exp')) { /* обновим индикатор шага без потери фокуса */ document.querySelectorAll('.step-btn').forEach((b, i) => b.classList.toggle('done', STEPS[i].done(derive()))); }
  } else if (el.id === 'ref-q') { refQuery = el.value; $('#ref-res').innerHTML = refResults(); }
  else if (el.dataset.extra != null) { C.play.extra[+el.dataset.extra].n = num(el.value); save(); }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.toggle) {
    C[el.dataset.toggle] = el.checked;
    if (el.dataset.toggle === 'wheelchair') { C.primary = null; }
    if (el.dataset.toggle === 'mixed' && !el.checked) C.ancestry2Id = null;
    save(); keepScroll(render);
  } else if (el.dataset.filter) { C.filters[el.dataset.filter] = el.value; save(); keepScroll(render); }
  else if (el.dataset.clank != null) { C.clankExp = +el.dataset.clank; save(); keepScroll(render); }
  else if (el.id === 'portrait-file' && el.files[0]) { loadPortrait(el.files[0]); }
  else if (el.id === 's-file' && el.files[0]) {
    const r = new FileReader(); r.onload = () => { try { loadCode(r.result); } catch (err) { msg('Файл не похож на персонажа.', true); } }; r.readAsText(el.files[0]);
  }
});
function loadPortrait(file) {
  const err = $('#portrait-err');
  if (!/^image\//.test(file.type)) { if (err) err.textContent = 'Это не картинка. Подойдут JPG, PNG или WebP.'; return; }
  const img = new Image(); const url = URL.createObjectURL(file);
  img.onload = () => {
    const max = 480, k = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
    C.portrait = cv.toDataURL('image/jpeg', 0.85); save(); keepScroll(render);
  };
  img.onerror = () => { if (err) err.textContent = 'Не удалось открыть картинку. Попробуй другой файл.'; };
  img.src = url;
}
function keepScroll(fn) { const y = window.scrollY; fn(); window.scrollTo(0, y); }
function msg(t, bad) { const m = $('#s-msg'); if (m) { m.textContent = t; m.style.color = bad ? 'var(--danger)' : 'var(--ok)'; } }
function loadCode(text) { const o = JSON.parse(text); if (!o || typeof o !== 'object' || !('traits' in o)) throw new Error('bad'); C = merge(o); save(); render(); msg('Персонаж загружен.'); }
let resetArmed = false;

document.addEventListener('click', (e) => {
  const t = e.target;
  const termEl = t.closest('.term');
  if (termEl) { e.preventDefault(); e.stopPropagation(); showPop(termEl); return; }
  if (!t.closest('#pop')) hidePop();
  const b = t.closest('button'); if (!b) return;
  const x = derive();
  if (b.dataset.gear) { C.view = 'build'; C.step = STEPS.findIndex((q) => q.id === 'gear'); save(); render(); window.scrollTo(0, 0); return; }
  if (b.dataset.refopen != null) { if (refOpenIdx === +b.dataset.refopen && $('#ref-dlg')?.open) refClose(); else refOpen(+b.dataset.refopen); return; }
  if (b.dataset.refnav) { refOpen(refOpenIdx + num(b.dataset.refnav)); return; }
  if (b.dataset.refclose) { refClose(); return; }
  if (b.dataset.reftype) { refType = b.dataset.reftype; document.querySelectorAll('[data-reftype]').forEach((q) => { q.classList.toggle('sel', q.dataset.reftype === refType); q.setAttribute('aria-pressed', String(q.dataset.reftype === refType)); }); $('#ref-res').innerHTML = refResults(); return; }
  if (b.dataset.view) { C.view = b.dataset.view; save(); render(); window.scrollTo(0, 0); return; }
  if (b.dataset.step != null || b.dataset.go != null) { C.step = Math.max(0, Math.min(STEPS.length - 1, num(b.dataset.step ?? b.dataset.go))); save(); render(); window.scrollTo(0, 0); return; }
  if (b.dataset.pick) {
    const f = b.dataset.pick, v = b.dataset.val || null;
    if (f === 'classId' && C.classId !== v) { C.subclassId = null; C.cards = []; C.vault = []; C.classItem = ''; C.answers = {}; }
    if (f === 'primary') { const w = WPN[v]; if (w && w.burden.startsWith('Двуруч')) C.secondary = null; }
    C[f] = v; save(); keepScroll(render); return;
  }
  if (b.dataset.trait) {
    const k = b.dataset.trait;
    C.traits[k] = b.dataset.v === 'clear' ? null : (C.traits[k] === num(b.dataset.v) ? null : num(b.dataset.v));
    save(); keepScroll(render); return;
  }
  if (b.dataset.layout) { const lay = x.cls && LAYOUT[x.cls.id]; for (const [k] of TR) C.traits[k] = b.dataset.layout === 'clear' ? null : lay ? lay[k] : null; save(); keepScroll(render); return; }
  if (b.dataset.expExample) { const i = C.experiences.findIndex((e2) => !e2.name.trim()); if (i >= 0) C.experiences[i].name = b.dataset.expExample; else C.experiences[C.experiences.length - 1].name = b.dataset.expExample; save(); keepScroll(render); return; }
  if (b.dataset.card) {
    const id = b.dataset.card;
    if (C.cards.includes(id)) C.cards = C.cards.filter((c) => c !== id); else if (C.vault.includes(id)) C.vault = C.vault.filter((c) => c !== id);
    else if (C.cards.length < 5) C.cards.push(id); else C.vault.push(id);
    save(); keepScroll(render); return;
  }
  if (b.dataset.box) {
    const k = b.dataset.box, i = +b.dataset.i;
    C.play[k] = C.play[k] === i + 1 ? i : i + 1; refreshTrackers(); return;
  }
  if (b.dataset.roll) { const s = $('#r-trait'); if (s) s.value = b.dataset.roll; duality(b.dataset.roll, TN[b.dataset.roll]); return; }
  if (b.dataset.atk) {
    const w = WPN[b.dataset.atk]; const tk = SPELL_TRAIT(w.trait, x);
    const atk = modsOf(w.features).filter((m) => m.key === 'attack').reduce((s, m) => s + m.v, 0);
    duality(tk, 'Атака: ' + w.name, atk, { attack: true }); return;
  }
  if (b.dataset.dmg) { rollDamage(b.dataset.dmg, !!b.dataset.crit); return; }
  if (b.dataset.q) { rollFormula(`${Math.max(1, num($('#q-n')?.value))}d${b.dataset.q}`); return; }
  if (b.dataset.tovault) { C.cards = C.cards.filter((c) => c !== b.dataset.tovault); C.vault.push(b.dataset.tovault); refreshTrackers(); return; }
  if (b.dataset.tohand) {
    const id = b.dataset.tohand, c = CARD[id];
    if (C.cards.length >= 5) return;
    if (!b.dataset.free) { const x2 = derive(); if (C.play.stress + c.recall > x2.stress.total) { alertNote('Не хватает свободных ячеек Стресса, чтобы призвать эту карту.'); return; } C.play.stress += c.recall; }
    C.vault = C.vault.filter((v) => v !== id); C.cards.push(id); refreshTrackers(); return;
  }
  if (b.dataset.dropcard) { C.cards = C.cards.filter((c) => c !== b.dataset.dropcard); C.vault = C.vault.filter((c) => c !== b.dataset.dropcard); refreshTrackers(); return; }
  if (b.dataset.dropitem != null) { C.play.extra.splice(+b.dataset.dropitem, 1); refreshTrackers(); return; }
  const act = b.dataset.act;
  if (!act) return;
  if (act === 'pop-close') return hidePop();
  if (act === 'portrait-clear') { C.portrait = ''; save(); keepScroll(render); return; }
  if (act === 'roll') { const k = $('#r-trait').value || null; duality(k, k ? TN[k] : 'Бросок'); }
  if (act === 'formula') rollFormula($('#q-f').value);
  if (act === 'hit-apply') applyHit();
  if (act === 'stress-1') { C.play.stress = Math.max(0, C.play.stress - 1); refreshTrackers(); }
  if (act === 'hp-1') { C.play.hp = Math.max(0, C.play.hp - 1); refreshTrackers(); }
  if (act === 'armor-clear') { C.play.armor = 0; refreshTrackers(); }
  if (act === 'hope+1') { C.play.hope = Math.min(derive().hopeMax, C.play.hope + 1); refreshTrackers(); }
  if (act === 'add-item') { const id = $('#add-item').value; if (id) { const ex = C.play.extra.find((e2) => e2.id === id); if (ex) { if (ITEM[id].kind === 'consumable' && num(ex.n) >= 5) { alertNote('Расходников одного вида можно нести не больше 5.'); return; } ex.n = num(ex.n) + 1; } else C.play.extra.push({ id, n: 1 }); refreshTrackers(); } }
  if (act === 'add-card') { const id = $('#add-card').value; if (id) { if (C.cards.length < 5) C.cards.push(id); else C.vault.push(id); refreshTrackers(); } }
  if (act === 'copy') {
    const ta = $('#s-text'); ta.value = JSON.stringify(C);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(ta.value).then(() => msg('Код скопирован. Сохрани его в заметках или отправь Мастеру.'), () => { ta.focus(); ta.select(); msg('Код выделен в поле: скопируй его вручную.'); });
    else { ta.focus(); ta.select(); msg('Код выделен в поле: скопируй его вручную.'); }
  }
  if (act === 'sample') {
    if (C.classId && !b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Нажми ещё раз: текущий персонаж заменится'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'Пример: Бронк'; }, 3500); return; }
    C = bronk(); save(); render(); window.scrollTo(0, 0); return;
  }
  if (act === 'load') { try { loadCode($('#s-text').value); } catch (err) { msg('Это не похоже на код персонажа. Скопируй его целиком, с фигурными скобками.', true); } }
  if (act === 'reset') {
    if (!resetArmed) { resetArmed = true; b.textContent = 'Нажми ещё раз: персонаж сотрётся'; setTimeout(() => { resetArmed = false; const rb = $('#reset-btn'); if (rb) rb.textContent = 'Начать заново'; }, 3500); return; }
    resetArmed = false; C = blank(); save(); render(); window.scrollTo(0, 0);
  }
});
document.addEventListener('click', (e) => { const dlg = $('#ref-dlg'); if (dlg && e.target === dlg) refClose(); });
document.addEventListener('keydown', (e) => {
  if ($('#ref-dlg')?.open) { if (e.key === 'ArrowRight' && refOpenIdx < REF_SHOWN.length - 1) refOpen(refOpenIdx + 1); if (e.key === 'ArrowLeft' && refOpenIdx > 0) refOpen(refOpenIdx - 1); }
  if (e.key === 'Escape') hidePop();
  if (e.key === 'Enter' && e.target.id === 'hit-dmg') applyHit();
  if (e.key === 'Enter' && e.target.id === 'q-f') rollFormula(e.target.value);
});
function alertNote(t) { const er = $('#r-err'); if (er) er.textContent = t; }

/* первый рендер — в boot.js, после загрузки всех модулей */

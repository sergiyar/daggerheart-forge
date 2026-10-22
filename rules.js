'use strict';
/* Правила, которые срабатывают в игре: получение урона, ресурсы, классовые механики, отдых.
   Использует общие функции из app.js (derive, C, save, render, sign, num, esc, term, d…). */

/* ================= ПОЛУЧЕНИЕ УРОНА ================= */
function plural(n, one, few, many) { const a = Math.abs(n) % 100, b = a % 10; return `${n} ${a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many}`; }
const RAN = (n) => plural(n, 'Рана', 'Раны', 'Ран'), STR = (n) => plural(n, 'Стресс', 'Стресса', 'Стресса'), HOP = (n) => plural(n, 'Надежда', 'Надежды', 'Надежды'), SLT = (n) => plural(n, 'ячейка брони', 'ячейки брони', 'ячеек брони');
const SEV_NAME = ['нет урона', 'Лёгкий', 'Ощутимый', 'Тяжёлый', 'Колоссальный'];

/** Какие опции защиты есть у персонажа прямо сейчас. */
function hitOptions(x) {
  const o = [];
  const P = C.play, free = Math.max(0, x.ar.total - num(P.armor));
  o.push({ id: 'slots', kind: 'slots', free });
  if (x.hasSub('Железная воля')) o.push({ id: 'ironWill', kind: 'info', text: 'Заступник, Железная воля: при физическом уроне можно отметить ещё 1 ячейку брони.' });
  if (x.inHand('brace')) o.push({ id: 'brace', kind: 'info', text: 'Карта «Приготовиться»: ещё 1 ячейка брони за 1 Стресс.' });
  if (x.inHand('i-am-your-shield')) o.push({ id: 'shield', kind: 'check', label: 'Заслоняю союзника («Я твой щит»): +1 Стресс, ячеек брони сколько угодно' });
  if (x.cls && x.cls.features.some((f) => f.name === 'Неудержимый')) o.push({ id: 'unstoppable', kind: 'auto', on: !!P.unstoppable, text: 'Неудержимый: физический урон −1 порог' });
  if (x.inHand('get-back-up')) o.push({ id: 'getBackUp', kind: 'check', label: '«Вернуться в строй»: Тяжёлый −1 порог за 1 Стресс' });
  if (x.fx.swarm) { o.push({ id: 'swarm', kind: 'check', label: 'Бронированные жуки: −1 порог', def: true }); o.push({ id: 'swarmKeep', kind: 'check', label: 'Сохранить жуков после удара (1 Надежда)' }); }
  if (x.has('Чешуя')) o.push({ id: 'scales', kind: 'check', label: 'Дракона, Чешуя: при Тяжёлом на 1 Рану меньше за 1 Стресс' });
  if (x.has('Толстая кожа')) o.push({ id: 'thickSkin', kind: 'check', label: 'Дварф, Толстая кожа: Лёгкий урон → 2 Стресса вместо Раны' });
  if (x.has('Повышенная стойкость')) o.push({ id: 'toughness', kind: 'check', label: 'Дварф, Повышенная стойкость: физический урон вдвое за 3 Надежды' });
  if (x.has('Втягивание')) o.push({ id: 'retract', kind: 'auto', on: !!x.fx.retract, text: 'Галапа в панцире: сопротивление физическому урону' });
  if (x.armFeat('Непробиваемое')) o.push({ id: 'impen', kind: 'auto', on: !P.impenUsed, text: 'Броня «Непробиваемое»: последняя Рана → Стресс (раз за короткий отдых)' });
  return o;
}

/** Чистый расчёт удара. o: {dmg, type, direct, resist, immune, slots, shield, getBackUp, swarm, scales, thickSkin, toughness, massive, sturdyRoll} */
function resolveHit(x, o) {
  const P = C.play, steps = [], cost = { stress: 0, hope: 0 };
  const phys = o.type !== 'mag';
  let dmg = Math.max(0, num(o.dmg));
  steps.push(`Входящий урон ${dmg} (${phys ? 'физический' : 'магический'}${o.direct ? ', прямой' : ''})`);
  if (o.immune) { steps.push('Иммунитет: урон 0'); dmg = 0; }
  if (dmg && phys && o.toughness) { dmg = Math.ceil(dmg / 2); cost.hope += 3; steps.push(`Повышенная стойкость: вдвое → ${dmg} (3 Надежды)`); }
  const resist = o.resist || (phys && x.fx.retract && x.has('Втягивание'));
  if (dmg && resist) { dmg = Math.ceil(dmg / 2); steps.push(`Сопротивление: вдвое с округлением вверх → ${dmg}`); }
  if (dmg && !phys && x.armFeat('Защищающее')) { dmg = Math.max(0, dmg - x.ar.total); steps.push(`Броня «Защищающее»: −${x.ar.total} → ${dmg}`); }

  let sev = dmg <= 0 ? 0 : dmg < x.thr.maj ? 1 : dmg < x.thr.sev ? 2 : 3;
  if (o.massive && dmg >= 2 * x.thr.sev) sev = 4;
  const initial = sev;
  steps.push(`Пороги ${x.thr.maj}/${x.thr.sev}: ${SEV_NAME[sev]}${sev ? ` (${RAN(sev)})` : ''}`);

  const down = (n, why) => { if (sev <= 0) return; const b = sev; sev = Math.max(0, sev - n); steps.push(`${why}: ${SEV_NAME[b]} → ${SEV_NAME[sev]}`); };
  if (sev && phys && P.unstoppable) down(1, 'Неудержимый');
  if (initial >= 3 && o.getBackUp && x.inHand('get-back-up')) { cost.stress += 1; down(1, '«Вернуться в строй» (1 Стресс)'); }
  if (sev && o.swarm && x.fx.swarm) { down(1, 'Бронированные жуки'); if (o.swarmKeep) { cost.hope += 1; steps.push('Жуки остаются (1 Надежда)'); } }

  /* ячейки брони */
  const free = Math.max(0, x.ar.total - num(P.armor));
  let cap = 1, why = ['1 по правилам'];
  if (phys && x.hasSub('Железная воля')) { cap += 1; why.push('+1 Железная воля'); }
  if (x.inHand('brace')) { cap += 1; why.push('+1 «Приготовиться» за Стресс'); }
  if (o.shield && x.inHand('i-am-your-shield')) { cap = 99; why = ['сколько угодно («Я твой щит»)']; cost.stress += 1; }
  let blocked = '';
  if (o.direct) blocked = 'прямой урон нельзя уменьшить бронёй';
  else if (x.armFeat('Физическое') && !phys) blocked = 'броня «Физическое» не защищает от магии';
  else if (x.armFeat('Магическое') && phys) blocked = 'броня «Магическое» не защищает от физического урона';
  const per = x.armFeat('Укреплённое') || x.armFeat('Укрепленное') ? 2 : 1;
  let want = blocked ? 0 : Math.min(num(o.slots), cap, free);
  const usefulMax = Math.ceil(sev / per);
  if (want > usefulMax) want = usefulMax;
  let marked = 0;
  for (let i = 0; i < want; i++) {
    const isLast = num(P.armor) + marked + 1 >= x.ar.total;
    if (isLast && x.armFeat('Устойчивое') && o.sturdyRoll === 6) { down(1, 'Броня «Устойчивое»: на d6 выпало 6, ячейка не тратится'); continue; }
    marked++;
    down(per, `Ячейка брони ${marked}`);
    if (x.inHand('brace') && marked === (phys && x.hasSub('Железная воля') ? 3 : 2) && !o.shield) { cost.stress += 1; steps.push('«Приготовиться»: +1 Стресс за дополнительную ячейку'); }
    if (x.armFeat('Мучительное')) { cost.stress += 1; steps.push('Броня «Мучительное»: +1 Стресс'); }
  }
  if (blocked && num(o.slots) > 0) steps.push(`Броня не помогает: ${blocked}`);

  let hp = sev;
  if (initial >= 3 && sev >= 1 && o.scales && x.has('Чешуя')) { hp -= 1; cost.stress += 1; steps.push('Чешуя: на 1 Рану меньше (1 Стресс)'); }
  if (sev === 1 && o.thickSkin && x.has('Толстая кожа')) { hp = 0; cost.stress += 2; steps.push('Толстая кожа: вместо Раны 2 Стресса'); }

  /* переполнение Стресса → Раны */
  const stressFree = x.stress.total - num(P.stress);
  let overflow = 0;
  if (cost.stress > stressFree) { overflow = cost.stress - stressFree; hp += overflow; steps.push(`Ячейки Стресса закончились: ${STR(overflow)} превращается в Раны`); }
  if (cost.hope > num(P.hope)) steps.push(`Не хватает Надежды: нужно ${cost.hope}, есть ${P.hope}`);

  let impen = false;
  const hpFree = x.hp.total - num(P.hp);
  if (hp > 0 && hp >= hpFree && x.armFeat('Непробиваемое') && !P.impenUsed) { hp -= 1; cost.stress += 1; impen = true; steps.push('Броня «Непробиваемое»: последняя Рана заменена Стрессом'); }

  return { steps, hp: Math.max(0, hp), stress: cost.stress - overflow, hope: cost.hope, armor: marked, cap: blocked ? 0 : Math.min(cap, free), capWhy: why.join(', '), blocked, free, impen, sev, swarmUsed: !!(o.swarm && x.fx.swarm && !o.swarmKeep), dead: num(P.hp) + Math.max(0, hp) >= x.hp.total };
}

function readHitForm() {
  const g = (id) => document.getElementById(id);
  const v = (id) => (g(id) ? g(id).checked : false);
  return { dmg: g('hit-dmg')?.value ?? '', type: document.querySelector('input[name="hit-type"]:checked')?.value || 'phys', direct: v('hit-direct'), resist: v('hit-resist'), immune: v('hit-immune'),
    slots: num(g('hit-slots')?.value), shield: v('hit-shield'), getBackUp: v('hit-getBackUp'), swarm: v('hit-swarm'), swarmKeep: v('hit-swarmKeep'), scales: v('hit-scales'), thickSkin: v('hit-thickSkin'), toughness: v('hit-toughness'), massive: !!C.play.massiveRule };
}

function hitPanelHTML(x) {
  const opts = hitOptions(x);
  const slot = opts.find((o) => o.id === 'slots');
  const checks = opts.filter((o) => o.kind === 'check').map((o) => `<label class="row small" style="flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" id="hit-${o.id}" data-hit ${o.def ? 'checked' : ''}> <span>${esc(o.label)}</span></label>`).join('');
  const infos = opts.filter((o) => o.kind === 'info' || o.kind === 'auto').map((o) => `<div class="small ${o.kind === 'auto' && !o.on ? 'muted' : ''}">${o.kind === 'auto' ? (o.on ? '● ' : '○ ') : '· '}${esc(o.text)}</div>`).join('');
  return `<section class="panel" id="hit-panel"><h2>Получить урон</h2>
    <div class="row"><input id="hit-dmg" data-hit type="number" min="0" placeholder="урон" style="width:110px" aria-label="Входящий урон">
      <label class="row small"><input type="radio" name="hit-type" value="phys" data-hit checked> физический</label><label class="row small"><input type="radio" name="hit-type" value="mag" data-hit> магический</label></div>
    <div class="row small"><label class="row"><span>${term('armor-slot', 'Ячеек брони')}</span><input id="hit-slots" data-hit type="number" min="0" max="${slot.free}" value="${slot.free ? 1 : 0}" style="width:64px"></label><span class="muted">свободно ${slot.free} из ${x.ar.total}</span></div>
    <div class="stack" style="gap:4px">${checks}</div>
    ${infos ? `<div class="stack" style="gap:2px">${infos}</div>` : ''}
    <details><summary>Особые случаи</summary><div class="small">
      <label class="row"><input type="checkbox" id="hit-direct" data-hit> ${term('direct-damage', 'прямой урон')} (броня не помогает)</label>
      <label class="row"><input type="checkbox" id="hit-resist" data-hit> ${term('resistance', 'сопротивление')} (урон вдвое)</label>
      <label class="row"><input type="checkbox" id="hit-immune" data-hit> ${term('immunity', 'иммунитет')}</label>
      <label class="row"><input type="checkbox" id="hit-massive" data-hitset="massiveRule" ${C.play.massiveRule ? 'checked' : ''}> правило ${term('massive-damage-optional', 'Колоссального урона')} (урон ≥ удвоенного Тяжёлого порога → 4 Раны), если Мастер его включил</label></div></details>
    <div id="hit-preview" class="note">${hitPreviewHTML(x)}</div>
    <div class="row"><button class="primary" data-act="hit-apply">Применить</button><span class="err" id="hit-err"></span></div>
    <div class="row small"><button data-act="stress-1">Очистить 1 Стресс</button><button data-act="hp-1">Очистить 1 Рану</button><button data-act="armor-clear">Починить всю броню</button><button data-act="hope+1">+1 Надежда</button></div></section>`;
}
function hitPreviewHTML(x) {
  const f = readHitForm();
  if (f.dmg === '') return '<span class="muted">Впиши урон: здесь появится расчёт по шагам до того, как что-то отметится.</span>';
  const r = resolveHit(x, f);
  return `<ol style="margin:0;padding-left:20px">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div style="margin-top:6px"><b>Итог:</b> ${RAN(r.hp)}${r.stress ? `, ${STR(r.stress)}` : ''}${r.hope ? `, ${HOP(r.hope)}` : ''}${r.armor ? `, ${SLT(r.armor)}` : ''}.${r.dead ? ' <b style="color:var(--danger)">Это последняя Рана: дальше Предсмертный Ход.</b>' : ''}</div>
    ${r.cap ? `<div class="small muted">Максимум ячеек брони на этот удар: ${r.cap} (${esc(r.capWhy)}).</div>` : ''}`;
}
function applyHit() {
  const x = derive(), f = readHitForm(), err = document.getElementById('hit-err');
  if (f.dmg === '') { err.textContent = 'Впиши, сколько урона прилетело.'; return; }
  const P = C.play;
  if (x.armFeat('Устойчивое')) {
    const pre = resolveHit(x, f);
    if (pre.armor > 0 && num(P.armor) + pre.armor >= x.ar.total) { f.sturdyRoll = d(6); }
  }
  const r = resolveHit(x, f);
  if (r.hope > num(P.hope)) { err.textContent = `Не хватает Надежды: нужно ${r.hope}, есть ${P.hope}. Сними эту опцию.`; return; }
  P.hp = Math.min(x.hp.total, num(P.hp) + r.hp);
  P.stress = Math.min(x.stress.total, num(P.stress) + r.stress);
  P.hope = num(P.hope) - r.hope;
  P.armor = num(P.armor) + r.armor;
  if (r.impen) P.impenUsed = true;
  if (r.swarmUsed) { P.fx.swarm = false; }
  if (r.sev >= 3 && P.fx.earth) { P.fx.earth = false; r.steps.push('Тяжёлый урон: Стихийное воплощение закончилось'); }
  addLog(`Удар ${num(f.dmg)}: <b>${RAN(r.hp)}</b>${r.stress ? `, ${STR(r.stress)}` : ''}${r.armor ? `, ${SLT(r.armor)}` : ''}`);
  refreshTrackers();
  const pv = document.getElementById('hit-preview');
  if (pv) pv.innerHTML = `<b>Применено.</b><ol style="margin:4px 0 0;padding-left:20px">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
}

document.addEventListener('input', (e) => { if (e.target.closest('[data-hit]')) { const pv = document.getElementById('hit-preview'); if (pv) pv.innerHTML = hitPreviewHTML(derive()); } });
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.hitset) { C.play[el.dataset.hitset] = el.checked; save(); }
  if (el.closest('[data-hit]') || el.dataset.hitset) { const pv = document.getElementById('hit-preview'); if (pv) pv.innerHTML = hitPreviewHTML(derive()); }
});

/* ================= ПОВЫШЕНИЕ УРОВНЯ ================= */
/* Таблица улучшений по листу персонажа (ru.daggerheart.su, PDF класса): количество ячеек на ранг. */
const ADV = [
  { id: 'traits', t: '+1 к двум неотмеченным характеристикам (и отметить их)', slots: { 2: 3, 3: 3, 4: 3 } },
  { id: 'hp', t: '+1 ячейка Ран', slots: { 2: 2, 3: 2, 4: 2 } },
  { id: 'stress', t: '+1 ячейка Стресса', slots: { 2: 2, 3: 2, 4: 2 } },
  { id: 'exp', t: '+1 к двум Опытам', slots: { 2: 1, 3: 1, 4: 1 } },
  { id: 'card', t: 'Дополнительная карта домена твоего уровня или ниже', slots: { 2: 1, 3: 1, 4: 1 } },
  { id: 'eva', t: '+1 к Уклонению', slots: { 2: 1, 3: 1, 4: 1 } },
  { id: 'sub', t: 'Улучшенная карта подкласса (Специализация, затем Мастерство)', slots: { 3: 1, 4: 1 } },
  { id: 'prof', t: '+1 к Мастерству (занимает оба выбора)', slots: { 3: 1, 4: 1 }, double: true },
  { id: 'multi', t: 'Мультикласс (занимает оба выбора)', slots: { 3: 1, 4: 1 }, double: true, unsupported: true },
];
function levelState(L) {
  const st = { prof: 0, hp: 0, stress: 0, eva: 0, traits: {}, exps: {}, newExps: [], sub: 0, marked: new Set(), used: {} };
  for (let lv = 2; lv <= L; lv++) {
    const tier = tierOf(lv);
    if (lv === 2 || lv === 5 || lv === 8) st.prof += 1;
    if (lv === 5 || lv === 8) st.marked = new Set();
    const e = (C.levels || {})[lv]; if (!e) continue;
    if (e.newExp) st.newExps.push(e.newExp);
    for (const o of e.opts || []) {
      st.used[`${e.from?.[o] || tier}:${o}`] = (st.used[`${e.from?.[o] || tier}:${o}`] || 0) + 1;
      if (o === 'hp') st.hp++;
      if (o === 'stress') st.stress++;
      if (o === 'eva') st.eva++;
      if (o === 'prof') st.prof++;
      if (o === 'sub') st.sub = Math.min(2, st.sub + 1);
      if (o === 'traits') (e.traits || []).forEach((k) => { st.traits[k] = (st.traits[k] || 0) + 1; st.marked.add(k); });
      if (o === 'exp') (e.exps || []).forEach((i) => { st.exps[i] = (st.exps[i] || 0) + 1; });
    }
  }
  return st;
}
/** Сколько ячеек опции осталось в ранге t к моменту повышения до уровня L. */
function advLeft(L, optId, t) {
  const opt = ADV.find((a) => a.id === optId); const cap = (opt.slots[t] || 0);
  const st = levelState(L - 1);
  return cap - (st.used[`${t}:${optId}`] || 0);
}

/* ================= ЗВЕРИНАЯ ФОРМА ================= */
const TRAIT_BY_NAME = { 'Проворность': 'agi', 'Сила': 'str', 'Искусность': 'fin', 'Инстинкт': 'ins', 'Влияние': 'pre', 'Знание': 'kno' };
function beastStats(b) {
  const t = strip(b.html).replace(/\s+/g, ' ');
  const tm = t.match(/(Проворность|Сила|Искусность|Инстинкт|Влияние|Знание)\s*:\s*\+?(\d+)/);
  const em = t.match(/Уклонение\s*:\s*\+?(\d+)/);
  const am = t.match(/Атака:\s*(Вплотную|Близко|Средне|Далеко)\s+(Проворность|Сила|Искусность|Инстинкт|Влияние|Знание)\s+(d\d+)(?:\s*\+\s*(\d+))?\s+(физ|маг)/);
  return { trait: tm ? TRAIT_BY_NAME[tm[1]] : null, traitBonus: tm ? +tm[2] : 0, eva: em ? +em[1] : 0, fragile: /Хрупкость/.test(t),
    attack: am ? { range: am[1], trait: TRAIT_BY_NAME[am[2]], die: am[3], bonus: +(am[4] || 0), magic: am[5] === 'маг' } : null };
}

/* ================= РЕСУРСЫ: цена и лимиты свойств ================= */
function featCosts(text) {
  const t = strip(text).replace(/\s+/g, ' ');
  const nn = (v) => (v ? num(v) : 1);
  const hope = [...t.matchAll(/(?:[Пп]отратьте|можете\s+потратить|чтобы\s+потратить)\s+(\d+\s+)?(?:очк\S+\s+)?Надежд/g)].map((m) => nn(m[1]));
  const stress = [...t.matchAll(/(?:[Оо]тметьте|можете\s+отметить)\s+(?:дополнительн\S+\s+)?(\d+\s+)?(?:дополнительн\S+\s+)?Стресс/g)].map((m) => nn(m[1]));
  let limit = null, times = 1;
  if (/раз за сессию/i.test(t)) limit = 'session';
  else if (/(до следующего|за)\s+[Пп]родолжительн\S*\s+отдых/i.test(t) && /раз/i.test(t)) limit = 'long';
  else if (/(до следующего|за)\s+(короткий\s+)?отдых/i.test(t) && /[Оо]дин раз|раз за|[Дд]ва раза|[Тт]ри раза/.test(t)) limit = 'rest';
  const tm = t.match(/([Дд]ва|[Тт]ри)\s+раза/); if (tm) times = /[Дд]ва/.test(tm[1]) ? 2 : 3;
  return { hope: [...new Set(hope)], stress: [...new Set(stress)], limit, times };
}
const LIMIT_NAME = { session: 'раз за сессию', long: 'до продолжительного отдыха', rest: 'до отдыха' };
/* Свойства с конкретным эффектом на себя: что сделать при использовании */
const SELF_FX = {
  'Боевой ритуал': { stress: -2, hope: +2 },
  'Щит Передовой': { armor: -2 },
  'Беспощадный': { fx: 'attack1' },
  'Уклонение Плута': { fx: 'rogueDodge' },
  'Неудержимый': { special: 'unstoppable' },
  'Сплочение': { special: 'rally' },
  'Звериная Форма': { special: 'beast' },
  'Эволюция': { special: 'evolve' },
  'Втягивание': { fx: 'retract' },
  'Стихийное воплощение': { special: 'element' },
  'Трансцендентность': { fx: 'transcend' },
  'Метка Следопыта': { special: 'mark' },
};
/* Карты с несколькими опциями: отдельные кнопки для эффектов, которые конструктор применяет сам */
const CARD_ACTIONS = {
  'Призыв роя': [{ label: 'Бронированные жуки на себя', stress: 1, fx: 'swarm', note: 'следующий удар −1 порог' }],
  'Книга Авы': [{ label: 'Доспехи Тавы на себя', hope: 1, fx: 'tava', note: '+1 к Броне до отдыха' }],
};
function cardActionsHTML(f) {
  const acts = CARD_ACTIONS[f.name]; if (!acts) return '';
  return acts.map((a, i) => { const on = C.play.fx?.[a.fx]; return `<button class="small ${on ? 'primary' : ''}" data-cardfx="${esc(f.name)}|${i}" ${on ? 'disabled' : ''}>${esc(a.label)} (${a.hope ? HOP(a.hope) : STR(a.stress)})${on ? ': действует' : ''}</button><span class="small muted">${esc(a.note)}</span>`; }).join('');
}
function featUseHTML(f, srcKey) {
  const c = featCosts(f.text);
  const fx = SELF_FX[f.name];
  const special = srcKey === 'card' ? cardActionsHTML(f) : '';
  if (!c.hope.length && !c.stress.length && !c.limit && !fx) return special ? `<div class="row small use-row">${special}</div>` : '';
  const key = `${srcKey}|${f.name}`;
  const used = num((C.play.uses || {})[key]);
  const out = used >= c.times && c.limit;
  const btn = (kind, n) => `<button class="small" data-use="${esc(key)}" data-kind="${kind}" data-n="${n}" ${out ? 'disabled' : ''}>${kind === 'hope' ? `Потратить ${HOP(n)}` : kind === 'stress' ? `Отметить ${STR(n)}` : 'Использовать'}</button>`;
  const btns = [...c.hope.map((n) => btn('hope', n)), ...c.stress.map((n) => btn('stress', n))];
  if (!btns.length) btns.push(btn('free', 0));
  return `<div class="row small use-row">${special}${btns.join('')}${c.limit ? `<span class="chip ${out ? 'warn' : ''}">${LIMIT_NAME[c.limit]}${c.times > 1 ? ` ×${c.times}` : ''}${used ? `: использовано ${used}` : ''}</span>${used ? `<button class="ghost small" data-unuse="${esc(key)}">вернуть</button>` : ''}` : ''}</div>`;
}
function featLimitOf(key) { const name = key.split('|').slice(1).join('|'); const all = allActiveFeats(derive()); const f = all.find((a) => `${a.src}|${a.f.name}` === key); return f ? featCosts(f.f.text) : { limit: null, times: 1 }; }
function allActiveFeats(x) {
  const arr = [];
  if (!x.cls) return arr;
  if (x.cls.hopeFeature) arr.push({ f: x.cls.hopeFeature, src: 'class', label: 'Свойство Надежды · ' + x.cls.name });
  x.cls.features.forEach((f) => arr.push({ f, src: 'class', label: 'Класс · ' + x.cls.name }));
  x.subFeats.forEach((f) => arr.push({ f, src: 'sub', label: SUB_TIER_NAME[f.tier] + ' · ' + x.sub.name }));
  x.ancFeats.forEach((f) => arr.push({ f, src: 'anc', label: 'Родословная · ' + f.from }));
  (x.com?.features || []).forEach((f) => arr.push({ f, src: 'com', label: 'Сообщество · ' + x.com.name }));
  C.cards.map((id) => CARD[id]).filter(Boolean).forEach((c) => arr.push({ f: { name: c.name, text: c.text }, src: 'card', label: 'Карта · ' + D.domains[c.domain] }));
  return arr;
}
function markStress(n, x) { /* Стресс сверх ячеек превращается в Раны */
  const P = C.play; const free = x.stress.total - num(P.stress);
  if (n <= free) { P.stress = num(P.stress) + n; return 0; }
  P.stress = x.stress.total; const over = n - free; P.hp = Math.min(x.hp.total, num(P.hp) + over); return over;
}
function gainHope(n) { const x = derive(); C.play.hope = Math.max(0, Math.min(x.hopeMax, num(C.play.hope) + n)); }
function useFeature(key, kind, n) {
  const x = derive(), P = C.play, name = key.split('|').slice(1).join('|');
  const err = (t) => { const e = document.getElementById('feat-err'); if (e) e.textContent = t; else alertNote(t); };
  if (kind === 'hope' && num(P.hope) < n) { err(`Не хватает Надежды: нужно ${n}, есть ${P.hope}.`); return; }
  const fx = SELF_FX[name];
  if (fx?.special === 'unstoppable' && P.unstoppable) { err('Ты уже Неудержим.'); return; }
  if (kind === 'hope') P.hope = num(P.hope) - n;
  let over = 0; if (kind === 'stress') over = markStress(n, x);
  P.uses = P.uses || {}; P.uses[key] = num(P.uses[key]) + 1;
  P.fx = P.fx || {};
  if (fx) {
    if (fx.stress) P.stress = Math.max(0, num(P.stress) + fx.stress);
    if (fx.hope) gainHope(fx.hope);
    if (fx.armor) P.armor = Math.max(0, num(P.armor) + fx.armor);
    if (fx.fx) P.fx[fx.fx] = true;
    if (fx.special === 'unstoppable') P.unstoppable = 1;
    if (fx.special === 'rally') P.rally = x.L >= 5 ? 8 : 6;
    if (fx.special === 'beast' || fx.special === 'evolve') { P.beastPending = fx.special; }
    if (fx.special === 'element') P.elementPending = true;
    if (fx.special === 'mark') P.markPending = true;
  }
  addLog(`${esc(name)}${kind === 'hope' ? ` (−${HOP(n)})` : kind === 'stress' ? ` (+${STR(n)})` : ''}${over ? `, Стресс переполнен: +${RAN(over)}` : ''}`);
  refreshTrackers();
}

/* ================= ОТДЫХ, СЕССИИ, ПРЕДСМЕРТНЫЙ ХОД ================= */
let restState = null; // {type:'short'|'long', moves:[...]}
const REST_MOVES = {
  short: [['tend', 'Залечить Раны: 1d4 + ранг'], ['stress', 'Снять Стресс: 1d4 + ранг'], ['armor', 'Ремонт брони: 1d4 + ранг ячеек'], ['prepare', 'Подготовка: +1 Надежда (+2, если вместе с союзником)']],
  long: [['tendAll', 'Залечить все Раны'], ['stressAll', 'Снять весь Стресс'], ['armorAll', 'Полный ремонт брони'], ['prepare', 'Подготовка: +1 Надежда (+2, если вместе с союзником)'], ['project', 'Работа над проектом']],
};
function restHTML(x) {
  const P = C.play;
  if (restState) {
    const list = REST_MOVES[restState.type];
    return `<section class="panel" id="rest-panel"><h2>${restState.type === 'short' ? term('short-rest', 'Короткий отдых') : term('long-rest', 'Продолжительный отдых')}</h2>
      <div class="small muted">Выбери два хода, один и тот же можно дважды. «Для союзника» значит, что эффект достаётся ему, а не тебе. Перед ходами можно бесплатно поменять карты между Рукой и Хранилищем.</div>
      ${[0, 1].map((i) => `<div class="row"><span class="lbl">Ход ${i + 1}</span><select id="rest-m${i}" data-rest="${i}">${list.map(([id, t]) => `<option value="${id}" ${restState.moves[i] === id ? 'selected' : ''}>${t}</option>`).join('')}</select><label class="row small"><input type="checkbox" id="rest-a${i}" data-rest-ally="${i}" ${restState.ally[i] ? 'checked' : ''}> для союзника / вместе с союзником</label></div>`).join('')}
      <div class="row"><button class="primary" data-act="rest-apply">Отдохнуть</button><button class="ghost" data-act="rest-cancel">Отмена</button></div></section>`;
  }
  return `<section class="panel"><h2>Отдых и сессии</h2>
    <div class="row"><button data-act="rest-short">Короткий отдых</button><button data-act="rest-long">Продолжительный отдых</button></div>
    <div class="small muted">Коротких отдыхов подряд: ${num(P.shortRests)} из 3; после трёх следующий должен быть продолжительным.</div>
    <div class="row"><button data-act="session-start">Начало сессии</button><button data-act="session-end">Конец сессии</button></div>
    <div class="small muted">Начало и конец сессии обновляют свойства «раз за сессию», Кости Сплочения, Молитвы и Истребления.</div></section>`;
}
function endEffects(kind) { /* kind: rest | long */
  const P = C.play; P.fx = P.fx || {};
  ['attack1', 'rogueDodge', 'element', 'earth', 'transcend', 'swarm', 'retract', 'tava', 'tr'].forEach((k) => delete P.fx[k]);
  P.impenUsed = false; P.unstoppable = 0; /* сцена закончилась */
  P.uses = Object.fromEntries(Object.entries(P.uses || {}).filter(([k]) => { const c = featLimitOf(k); return !(c.limit === 'rest' || (kind === 'long' && c.limit === 'long')); }));
  if (kind === 'long' && P.companion) { if (num(P.companion.stress) >= companionStressMax()) P.companion.stress = companionStressMax() - 1; }
}
function applyRest() {
  const x = derive(), P = C.play, T = x.tier, log = [];
  for (const i of [0, 1]) {
    const m = document.getElementById('rest-m' + i).value, ally = document.getElementById('rest-a' + i).checked;
    const r = d(4) + T;
    if (m === 'tend') { if (ally) log.push(`союзнику: −${RAN(r)}`); else { P.hp = Math.max(0, num(P.hp) - r); log.push(`Раны −${r} (1d4+${T})`); } }
    if (m === 'stress') { P.stress = Math.max(0, num(P.stress) - r); log.push(`Стресс −${r} (1d4+${T})`); if (P.companion) P.companion.stress = Math.max(0, num(P.companion.stress) - r); }
    if (m === 'armor') { if (ally) log.push(`броня союзника −${r}`); else { P.armor = Math.max(0, num(P.armor) - r); log.push(`Броня −${r} (1d4+${T})`); } }
    if (m === 'prepare') { gainHope(ally ? 2 : 1); log.push(`Надежда +${ally ? 2 : 1}`); }
    if (m === 'tendAll') { if (ally) log.push('союзнику: все Раны'); else { P.hp = 0; log.push('все Раны сняты'); } }
    if (m === 'stressAll') { P.stress = 0; log.push('весь Стресс снят'); if (P.companion) P.companion.stress = 0; }
    if (m === 'armorAll') { if (ally) log.push('броня союзника починена'); else { P.armor = 0; log.push('броня починена'); } }
    if (m === 'project') log.push('работа над проектом');
  }
  const type = restState.type;
  endEffects(type === 'long' ? 'long' : 'rest');
  if (type === 'long') { P.shortRests = 0; P.unstoppableUsed = false; } else P.shortRests = num(P.shortRests) + 1;
  restState = null;
  addLog(`${type === 'long' ? 'Продолжительный' : 'Короткий'} отдых: ${log.join(', ')}`);
  refreshTrackers();
}
function sessionStart() {
  const x = derive(), P = C.play;
  P.uses = Object.fromEntries(Object.entries(P.uses || {}).filter(([k]) => featLimitOf(k).limit !== 'session'));
  if (x.cls?.features.some((f) => f.name === 'Кости Молитвы')) {
    const n = Math.max(0, x.traits[x.spellKey]?.total ?? 0); const extra = x.hasSub('Набожный') ? 1 : 0;
    let dice = Array.from({ length: n + extra }, () => d(4)); if (extra) { dice.sort((a, b) => b - a); dice = dice.slice(0, n); }
    P.prayer = dice; addLog(`Кости Молитвы: ${dice.join(', ') || 'нет (Характеристика Заклинателя 0 или ниже)'}`);
  }
  addLog('Начало сессии'); refreshTrackers();
}
function sessionEnd() {
  const P = C.play;
  P.uses = Object.fromEntries(Object.entries(P.uses || {}).filter(([k]) => featLimitOf(k).limit !== 'session'));
  P.rally = 0; P.prayer = []; P.slayer = 0;
  addLog('Конец сессии: неиспользованные Кости Сплочения, Молитвы и Истребления сняты'); refreshTrackers();
}
function deathHTML(x) {
  const P = C.play;
  if (!(x.hp.total && num(P.hp) >= x.hp.total)) return '';
  return `<div class="note bad stack" style="gap:8px"><b>Последняя Рана отмечена: ${term('death-move', 'Предсмертный Ход')}</b>
    <div class="small">Пламя славы: одно действие, которое критически удаётся, затем смерть. Избежать смерти: без сознания до лечения или продолжительного отдыха, ситуация ухудшается, возможен шрам. Рискнуть всем: Кости Дуальности решают.</div>
    <div class="row"><button data-act="death-avoid">Избежать смерти</button><button data-act="death-risk">Рискнуть всем</button></div><div id="death-out" class="small"></div></div>`;
}

/* ================= СОСТОЯНИЯ ================= */
const CONDS = [['vulnerable', 'Уязвим', 'Броски против тебя с преимуществом.'], ['restrained', 'Обездвижен', 'Не можешь двигаться, но действуешь с места.'], ['hidden', 'Скрыт', 'Броски против тебя с помехой. Теряешь, если тебя увидели или ты атаковал.']];
function condHTML(x) {
  const P = C.play; P.cond = P.cond || {};
  const rogue = x.cls?.features.some((f) => f.name === 'Маскировка');
  const immune = !!P.unstoppable;
  return `<div class="stack" style="gap:6px"><span class="lbl">${term('condition', 'Состояния')}</span><div class="row">${CONDS.map(([k, n, h]) => {
    const block = immune && (k === 'vulnerable' || k === 'restrained');
    const name = k === 'hidden' && rogue ? 'Замаскирован' : n;
    return `<span class="row" style="gap:2px"><button class="chipbtn ${P.cond[k] ? 'on' : ''}" data-cond="${k}" aria-pressed="${!!P.cond[k]}" ${block ? 'disabled title="Неудержимый: нельзя Обездвижить или сделать Уязвимым"' : ''}>${name}</button>${term(k, '?')}</span>`;
  }).join('')}</div>${CONDS.filter(([k]) => P.cond[k]).map(([k, n, h]) => `<div class="small muted">${k === 'hidden' && rogue ? 'Замаскирован: как Скрыт, плюс остаёшься незамеченным, пока не двигаешься. Скрытая атака работает.' : h}</div>`).join('')}
  ${x.has('Стойкий') && x.hp.total - num(P.hp) === 1 ? '<div class="small" style="color:var(--ok)">Орк, Стойкий: осталась 1 Рана, атаки по тебе с помехой.</div>' : ''}</div>`;
}

/* ================= КЛАССОВЫЕ МЕХАНИКИ ================= */
function companionStressMax() { const c = C.play.companion || {}; return 3 + (c.resilient ? 1 : 0); }
function mechanicsHTML(x) {
  if (!x.cls) return '';
  const P = C.play, parts = [];
  const hasF = (n) => x.cls.features.some((f) => f.name === n) || (x.cls.hopeFeature?.name === n);
  if (hasF('Неудержимый')) {
    const max = x.L >= 5 ? 6 : 4;
    parts.push(`<div class="mech"><b>${term('class-feature', 'Кость Неудержимости')}</b> (d${max})
      ${P.unstoppable ? `<div class="row"><span class="bigdie">${P.unstoppable}</span><span class="small">Ты Неудержим: физический урон −1 порог, +${P.unstoppable} к урону, нельзя Обездвижить или сделать Уязвимым.</span></div>
        <div class="row small"><button data-act="unst-up">Цель отметила Рану: +1</button><button class="ghost" data-act="unst-end">Конец сцены</button></div>`
      : `<div class="small muted">Раз до продолжительного отдыха: кнопка «Использовать» у свойства «Неудержимый» ниже.</div>`}</div>`);
  }
  if (hasF('Сплочение')) {
    parts.push(`<div class="mech"><b>Кость Сплочения</b> ${P.rally ? `<span class="chip accent">d${P.rally} у тебя</span>` : '<span class="chip">нет</span>'}
      <div class="small muted">Раз за сессию ты и союзники получаете по кости. Свою можно бросить и прибавить к броску действия, реакции или урона, или снять столько Стресса.</div>
      ${P.rally ? `<div class="row small"><button data-act="rally-stress">Бросить и снять Стресс</button><span class="muted">или отметь её в настройках броска</span></div>` : ''}</div>`);
  }
  if (x.hasSub('Истребление')) {
    parts.push(`<div class="mech"><b>Кости Истребления</b> <span class="chip accent">${num(P.slayer)} из ${x.prof}</span>
      <div class="small muted">При броске с Надеждой можно положить d6 в резерв вместо Надежды (кнопка появится после броска). Тратятся на атаку или урон.</div></div>`);
  }
  if (hasF('Кости Молитвы')) {
    const dice = P.prayer || [];
    parts.push(`<div class="mech"><b>Кости Молитвы</b> ${dice.length ? '' : '<span class="chip">нет, брось в начале сессии</span>'}
      <div class="row">${dice.map((v, i) => `<span class="row" style="gap:4px"><span class="bigdie sm">${v}</span><button class="small" data-pray="${i}" data-how="hope">+${v} Надежды</button><button class="small" data-pray="${i}" data-how="roll">+${v} к броску</button><button class="ghost small" data-pray="${i}" data-how="spend">потратить</button></span>`).join('')}</div>
      <div class="small muted">Каждую кость можно потратить на себя или союзника: уменьшить урон, прибавить к броску после броска или получить столько Надежды.</div></div>`);
  }
  if (hasF('Метка Следопыта')) {
    parts.push(`<div class="mech"><b>Метка Следопыта</b><div class="row small"><input id="mark-t" data-bind="play.mark" value="${esc(P.mark || '')}" placeholder="кто под Меткой" style="flex:1;min-width:140px">${P.mark ? '<button class="ghost" data-act="mark-clear">Снять</button>' : ''}</div>
      ${P.mark ? '<div class="small muted">Когда наносишь ей урон, она отмечает Стресс. При провале атаки по ней можно снять Метку и перебросить Кости Дуальности.</div>' : ''}</div>`);
  }
  if (x.hasSub('Компаньон')) parts.push(companionHTML(x));
  if (hasF('Звериная Форма')) {
    const forms = D.beastforms.filter((b) => b.tier <= x.tier);
    const cur = x.beast;
    parts.push(`<div class="mech"><b>${term('beastform', 'Звериная Форма')}</b>
      ${cur ? `<div class="row"><span class="chip accent">${esc(cur.name)}</span><span class="small">Уклонение +${x.bst.eva}${x.bst.trait ? `, ${TN[x.bst.trait]} +${x.bst.traitBonus}` : ''}${C.play.evolveTrait ? `, Эволюция: ${TN[C.play.evolveTrait]} +1` : ''}${x.bst.attack ? ` · атака ${x.bst.attack.range}, ${TN[x.bst.attack.trait]}, ${x.prof}${x.bst.attack.die}${x.bst.attack.bonus ? '+' + x.bst.attack.bonus : ''}` : ''}</span><button class="ghost" data-act="beast-exit">Выйти из формы</button></div>
        <details><summary>Свойства формы</summary><div class="rich small">${cur.html}</div></details>
        ${x.bst.attack ? `<div class="row small"><button data-act="beast-atk">Атака формой</button><button data-act="beast-dmg">Урон формой</button></div>` : ''}`
      : P.beastPending ? `<div class="row small"><select id="beast-pick">${forms.map((b) => `<option value="${b.id}">${esc(b.name)} (ранг ${b.tier})</option>`).join('')}</select>${P.beastPending === 'evolve' ? `<select id="evolve-trait">${TR.map(([k, n]) => `<option value="${k}">${n} +1</option>`).join('')}</select>` : ''}<button class="primary" data-act="beast-enter">Превратиться</button><button class="ghost" data-act="beast-cancel">Отмена</button></div>`
      : '<div class="small muted">Отметь Стресс у свойства «Звериная Форма» (или 3 Надежды у «Эволюции»), затем выбери форму. В форме нельзя пользоваться оружием и заклинаниями с карт.</div>'}</div>`);
  }
  if (x.hasSub('Стихийное воплощение')) {
    parts.push(`<div class="mech"><b>Стихийное воплощение</b> ${P.fx?.element ? `<span class="chip accent">${esc(P.fx.element)}</span><button class="ghost small" data-act="element-end">Закончить</button>` : P.elementPending ? `<span class="row small">${['Огонь', 'Земля', 'Вода', 'Воздух'].map((e) => `<button data-element="${e}">${e}</button>`).join('')}</span>` : '<span class="small muted">Отметь Стресс у свойства ниже, чтобы выбрать стихию.</span>'}
      ${P.fx?.element === 'Земля' ? `<div class="small" style="color:var(--ok)">Земля: пороги +${x.prof} (уже учтено).</div>` : ''}<div class="small muted">Заканчивается при Тяжёлом уроне или на следующем отдыхе.</div></div>`);
  }
  if (hasF('Странные закономерности')) {
    parts.push(`<div class="mech"><b>Странные закономерности</b><div class="row small"><span>Твоё число</span><input type="number" min="1" max="12" id="strange" data-bind="play.strange" data-num="1" value="${num(P.strange) || ''}" style="width:64px"><span class="muted">Когда оно выпадет на Костях Дуальности, получишь Надежду или снимешь Стресс. Менять после продолжительного отдыха.</span></div></div>`);
  }
  if (x.hasSub('Элементалист')) {
    parts.push(`<div class="mech"><b>Элементалист</b><div class="row small"><span>Стихия</span><select id="elem" data-bind="play.elem">${['', 'Воздух', 'Земля', 'Огонь', 'Молния', 'Вода'].map((e) => `<option ${P.elem === e ? 'selected' : ''}>${e}</option>`).join('')}</select><span class="muted">За 1 Надежду: +2 к броску действия или +3 к урону (в настройках бросков).</span></div></div>`);
  }
  if (!parts.length) return '';
  return `<section class="panel"><h2>Механики класса</h2>${parts.join('')}<div class="err" id="mech-err"></div></section>`;
}
function companionHTML(x) {
  const P = C.play; P.companion = P.companion || { name: '', exp1: '', exp2: '', stress: 0, die: 'd6' };
  const c = P.companion, max = companionStressMax();
  let boxes = ''; for (let i = 0; i < max; i++) boxes += `<button class="box stress ${i < num(c.stress) ? 'on' : ''}" data-comp-box="${i}" aria-label="Стресс компаньона ${i + 1}"></button>`;
  return `<div class="mech"><b>${term('ranger-companion', 'Компаньон')}</b>
    <div class="impact"><label><span class="lbl">Имя и зверь</span><input id="comp-name" data-bind="play.companion.name" value="${esc(c.name)}"></label><label><span class="lbl">Опыт +2</span><input id="comp-e1" data-bind="play.companion.exp1" value="${esc(c.exp1)}"></label><label><span class="lbl">Опыт +2</span><input id="comp-e2" data-bind="play.companion.exp2" value="${esc(c.exp2)}"></label></div>
    <div class="small">Уклонение ${10 + (c.wary ? 2 : 0)} · атака Вплотную, ${x.prof}${esc(c.die || 'd6')} · Стресс ${num(c.stress)} / ${max}</div><div class="boxes">${boxes}</div>
    <div class="small muted">Приказ компаньону: Бросок Заклинания, Опыт компаньона за Надежду. Любой урон по нему = 1 Стресс; на последнем Стрессе он уходит до продолжительного отдыха.</div></div>`;
}

/* ================= БРОСКИ ДУАЛЬНОСТИ (расширенные) ================= */
let lastDual = null;
function rollerHTML(x) {
  const P = C.play;
  const opts = `<option value="">без характеристики</option>` + TR.map(([k, n]) => `<option value="${k}">${n} (${x.traits[k].total == null ? '—' : sign(x.traits[k].total)})${x.spellKey === k ? ' — заклинание' : ''}</option>`).join('');
  const pre = [];
  if (x.hasSub('Справиться с вызовом') && x.hp.total - num(P.hp) <= 2) pre.push(`<label class="row small"><input type="checkbox" id="r-d20h" checked> Справиться с вызовом: d20 вместо кости Надежды</label>`);
  if (x.hasSub('Элементалист')) pre.push(`<label class="row small"><input type="checkbox" id="r-elem"> Элементалист: +2 за 1 Надежду</label>`);
  if (x.hasSub('Адепт')) pre.push(`<label class="row small"><input type="checkbox" id="r-adept"> Адепт: Опыт за Стресс вместо Надежды, модификатор ×2</label>`);
  if (P.fx?.attack1) pre.push('<span class="small chip ok">Беспощадный: +1 к атакам до отдыха</span>');
  if (P.rally) pre.push(`<label class="row small"><input type="checkbox" id="r-rally"> + Кость Сплочения d${P.rally}</label>`);
  pre.push(`<label class="row small"><input type="checkbox" id="r-tag"> ${term('tag-team-roll', 'Командный бросок')} (3 Надежды, раз за сессию)</label>`);
  return `<section class="panel roller"><h2>${term('duality-dice', 'Кости Дуальности')} <span class="lbl">2d12</span></h2>
    <div class="rc"><label><span class="lbl">Характеристика</span><select id="r-trait">${opts}</select></label>
      <label><span class="lbl">${term('advantage-and-disadvantage', 'Преимущества')}</span><input id="r-adv" type="number" min="0" max="5" value="0"></label>
      <label><span class="lbl">Помехи</span><input id="r-dis" type="number" min="0" max="5" value="0"></label>
      <label><span class="lbl">Доп. модификатор</span><input id="r-mod" type="number" value="0"></label>
      <label><span class="lbl">${term('difficulty', 'Сложность')}</span><input id="r-dc" type="number" placeholder="если знаешь"></label></div>
    <div class="small muted">Преимущество и помеха гасят друг друга. Несколько преимуществ (например, ${term('help-an-ally', 'помощь союзников')}): бросаются все d6, берётся лучшая.</div>
    <div><span class="lbl">${term('utilize-an-experience', 'Опыт')} (1 Надежда за каждый)</span><div class="row">${x.exps.map((e, i) => e.name ? `<label class="row small"><input type="checkbox" data-exp="${i}"> ${esc(e.name)} ${sign(e.mod)}</label>` : '').join('') || '<span class="muted small">нет опыта</span>'}</div></div>
    ${pre.length ? `<div class="stack" style="gap:3px">${pre.join('')}</div>` : ''}
    <div class="row"><button class="primary" data-act="roll">Бросить</button><label class="row small"><input type="checkbox" id="r-react"> ${term('reaction-roll', 'бросок реакции')}</label><label class="row small"><input type="checkbox" id="r-attack"> атака</label><label class="row small"><input type="checkbox" id="r-auto" checked> менять ресурсы</label></div>
    <div class="err" id="r-err" role="alert"></div>
    <div class="result" id="r-out" aria-live="polite">${dieHTML('h', 'Надежда')}${dieHTML('f', 'Страх')}
      <div class="verdict">${lastRoll ? lastRoll.verdict : '<div class="how muted">Клик по характеристике или «Бросить»</div><div class="math">Больше на кости Надежды — ты получаешь Надежду, больше на кости Страха — Страх получает Мастер, дубль — критический успех.</div>'}</div></div>
    <div id="post-roll" class="row small">${lastDual ? postRollHTML(derive()) : ''}</div>
    ${dmgOptsHTML(x)}
    <details><summary>Другие броски</summary><div><div class="row"><label class="row small">Сколько <input id="q-n" type="number" min="1" max="20" value="1" style="width:56px"></label>${[4, 6, 8, 10, 12, 20, 100].map((s) => `<button data-q="${s}">d${s}</button>`).join('')}</div>
      <div class="row"><input id="q-f" placeholder="формула: 2d6+1d4+3" style="flex:1;min-width:150px" aria-label="Формула броска"><button data-act="formula">Бросить</button></div></div></details>
    <div><span class="lbl">Журнал</span><div class="log" id="log">${C.play.log.map((l) => `<div><span class="muted">${l.t}</span> ${l.h}</div>`).join('') || '<span class="muted small">Бросков пока не было.</span>'}</div></div></section>`;
}
function readRollForm() {
  const g = (id) => document.getElementById(id), ch = (id) => !!g(id)?.checked;
  return { adv: num(g('r-adv')?.value), dis: num(g('r-dis')?.value), mod: num(g('r-mod')?.value), dc: (g('r-dc')?.value ?? '') === '' ? null : num(g('r-dc').value),
    react: ch('r-react'), attack: ch('r-attack'), auto: g('r-auto') ? g('r-auto').checked : true, d20h: ch('r-d20h'), elem: ch('r-elem'), adept: ch('r-adept'), rally: ch('r-rally'), tag: ch('r-tag'),
    picks: [...document.querySelectorAll('[data-exp]:checked')].map((el) => +el.dataset.exp) };
}
function duality(traitKey, label, extra = 0, opt = {}) {
  const x = derive(), P = C.play, err = document.getElementById('r-err'); if (err) err.textContent = '';
  const f = opt.form || readRollForm();
  if (opt.attack) f.attack = true;
  const picks = f.picks.map((i) => x.exps[i]).filter(Boolean);
  let hopeCost = (f.adept ? 0 : picks.length) + (f.elem ? 1 : 0) + (f.tag ? 3 : 0), stressCost = f.adept ? picks.length : 0;
  if (opt.reroll) { hopeCost = 0; stressCost = 0; }
  if (f.auto && hopeCost > num(P.hope)) { if (err) err.textContent = `Не хватает Надежды: нужно ${hopeCost}, есть ${P.hope}.`; return; }
  if (f.tag && !opt.reroll && num(P.uses?.tagteam)) { if (err) err.textContent = 'Командный бросок уже был в этой сессии.'; return; }
  const hd = f.d20h ? 20 : 12;
  const h = d(hd), fe = d(12);
  const net = f.adv - f.dis; let advRoll = 0, advDice = [];
  if (net > 0) { advDice = Array.from({ length: net }, () => d(6)); advRoll = Math.max(...advDice); } else if (net < 0) { advDice = [d(6)]; advRoll = -advDice[0]; }
  const tv = traitKey ? (x.traits[traitKey].total ?? 0) : 0;
  const ev = picks.reduce((s, e) => s + e.mod * (f.adept ? 2 : 1), 0);
  const atkBonus = f.attack && P.fx?.attack1 ? 1 : 0;
  const rallyRoll = f.rally && P.rally ? d(P.rally) : 0;
  const potion = traitKey && P.fx?.nextRoll?.[traitKey] ? 1 : 0;
  if (potion) delete P.fx.nextRoll[traitKey];
  const total = h + fe + tv + ev + f.mod + extra + advRoll + (f.elem ? 2 : 0) + atkBonus + rallyRoll + potion;
  if (f.auto && !opt.reroll) { P.hope = num(P.hope) - hopeCost; if (stressCost) markStress(stressCost, x); if (f.tag) { P.uses = P.uses || {}; P.uses.tagteam = 1; } if (rallyRoll) P.rally = 0; }
  const crit = h === fe && hd === 12 || (hd === 20 && h === fe);
  const ok = crit ? true : f.dc == null ? null : total >= f.dc;
  const withHope = h > fe;
  let how, cls, eff = [];
  if (f.react) { how = crit ? 'Реакция: критический успех' : ok == null ? 'Бросок реакции' : ok ? 'Реакция: успех' : 'Реакция: провал'; cls = crit ? 'crit' : ok === false ? 'fear' : 'hope'; eff.push('Надежда и Страх не меняются'); }
  else if (crit) { how = 'Критический успех'; cls = 'crit'; eff.push('+1 Надежда, −1 Стресс'); if (f.auto) { gainHope(1); P.stress = Math.max(0, num(P.stress) - 1); } }
  else if (withHope) { how = ok == null ? 'С Надеждой' : ok ? 'Успех с Надеждой' : 'Провал с Надеждой'; cls = 'hope'; eff.push('+1 Надежда'); if (f.auto) gainHope(1); }
  else {
    how = ok == null ? 'Со Страхом' : ok ? 'Успех со Страхом' : 'Провал со Страхом'; cls = 'fear'; eff.push(f.tag ? 'Мастер получает Страх за каждого участника' : 'Мастер получает Страх');
    if (ok === false && x.hasSub('Храбрость')) { eff.push('Храбрость: +1 Надежда'); if (f.auto) gainHope(1); }
  }
  if (f.tag && withHope && !f.react) eff.push('все участники получают Надежду');
  const parts = [`${h}${hd === 20 ? '(d20)' : ''}+${fe}`];
  if (traitKey) parts.push(`${TN[traitKey]} ${sign(tv)}`);
  picks.forEach((e) => parts.push(`${e.name} ${sign(e.mod * (f.adept ? 2 : 1))}`));
  if (advDice.length) parts.push(net > 0 ? `преим. [${advDice.join(',')}] → +${advRoll}` : `помеха −${-advRoll}`);
  if (f.elem) parts.push('Элементалист +2');
  if (atkBonus) parts.push('Беспощадный +1');
  if (rallyRoll) parts.push(`Сплочение +${rallyRoll}`);
  if (potion) parts.push('зелье +1');
  if (f.mod + extra) parts.push(`мод. ${sign(f.mod + extra)}`);
  if (f.tag) parts.push('Командный бросок');
  lastDual = { traitKey, label, extra, form: { ...f, picks: f.picks }, h, f: fe, total, ok, crit, withHope, attack: f.attack, react: f.react, picksUsed: picks.length, bonus: 0, hd, strangeDone: false, slayerDone: false, poetDone: false };
  P.lastAttackFear = !!(f.attack && ok && !withHope && !crit);
  const math = parts.join(' · ') + (f.dc != null ? ` против ${f.dc}` : '') + ` → ${eff.join(', ')}`;
  const dh = document.getElementById('d-h'), df = document.getElementById('d-f');
  if (dh) { dh.innerHTML = `${h}<small>Надежда${hd === 20 ? ' d20' : ''}</small>`; df.innerHTML = `${fe}<small>Страх</small>`; dh.classList.toggle('dim', h < fe); df.classList.toggle('dim', fe < h); [dh, df].forEach((el) => { el.classList.remove('spin'); void el.offsetWidth; el.classList.add('spin'); }); }
  showVerdict(`<div class="total">${total}</div><div class="how ${cls}">${how}</div><div class="math">${esc(math)}</div>`, h, fe);
  addLog(`${esc(label)}: <b class="mono">${total}</b> ${how.toLowerCase()} <span class="muted">(${esc(math)})</span>`);
  document.querySelectorAll('[data-exp]:checked').forEach((el) => (el.checked = false));
  refreshTrackers();
}
function postRollHTML(x) {
  const L = lastDual, P = C.play; if (!L) return '';
  const b = [];
  const failed = L.ok === false;
  if (x.hasSub('Душа поэта') && !L.poetDone) b.push(`<button data-post="poet">Душа поэта: +d4 (1 Надежда)</button>`);
  if (x.has('Адаптивность') && failed && L.picksUsed) b.push(`<button data-post="adapt">Адаптивность: переброс (1 Стресс)</button>`);
  if (x.has('Везунчик') && !num(P.uses?.['anc|Везунчик'])) b.push(`<button data-post="lucky">Везунчик: переброс Костей Дуальности (3 Надежды, раз за сессию)</button>`);
  if (P.mark && failed && L.attack) b.push(`<button data-post="mark">Снять Метку и перебросить</button>`);
  if (x.hasSub('Истребление') && L.withHope && !L.react && !L.slayerDone && num(P.slayer) < x.prof) b.push(`<button data-post="slayer">d6 в Кости Истребления вместо Надежды</button>`);
  const sn = num(P.strange);
  if (sn && !L.strangeDone && (L.h === sn || L.f === sn) && x.cls?.features.some((f) => f.name === 'Странные закономерности')) b.push(`<span>Выпало ${sn}:</span><button data-post="strange-hope">+1 Надежда</button><button data-post="strange-stress">−1 Стресс</button>`);
  if (L.total != null && L.bonus) b.push(`<span class="muted">к результату добавлено ${sign(L.bonus)} → ${L.total + L.bonus}</span>`);
  if (L.attack && P.lastAttackFear && x.hasSub('Победи свой страх')) b.push('<span class="chip ok">Победи свой страх: урон этой атаки +1d10 магического</span>');
  return b.join('');
}
function postRoll(kind) {
  const x = derive(), P = C.play, L = lastDual; if (!L) return;
  const err = document.getElementById('r-err');
  const reroll = () => duality(L.traitKey, L.label + ' (переброс)', L.extra, { form: { ...L.form, tag: false, rally: false, elem: false, picks: L.form.picks }, reroll: true });
  if (kind === 'poet') { if (num(P.hope) < 1) { err.textContent = 'Нет Надежды.'; return; } P.hope--; const r = d(4); L.bonus += r; L.poetDone = true; addLog(`Душа поэта: +${r} → итог ${L.total + L.bonus}`); }
  if (kind === 'adapt') { markStress(1, x); addLog('Адаптивность: переброс за 1 Стресс'); save(); return reroll(); }
  if (kind === 'lucky') { if (num(P.hope) < 3) { err.textContent = 'Нужно 3 Надежды.'; return; } P.hope -= 3; P.uses = P.uses || {}; P.uses['anc|Везунчик'] = 1; addLog('Везунчик: переброс за 3 Надежды'); save(); return reroll(); }
  if (kind === 'mark') { P.mark = ''; addLog('Метка снята ради переброса'); save(); return reroll(); }
  if (kind === 'slayer') { P.hope = Math.max(0, num(P.hope) - 1); P.slayer = num(P.slayer) + 1; L.slayerDone = true; addLog('Кость Истребления в резерв вместо Надежды'); }
  if (kind === 'strange-hope') { gainHope(1); L.strangeDone = true; addLog('Странные закономерности: +1 Надежда'); }
  if (kind === 'strange-stress') { P.stress = Math.max(0, num(P.stress) - 1); L.strangeDone = true; addLog('Странные закономерности: −1 Стресс'); }
  refreshTrackers();
}

/* ================= УРОН ОРУЖИЕМ (расширенный) ================= */
function dmgOptsHTML(x) {
  const P = C.play, o = [];
  if (x.inHand('not-good-enough')) o.push(`<label class="row small"><input type="checkbox" id="d-nge" checked> «Так не пойдёт»: перебросить все 1 и 2</label>`);
  if (x.has('Бивни')) o.push(`<label class="row small"><input type="checkbox" id="d-tusks"> Бивни: +1d6 вплотную (1 Надежда)</label>`);
  if (x.cls?.features.some((f) => f.name === 'Скрытая Атака')) o.push(`<label class="row small"><input type="checkbox" id="d-sneak" ${P.cond?.hidden ? 'checked' : ''}> Скрытая атака: +${x.tier}d6 (Замаскирован или союзник вплотную к цели)</label>`);
  if (x.hasSub('Крылья света')) o.push(`<label class="row small"><input type="checkbox" id="d-wings"> Крылья света: +1d8 в полёте (1 Надежда)</label>`);
  if (x.hasSub('Элементалист')) o.push(`<label class="row small"><input type="checkbox" id="d-elem"> Элементалист: +3 (1 Надежда)</label>`);
  if (x.hasSub('Безжалостный хищник')) o.push(`<label class="row small"><input type="checkbox" id="d-pred"> Безжалостный хищник: Мастерство +1 (1 Стресс)</label>`);
  if (num(P.slayer)) o.push(`<label class="row small">Кости Истребления <input type="number" id="d-slayer" min="0" max="${num(P.slayer)}" value="0" style="width:56px"> из ${num(P.slayer)}</label>`);
  if (P.rally) o.push(`<label class="row small"><input type="checkbox" id="d-rally"> + Кость Сплочения d${P.rally}</label>`);
  const sec = x.sw ? x.sw.features.filter((f) => /урону основного оружия/.test(strip(f.text))) : [];
  sec.forEach((f) => { const m = strip(f.text).match(/\+(\d+)\s*к урону основного/); if (m) o.push(`<label class="row small"><input type="checkbox" id="d-pair" data-v="${m[1]}"> ${esc(f.name)}: +${m[1]} по цели вплотную к тебе</label>`); });
  if (x.hasSub('Адреналин') && P.cond?.vulnerable) o.push(`<span class="small chip ok">Адреналин: +${x.L} к урону, пока Уязвим</span>`);
  if (P.unstoppable) o.push(`<span class="small chip ok">Неудержимый: +${P.unstoppable} к урону</span>`);
  if (!o.length) return '';
  return `<details ${o.length ? 'open' : ''}><summary>Настройки урона</summary><div class="stack" style="gap:3px">${o.join('')}</div></details>`;
}
function rollDamage(id, crit, override) {
  const x = derive(), P = C.play, err = document.getElementById('r-err');
  const w = override || WPN[id]; if (!w) return;
  const g = (k) => document.getElementById(k), ch = (k) => !!g(k)?.checked;
  let hope = 0, stress = 0;
  if (ch('d-tusks')) hope++; if (ch('d-wings')) hope++; if (ch('d-elem')) hope++; if (ch('d-pred')) stress++;
  if (hope > num(P.hope)) { if (err) err.textContent = `Не хватает Надежды: нужно ${hope}, есть ${P.hope}.`; return; }
  const sides = num((w.die.match(/d(\d+)/) || [])[1]);
  const n = Math.max(1, x.prof + (ch('d-pred') ? 1 : 0));
  const parts = [];
  const powerful = (w.features || []).some((f) => /дополнительную\s+кость урона и отбросьте/i.test(strip(f.text)));
  let rolls = Array.from({ length: n + (powerful ? 1 : 0) }, () => d(sides));
  if (ch('d-nge')) { const before = rolls.join(','); rolls = rolls.map((v) => (v <= 2 ? d(sides) : v)); if (before !== rolls.join(',')) parts.push(`«Так не пойдёт»: [${before}] → [${rolls.join(',')}]`); }
  if (powerful) { const low = Math.min(...rolls); rolls.splice(rolls.indexOf(low), 1); parts.push(`${w.features.find((f) => /дополнительную/.test(strip(f.text))).name}: отброшена ${low}`); }
  let total = rolls.reduce((s, v) => s + v, 0) + (w.bonus || 0);
  parts.unshift(`${n}d${sides} [${rolls.join(', ')}]${w.bonus ? ' +' + w.bonus : ''}`);
  if (crit) { total += sides * n; parts.push(`крит +${sides * n}`); }
  if (isWarrior(x) && !w.magic && !override) { total += x.L; parts.push(`Боевая подготовка +${x.L}`); }
  const add = (v, t) => { total += v; parts.push(`${t} +${v}`); };
  if (ch('d-tusks')) add(d(6), 'Бивни');
  if (ch('d-sneak')) { const r = Array.from({ length: x.tier }, () => d(6)); add(r.reduce((a, b) => a + b, 0), `Скрытая атака [${r.join(',')}]`); }
  if (ch('d-wings')) add(d(8), 'Крылья света');
  if (ch('d-elem')) add(3, 'Элементалист');
  if (num(g('d-slayer')?.value)) { const k = Math.min(num(P.slayer), num(g('d-slayer').value)); const r = Array.from({ length: k }, () => d(6)); add(r.reduce((a, b) => a + b, 0), `Истребление [${r.join(',')}]`); P.slayer -= k; }
  if (ch('d-rally') && P.rally) { add(d(P.rally), 'Сплочение'); P.rally = 0; }
  if (ch('d-pair')) add(num(g('d-pair').dataset.v), 'вспомогательное оружие');
  if (x.hasSub('Адреналин') && P.cond?.vulnerable) add(x.L, 'Адреналин');
  if (P.unstoppable) add(P.unstoppable, 'Неудержимость');
  if (!override && (P.fx?.nextDmg || []).length) { for (const ex of P.fx.nextDmg) { const r = rollExpr(ex); add(r.v, `${ex} (расходник)`); } P.fx.nextDmg = []; }
  let extraMag = '';
  if (P.lastAttackFear && x.hasSub('Победи свой страх')) { const r = d(10); extraMag = ` + ${r} магического (Победи свой страх)`; P.lastAttackFear = false; }
  P.hope = num(P.hope) - hope; if (stress) markStress(stress, x);
  const math = parts.join(' · ');
  showVerdict(`<div class="total">${total}${extraMag ? `<span class="small"> ${esc(extraMag)}</span>` : ''}</div><div class="how">${crit ? 'Критический урон' : 'Урон'}: ${esc(w.name)}</div><div class="math">${esc(math)} · ${w.magic ? 'магический' : 'физический'}</div>`);
  addLog(`Урон ${esc(w.name)}: <b class="mono">${total}</b>${esc(extraMag)} <span class="muted">(${esc(math)})</span>`);
  if (P.mark) addLog(`Если цель — ${esc(P.mark)} (под Меткой), она отмечает Стресс.`);
  ['d-tusks', 'd-wings', 'd-elem', 'd-pred', 'd-rally', 'd-pair'].forEach((k) => { if (g(k)) g(k).checked = false; });
  refreshTrackers();
}

/* ================= МАСТЕР ПОВЫШЕНИЯ УРОВНЯ ================= */
let lvlDraft = null;
function levelHTML(x) {
  const L = x.L, next = L + 1, P = C.play;
  if (!lvlDraft) {
    return `<section class="panel"><h2>${term('leveling-up', 'Повышение уровня')}</h2>
      <div class="small muted">Сейчас ${L} уровень, ранг ${x.tier}, Мастерство ${x.prof}. Повышай, когда Мастер объявит новый уровень.</div>
      <div class="row">${L < 10 ? `<button class="primary" data-act="lvl-start">Повысить до ${next} уровня</button>` : ''}${L > 1 && C.levels?.[L] ? `<button class="ghost danger" data-act="lvl-undo">Отменить ${L} уровень</button>` : ''}</div>
      ${levelHistoryHTML(x)}
      <details><summary>Ручные поправки</summary><div>
        ${x.sub ? `<label class="row small"><span>Свойства подкласса вручную</span><select id="subtier" data-bind="subTier">${SUB_TIERS.map((t, i) => `<option value="${t}" ${(C.subTier || 'foundation') === t ? 'selected' : ''}>${SUB_TIERS.slice(0, i + 1).map((q) => SUB_TIER_NAME[q]).join(' + ')}</option>`).join('')}</select></label>` : ''}
        <div class="impact">${[['hp', 'Ячейки Ран'], ['stress', 'Ячейки Стресса'], ['eva', 'Уклонение'], ['armor', 'Броня'], ['prof', 'Мастерство'], ['thr', 'Пороги']].map(([k, n]) => `<label><span class="lbl">${n} ±</span><input type="number" id="adj-${k}" data-bind="adj.${k}" data-num="1" value="${num(C.adj[k])}"></label>`).join('')}</div>
        <label class="row small"><span>Шрамы (зачёркнутые ячейки Надежды)</span><input type="number" min="0" max="6" id="scars" data-bind="play.scars" data-num="1" value="${num(P.scars)}" style="width:64px"></label>
        <div class="small muted">Для эффектов, которых конструктор не знает: предметы, решения Мастера, мультикласс.</div></div></details></section>`;
  }
  const t = tierOf(next), dr = lvlDraft;
  const ach = next === 2 || next === 5 || next === 8;
  const st = levelState(L);
  const slotsUsed = dr.opts.reduce((s, o) => s + (ADV.find((a) => a.id === o).double ? 2 : 1), 0);
  const avail = (a) => { for (let tt = t; tt >= 2; tt--) if ((a.slots[tt] || 0) - (st.used[`${tt}:${a.id}`] || 0) - dr.opts.filter((o) => o === a.id && (dr.from[o] || t) === tt).length > 0) return tt; return 0; };
  const optRows = ADV.map((a) => {
    const fromT = avail(a), picked = dr.opts.filter((o) => o === a.id).length;
    const disabled = a.unsupported || (!picked && (!fromT || slotsUsed + (a.double ? 2 : 1) > 2)) || (a.id === 'sub' && x.LV.sub + picked >= 2 && !picked) || (a.id === 'multi');
    const rem = (a.slots[t] || 0) - (st.used[`${t}:${a.id}`] || 0);
    const more = picked > 0 && !a.double && fromT && slotsUsed < 2;
    return `<div class="row" style="flex-wrap:nowrap;align-items:stretch"><button class="opt check" style="flex:1" data-lvl-opt="${a.id}" aria-pressed="${picked > 0}" ${disabled && !picked ? 'disabled' : ''}><span class="radio"></span><span class="stack" style="gap:2px"><span>${a.t}${picked > 1 ? ` ×${picked}` : ''}</span><span class="small muted">${a.slots[t] ? `в ранге ${t} осталось ${Math.max(0, rem)} из ${a.slots[t]}` : 'недоступно в этом ранге'}${fromT && fromT < t ? `, можно взять из ранга ${fromT}` : ''}${a.unsupported ? ' · конструктор пока не умеет, отметь вручную' : ''}</span></span></button>${more ? `<button class="small" data-lvl-more="${a.id}">ещё раз</button>` : ''}</div>`;
  }).join('');
  const sub = [];
  if (dr.opts.includes('traits')) {
    const n = dr.opts.filter((o) => o === 'traits').length * 2;
    sub.push(`<div><b>Какие характеристики +1</b> <span class="small muted">(выбери ${n}; отмеченные в этом ранге недоступны до ${t < 3 ? 5 : t < 4 ? 8 : '—'} уровня)</span><div class="row">${TR.map(([k, nm]) => { const marked = st.marked.has(k) && !(next === 5 || next === 8); return `<label class="row small"><input type="checkbox" data-lvl-trait="${k}" ${dr.traits.includes(k) ? 'checked' : ''} ${marked ? 'disabled' : ''}> ${nm}${marked ? ' (отмечена)' : ''}</label>`; }).join('')}</div></div>`);
  }
  if (dr.opts.includes('exp')) sub.push(`<div><b>Какие два Опыта +1</b><div class="row">${x.exps.map((e, i) => e.name ? `<label class="row small"><input type="checkbox" data-lvl-exp="${i}" ${dr.exps.includes(i) ? 'checked' : ''}> ${esc(e.name)} ${sign(e.mod)}</label>` : '').join('')}</div></div>`);
  const cardOpts = (sel, id) => `<select id="${id}" data-lvl-card="${id}"><option value="">— выбери —</option>${D.cards.filter((c) => x.cls.domains.includes(c.domain) && c.level <= next && !C.cards.includes(c.id) && !C.vault.includes(c.id)).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'ru')).map((c) => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>ур. ${c.level} · ${esc(c.name)} · ${esc(D.domains[c.domain])}</option>`).join('')}</select>`;
  if (dr.opts.includes('card')) sub.push(`<div><b>Дополнительная карта</b> ${cardOpts(dr.extraCard, 'lvl-extra')}</div>`);
  if (dr.opts.includes('sub')) sub.push(`<div class="small"><b>Подкласс:</b> откроется ${x.LV.sub === 0 ? 'Специализация' : 'Мастерство'}: ${(x.sub?.[x.LV.sub === 0 ? 'specialization' : 'mastery'] || []).map((f) => esc(f.name)).join(', ')}</div>`);
  const ready = slotsUsed === 2 && (!dr.opts.includes('traits') || dr.traits.length === dr.opts.filter((o) => o === 'traits').length * 2) && (!dr.opts.includes('exp') || dr.exps.length === 2) && (!dr.opts.includes('card') || dr.extraCard) && dr.card && (!ach || dr.newExp.trim()) && (!dr.swapFrom || dr.swapTo);
  return `<section class="panel" id="lvl-panel"><h2>Повышение до ${next} уровня</h2>
    <div class="stack"><div><span class="lbl">Шаг 1 · Достижения ранга</span>${ach ? `<div class="small">На ${next} уровне: новый Опыт +2, Мастерство +1${next > 2 ? ', снимаются все отметки с характеристик' : ''}.</div><input id="lvl-newexp" data-lvl-newexp value="${esc(dr.newExp)}" placeholder="Новый Опыт">` : '<div class="small muted">На этом уровне достижений нет.</div>'}</div>
    <div><span class="lbl">Шаг 2 · Два улучшения</span> <span class="small">${slotsUsed} из 2</span><div class="optlist">${optRows}</div></div>
    ${sub.length ? `<div class="stack">${sub.join('')}</div>` : ''}
    <div><span class="lbl">Шаг 3 · Пороги урона</span><div class="small">+1 к обоим порогам, учтётся само.</div></div>
    <div><span class="lbl">Шаг 4 · Новая карта домена</span><div class="small muted">Твоего уровня или ниже. Ляжет в Руку, если там меньше 5 карт, иначе в Хранилище.</div>${cardOpts(dr.card, 'lvl-card')}
      <div class="stack" style="gap:4px;margin-top:8px"><span class="small"><b>Необязательно:</b> обменять одну ранее взятую карту на другую того же уровня или ниже.</span>
        <div class="row small"><select id="lvl-swap-from" data-lvl-swap="from"><option value="">— не меняю —</option>${[...C.cards, ...C.vault].map((id) => CARD[id]).filter(Boolean).map((c) => `<option value="${c.id}" ${dr.swapFrom === c.id ? 'selected' : ''}>ур. ${c.level} · ${esc(c.name)}</option>`).join('')}</select>
        ${dr.swapFrom ? `<span>→</span><select id="lvl-swap-to" data-lvl-swap="to"><option value="">— выбери замену —</option>${D.cards.filter((c) => x.cls.domains.includes(c.domain) && c.level <= (CARD[dr.swapFrom]?.level || 0) && !C.cards.includes(c.id) && !C.vault.includes(c.id) && c.id !== dr.card && c.id !== dr.extraCard).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'ru')).map((c) => `<option value="${c.id}" ${dr.swapTo === c.id ? 'selected' : ''}>ур. ${c.level} · ${esc(c.name)} · ${esc(D.domains[c.domain])}</option>`).join('')}</select>` : ''}</div></div></div>
    <div class="row"><button class="primary" data-act="lvl-apply" ${ready ? '' : 'disabled'}>Готово: ${next} уровень</button><button class="ghost" data-act="lvl-cancel">Отмена</button>${ready ? '' : '<span class="small muted">Заполни все шаги</span>'}</div></div></section>`;
}
function levelHistoryHTML(x) {
  const rows = Object.entries(C.levels || {}).filter(([lv]) => +lv <= x.L).sort((a, b) => a[0] - b[0]).map(([lv, e]) => `<div class="small">· ${lv} ур.: ${(e.opts || []).map((o) => { const a = ADV.find((q) => q.id === o); return o === 'traits' ? `+1 ${e.traits.map((k) => TN[k]).join(', ')}` : o === 'exp' ? '+1 к двум Опытам' : a.t.split(' (')[0]; }).join('; ')}${e.newExp ? `; Опыт «${esc(e.newExp)}»` : ''}${e.card ? `; карта «${esc(CARD[e.card]?.name || '')}»` : ''}${e.swap ? `; обмен «${esc(CARD[e.swap.from]?.name || '')}» → «${esc(CARD[e.swap.to]?.name || '')}»` : ''}</div>`);
  return rows.length ? `<div class="stack" style="gap:2px">${rows.join('')}</div>` : '';
}
function lvlApply() {
  const x = derive(), next = x.L + 1, dr = lvlDraft;
  C.levels = C.levels || {};
  C.levels[next] = { opts: dr.opts, from: dr.from, traits: dr.traits, exps: dr.exps, newExp: dr.newExp.trim(), card: dr.card, extraCard: dr.extraCard, swap: dr.swapFrom && dr.swapTo ? { from: dr.swapFrom, to: dr.swapTo } : null };
  if (dr.swapFrom && dr.swapTo) { C.cards = C.cards.map((c) => (c === dr.swapFrom ? dr.swapTo : c)); C.vault = C.vault.map((c) => (c === dr.swapFrom ? dr.swapTo : c)); }
  for (const id of [dr.card, dr.extraCard].filter(Boolean)) { if (C.cards.length < 5) C.cards.push(id); else C.vault.push(id); }
  C.level = next; lvlDraft = null;
  addLog(`Новый уровень: ${next}`); refreshTrackers();
}
function lvlUndo() {
  const L = num(C.level), e = (C.levels || {})[L]; if (!e) return;
  for (const id of [e.card, e.extraCard].filter(Boolean)) { C.cards = C.cards.filter((c) => c !== id); C.vault = C.vault.filter((c) => c !== id); }
  if (e.swap) { C.cards = C.cards.map((c) => (c === e.swap.to ? e.swap.from : c)); C.vault = C.vault.map((c) => (c === e.swap.to ? e.swap.from : c)); }
  delete C.levels[L]; C.level = L - 1; addLog(`Уровень ${L} отменён`); refreshTrackers();
}

/* ================= СОБЫТИЯ ================= */
document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const P = C.play; P.fx = P.fx || {}; P.cond = P.cond || {};
  const x = () => derive();
  const mechErr = (t) => { const el = document.getElementById('mech-err'); if (el) el.textContent = t; };
  if (b.dataset.use) return useFeature(b.dataset.use, b.dataset.kind, num(b.dataset.n));
  if (b.dataset.cardfx) {
    const [nm, i] = b.dataset.cardfx.split('|'), a = CARD_ACTIONS[nm][+i], xx = derive();
    if (a.hope && num(P.hope) < a.hope) { alertNote(`Не хватает Надежды: нужно ${a.hope}.`); return; }
    if (a.hope) P.hope -= a.hope; let over = 0; if (a.stress) over = markStress(a.stress, xx);
    P.fx[a.fx] = true; addLog(`${esc(nm)}: ${esc(a.label)}${over ? `, +${RAN(over)} (Стресс переполнен)` : ''}`); return refreshTrackers();
  }
  if (b.dataset.unuse) { P.uses[b.dataset.unuse] = Math.max(0, num(P.uses[b.dataset.unuse]) - 1); return refreshTrackers(); }
  if (b.dataset.cond) { P.cond[b.dataset.cond] = !P.cond[b.dataset.cond]; return refreshTrackers(); }
  if (b.dataset.post) return postRoll(b.dataset.post);
  if (b.dataset.element) { P.fx.element = b.dataset.element; P.fx.earth = b.dataset.element === 'Земля'; P.elementPending = false; addLog(`Стихийное воплощение: ${b.dataset.element}`); return refreshTrackers(); }
  if (b.dataset.compBox != null) { const i = +b.dataset.compBox; P.companion.stress = num(P.companion.stress) === i + 1 ? i : i + 1; return refreshTrackers(); }
  if (b.dataset.pray != null) {
    const i = +b.dataset.pray, v = (P.prayer || [])[i]; if (v == null) return;
    if (b.dataset.how === 'hope') { gainHope(v); addLog(`Кость Молитвы: +${v} Надежды`); }
    if (b.dataset.how === 'roll') { if (lastDual) { lastDual.bonus += v; addLog(`Кость Молитвы: +${v} к броску → ${lastDual.total + lastDual.bonus}`); } else { mechErr('Сначала сделай бросок.'); return; } }
    if (b.dataset.how === 'spend') addLog(`Кость Молитвы (${v}) потрачена`);
    P.prayer.splice(i, 1); return refreshTrackers();
  }
  if (b.dataset.lvlOpt || b.dataset.lvlMore) {
    const id = b.dataset.lvlOpt || b.dataset.lvlMore, dr = lvlDraft, t = tierOf(x().L + 1), a = ADV.find((q) => q.id === id);
    const used = dr.opts.reduce((s2, o) => s2 + (ADV.find((q) => q.id === o).double ? 2 : 1), 0);
    if (b.dataset.lvlOpt && dr.opts.includes(id)) { dr.opts = dr.opts.filter((o) => o !== id); if (id === 'traits') dr.traits = []; if (id === 'exp') dr.exps = []; if (id === 'card') dr.extraCard = ''; return keepScroll(render); }
    if (used + (a.double ? 2 : 1) > 2) return;
    const st = levelState(x().L);
    let from = 0;
    for (let tt = t; tt >= 2; tt--) if ((a.slots[tt] || 0) - (st.used[`${tt}:${id}`] || 0) - dr.opts.filter((o) => o === id).length > 0) { from = tt; break; }
    if (!from) return;
    dr.opts.push(id); dr.from[id] = from;
    return keepScroll(render);
  }
  const act = b.dataset.act; if (!act) return;
  if (act === 'lvl-start') { lvlDraft = { opts: [], from: {}, traits: [], exps: [], newExp: '', card: '', extraCard: '', swapFrom: '', swapTo: '' }; return keepScroll(render); }
  if (act === 'lvl-cancel') { lvlDraft = null; return keepScroll(render); }
  if (act === 'lvl-apply') return lvlApply();
  if (act === 'lvl-undo') return lvlUndo();
  if (act === 'rest-short' || act === 'rest-long') { const type = act === 'rest-short' ? 'short' : 'long'; if (type === 'short' && num(P.shortRests) >= 3) { mechErr('Уже три коротких отдыха подряд: теперь нужен продолжительный.'); } restState = { type, moves: type === 'short' ? ['stress', 'tend'] : ['tendAll', 'stressAll'], ally: [false, false] }; return keepScroll(render); }
  if (act === 'rest-cancel') { restState = null; return keepScroll(render); }
  if (act === 'rest-apply') return applyRest();
  if (act === 'session-start') return sessionStart();
  if (act === 'session-end') return sessionEnd();
  if (act === 'unst-up') { const max = x().L >= 5 ? 6 : 4; P.unstoppable = num(P.unstoppable) + 1; if (P.unstoppable > max) { P.unstoppable = 0; addLog('Кость Неудержимости превысила максимум: Неудержимость закончилась'); } else addLog(`Кость Неудержимости: ${P.unstoppable}`); return refreshTrackers(); }
  if (act === 'unst-end') { P.unstoppable = 0; addLog('Неудержимость закончилась'); return refreshTrackers(); }
  if (act === 'rally-stress') { const r = d(P.rally); P.stress = Math.max(0, num(P.stress) - r); P.rally = 0; addLog(`Кость Сплочения: −${STR(r)}`); return refreshTrackers(); }
  if (act === 'mark-clear') { P.mark = ''; return refreshTrackers(); }
  if (act === 'beast-enter') { const id = document.getElementById('beast-pick').value; P.beast = id; P.evolveTrait = P.beastPending === 'evolve' ? document.getElementById('evolve-trait').value : ''; P.beastPending = ''; addLog(`Звериная форма: ${esc(D.beastforms.find((q) => q.id === id)?.name || '')}`); return refreshTrackers(); }
  if (act === 'beast-cancel') { P.beastPending = ''; return refreshTrackers(); }
  if (act === 'beast-exit') { P.beast = ''; P.evolveTrait = ''; addLog('Выход из звериной формы'); return refreshTrackers(); }
  if (act === 'beast-atk') { const a = x().bst.attack; return duality(a.trait, 'Атака в звериной форме', 0, { attack: true }); }
  if (act === 'beast-dmg') { const xx = x(); const a = xx.bst.attack; return rollDamage(null, false, { name: xx.beast.name, die: a.die, bonus: a.bonus, magic: a.magic, features: [] }); }
  if (act === 'element-end') { delete P.fx.element; P.fx.earth = false; return refreshTrackers(); }
  if (act === 'death-avoid') { const xx = x(); const r = d(12); let t = `Без сознания до лечения или продолжительного отдыха. Кость Надежды: ${r}`; if (r <= xx.L) { P.scars = num(P.scars) + 1; t += ` ≤ уровня ${xx.L}: шрам, одна ячейка Надежды зачёркнута.`; } else t += ': шрама нет.'; addLog(t); refreshTrackers(); const o = document.getElementById('death-out'); if (o) o.textContent = t; return; }
  if (act === 'death-risk') { const h = d(12), f = d(12); let t; if (h === f) { P.hp = 0; P.stress = 0; t = `Дубль ${h}: критический успех, все Раны и Стресс сняты.`; } else if (h > f) { t = `Надежда ${h} > Страх ${f}: остаёшься на ногах. Сними ${h} Ран и/или Стресса (раздели сам).`; } else t = `Страх ${f} > Надежда ${h}: персонаж пересекает завесу смерти.`; addLog('Рискнуть всем: ' + t); refreshTrackers(); const o = document.getElementById('death-out'); if (o) o.textContent = t; return; }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (!lvlDraft) return;
  if (el.dataset.lvlTrait) { const k = el.dataset.lvlTrait, n = lvlDraft.opts.filter((o) => o === 'traits').length * 2; lvlDraft.traits = lvlDraft.traits.filter((q) => q !== k); if (el.checked) { if (lvlDraft.traits.length < n) lvlDraft.traits.push(k); else el.checked = false; } return keepScroll(render); }
  if (el.dataset.lvlExp) { const i = +el.dataset.lvlExp; lvlDraft.exps = lvlDraft.exps.filter((q) => q !== i); if (el.checked) { if (lvlDraft.exps.length < 2) lvlDraft.exps.push(i); else el.checked = false; } return keepScroll(render); }
  if (el.dataset.lvlSwap) { if (el.dataset.lvlSwap === 'from') { lvlDraft.swapFrom = el.value; lvlDraft.swapTo = ''; } else lvlDraft.swapTo = el.value; return keepScroll(render); }
  if (el.dataset.lvlCard) { if (el.id === 'lvl-card') lvlDraft.card = el.value; else lvlDraft.extraCard = el.value; return keepScroll(render); }
});
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.lvlNewexp != null && lvlDraft) { lvlDraft.newExp = el.value; const btn = document.querySelector('[data-act="lvl-apply"]'); if (btn) { clearTimeout(window.__lv); window.__lv = setTimeout(() => { const pos = el.selectionStart; keepScroll(render); const n = document.getElementById('lvl-newexp'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 400); } }
  if (el.closest('#rest-panel') && restState) { const i = el.dataset.rest ?? el.dataset.restAlly; if (el.dataset.rest != null) restState.moves[+i] = el.value; if (el.dataset.restAlly != null) restState.ally[+i] = el.checked; }
});
document.addEventListener('change', (e) => { const el = e.target; if (el.closest('#rest-panel') && restState) { if (el.dataset.rest != null) restState.moves[+el.dataset.rest] = el.value; if (el.dataset.restAlly != null) restState.ally[+el.dataset.restAlly] = el.checked; } });


/* ================= РАСХОДНИКИ ================= */
const TRAIT_DAT = { 'Проворност': 'agi', 'Сил': 'str', 'Искусност': 'fin', 'Инстинкт': 'ins', 'Влияни': 'pre', 'Знани': 'kno' };
function traitFromWord(w) { for (const [k, v] of Object.entries(TRAIT_DAT)) if (w.startsWith(k)) return v; return null; }
function rollExpr(e) { const m = String(e).match(/(\d*)d(\d+)(?:\s*\+\s*(\d+))?/); if (!m) return { v: num(e), txt: String(e) }; const n = num(m[1] || 1), r = Array.from({ length: n }, () => d(+m[2])); const v = r.reduce((a, b) => a + b, 0) + num(m[3]); return { v, txt: `${e} [${r.join(',')}${m[3] ? '+' + m[3] : ''}] = ${v}` }; }
function consumeItem(it) {
  const x = derive(), P = C.play; P.fx = P.fx || {};
  const t = strip(it.text).replace(/\s+/g, ' ');
  let m, res = [];
  if (it.id === 'feast-of-xuria') { P.hp = 0; P.stress = 0; const r = rollExpr('1d4'); gainHope(r.v); res.push(`все Раны и Стресс сняты, +${r.v} Надежды`); }
  else if ((m = t.match(/(?:Излечите|исцелить)\s+(\d*d\d+(?:\s*\+\s*\d+)?|\d+)\s+Ран/i))) { const r = rollExpr(m[1]); P.hp = Math.max(0, num(P.hp) - r.v); res.push(`Раны −${r.v} (${r.txt})`); }
  else if ((m = t.match(/Очистите\s+(\d*d\d+(?:\s*\+\s*\d+)?|\d+)\s+Стресс/i))) { const r = rollExpr(m[1]); P.stress = Math.max(0, num(P.stress) - r.v); res.push(`Стресс −${r.v} (${r.txt})`); }
  else if ((m = t.match(/\+1 к (\S+) до следующего отдыха/))) { const k = traitFromWord(m[1]); if (k) { P.fx.tr = P.fx.tr || {}; P.fx.tr[k] = num(P.fx.tr[k]) + 1; res.push(`${TN[k]} +1 до отдыха`); } }
  else if ((m = t.match(/\+1 к следующему броску (\S+)/))) { const k = traitFromWord(m[1]); if (k) { P.fx.nextRoll = P.fx.nextRoll || {}; P.fx.nextRoll[k] = 1; res.push(`+1 к следующему броску: ${TN[k]}`); } }
  else if ((m = t.match(/добавить (\d*d\d+) к вашему следующему броску урона/))) { P.fx.nextDmg = [...(P.fx.nextDmg || []), m[1]]; res.push(`+${m[1]} к следующему урону`); }
  else if ((m = t.match(/получить (\d+) Надежд/))) { gainHope(+m[1]); res.push(`+${m[1]} Надежды`); }
  else res.push('эффект смотри в описании');
  addLog(`${esc(it.name)}: ${esc(res.join(', '))}`);
  return res.join(', ');
}
function useStartPotion() { const it = ITEM[C.potion]; if (!it || C.play.startPotionUsed) return; C.play.startPotionUsed = true; consumeItem(it); refreshTrackers(); }
function useExtra(i) { const e = C.play.extra[i]; const it = e && ITEM[e.id]; if (!it || num(e.n) < 1) return; e.n = num(e.n) - 1; consumeItem(it); if (e.n <= 0) C.play.extra.splice(i, 1); refreshTrackers(); }
document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.consume != null) return useExtra(+b.dataset.consume);
  if (b.dataset.act === 'start-potion') return useStartPotion();
});

'use strict';
/* Вкладка «Заметки»: дерево папок, упрощённый Markdown со сворачиванием разделов и пунктов, спойлеры, поиск.
   Хранится в C.nb = { items: [{id, type:'folder'|'note', name, parent, body, open}], sel, mode } */

function nb() {
  if (!C.nb || !Array.isArray(C.nb.items)) {
    C.nb = { items: [], sel: null, mode: 'view', q: '' };
    const root = nbAdd('folder', 'Кампания', null);
    const n = nbAdd('note', 'Как пользоваться', root.id, NB_HELP);
    nbAdd('note', 'Персонажи', root.id, '# Партия\n- \n\n# NPC\n- ');
    nbAdd('note', 'Сессии', root.id, '# Сессия 1\n- [ ] \n');
    C.nb.sel = n.id;
  }
  return C.nb;
}
const NB_HELP = `# Заметки
Слева дерево: папки и заметки. Кнопки сверху создают новые, в заголовке заметки её можно переименовать, перенести в другую папку или удалить.

## Разметка
- **жирный** — двумя звёздочками, *курсив* — одной
- \`# Заголовок\`, \`## Подзаголовок\`, \`### Ещё ниже\`
- \`- пункт\` — список, вложенность отступом в два пробела
  - вот так
    - и ещё глубже
- \`- [ ] дело\` и \`- [x] сделано\` — чекбоксы, кликаются прямо в просмотре
- \`> цитата\`
- \`[ссылка](https://ru.daggerheart.su)\`
- \`---\` — разделитель
- \`||секрет||\` — спойлер, открывается кликом: ||Аликсиан — ...||

## Сворачивание
Клик по заголовку сворачивает раздел до следующего заголовка того же уровня. Пункт списка с вложенными пунктами сворачивается кликом по треугольнику.

## Сворачивается по умолчанию
### > Этот раздел закрыт с самого начала
Если в начале заголовка поставить \`>\`, раздел будет свёрнут при открытии заметки.`;

let nbSeq = 0;
function nbId() { return 'n' + Date.now().toString(36) + (nbSeq++).toString(36); }
function nbAdd(type, name, parent, body = '') { const it = { id: nbId(), type, name, parent, body, open: true }; C.nb.items.push(it); return it; }
const nbGet = (id) => nb().items.find((i) => i.id === id);
const nbKids = (pid) => nb().items.filter((i) => i.parent === pid).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'ru') : a.type === 'folder' ? -1 : 1));
function nbPath(it) { const p = []; let cur = it && nbGet(it.parent); while (cur) { p.unshift(cur.name); cur = nbGet(cur.parent); } return p; }
function nbDescendants(id) { const out = []; const walk = (pid) => nbKids(pid).forEach((k) => { out.push(k.id); walk(k.id); }); walk(id); return out; }

/* ---------- Markdown ---------- */
function mdInline(s) {
  const codes = [];
  let t = esc(s).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  t = t.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" tabindex="0" role="button" aria-label="Спойлер, нажми чтобы открыть">$1</span>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  t = t.replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
}
/** Разбор в дерево блоков и HTML с вложенными разделами. lineNo нужен для кликов по чекбоксам. */
function mdRender(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  const out = [];
  const stack = []; // открытые <details> разделов: уровни заголовков
  let i = 0;
  const closeSections = (lvl) => { while (stack.length && stack[stack.length - 1] >= lvl) { out.push('</div></details>'); stack.pop(); } };
  while (i < lines.length) {
    const ln = lines[i];
    let m;
    if ((m = ln.match(/^(#{1,4})\s+(>\s*)?(.*)$/))) {
      const lvl = m[1].length; closeSections(lvl);
      out.push(`<details class="md-sec md-h${lvl}" ${m[2] ? '' : 'open'}><summary>${mdInline(m[3])}</summary><div class="md-body">`);
      stack.push(lvl); i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(ln)) { out.push('<hr>'); i++; continue; }
    if (/^\s*>\s?/.test(ln)) {
      const q = []; while (i < lines.length && /^\s*>\s?/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push(`<blockquote>${q.map(mdInline).join('<br>')}</blockquote>`); continue;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && (/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const mm = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (mm) items.push({ ind: Math.floor(mm[1].replace(/\t/g, '  ').length / 2), ord: /\d/.test(mm[2]), text: mm[3], line: i });
        else items[items.length - 1].text += ' ' + lines[i].trim();
        i++;
      }
      out.push(mdList(items, 0, 0).html); continue;
    }
    if (!ln.trim()) { i++; continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*([-*+]|\d+\.)\s+|\s*>|\s*-{3,}\s*$)/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push(`<p>${para.map(mdInline).join('<br>')}</p>`);
  }
  closeSections(0);
  return out.join('');
}
function mdList(items, start, ind) {
  const ord = items[start]?.ord;
  let html = `<${ord ? 'ol' : 'ul'} class="md-list">`, k = start;
  while (k < items.length && items[k].ind >= ind) {
    const it = items[k];
    if (it.ind > ind) { const sub = mdList(items, k, it.ind); html += sub.html; k = sub.next; continue; }
    const cb = it.text.match(/^\[( |x|х)\]\s*(.*)$/i);
    const body = cb ? `<label class="md-cb"><input type="checkbox" data-nbcb="${it.line}" ${cb[1].trim() ? 'checked' : ''}> <span>${mdInline(cb[2])}</span></label>` : mdInline(it.text);
    const hasKids = items[k + 1] && items[k + 1].ind > ind;
    if (hasKids) {
      const sub = mdList(items, k + 1, items[k + 1].ind);
      html += `<li class="md-parent"><details open><summary>${body}</summary>${sub.html}</details></li>`;
      k = sub.next;
    } else { html += `<li>${body}</li>`; k++; }
  }
  return { html: html + `</${ord ? 'ol' : 'ul'}>`, next: k };
}

/* ---------- Вид ---------- */
function renderNotes() {
  const N = nb(), q = (N.q || '').trim().toLowerCase();
  const sel = nbGet(N.sel) && nbGet(N.sel).type === 'note' ? nbGet(N.sel) : null;
  const hits = q.length >= 2 ? N.items.filter((i) => i.type === 'note' && (i.name.toLowerCase().includes(q) || i.body.toLowerCase().includes(q))) : null;
  const tree = (pid, depth) => nbKids(pid).map((it) => it.type === 'folder'
    ? `<div class="nb-row nb-folder ${N.sel === it.id ? 'sel' : ''}" style="--d:${depth}"><button class="nb-tw" data-nbtoggle="${it.id}" aria-label="${it.open ? 'Свернуть' : 'Развернуть'} папку">${it.open ? '▾' : '▸'}</button><button class="nb-name" data-nbsel="${it.id}">${esc(it.name)}</button></div>${it.open ? tree(it.id, depth + 1) : ''}`
    : `<div class="nb-row ${N.sel === it.id ? 'sel' : ''}" style="--d:${depth}"><span class="nb-tw"></span><button class="nb-name" data-nbsel="${it.id}">${esc(it.name || 'Без названия')}</button></div>`).join('');
  const selFolder = nbGet(N.sel)?.type === 'folder' ? nbGet(N.sel) : null;
  const folders = N.items.filter((i) => i.type === 'folder');
  const editor = sel ? `<div class="nb-head"><input id="nb-title" data-nbtitle="${sel.id}" value="${esc(sel.name)}" aria-label="Название заметки" placeholder="Название">
      <div class="row small"><span class="muted">${esc(['', ...nbPath(sel)].join(' / ') || '/')}</span>
        <select id="nb-move" data-nbmove="${sel.id}" aria-label="Переместить в папку"><option value="">В корень</option>${folders.map((f) => `<option value="${f.id}" ${sel.parent === f.id ? 'selected' : ''}>${esc([...nbPath(f), f.name].join(' / '))}</option>`).join('')}</select>
        <span class="tabs nb-mode"><button data-nbmode="view" aria-pressed="${N.mode !== 'edit'}">Просмотр</button><button data-nbmode="edit" aria-pressed="${N.mode === 'edit'}">Редактировать</button></span>
        <button class="ghost danger small" data-nbdel="${sel.id}">Удалить</button></div></div>
    ${N.mode === 'edit' ? `<textarea id="nb-body" data-nbbody="${sel.id}" spellcheck="true" placeholder="Пиши в Markdown: # заголовок, - список, - [ ] дело, **жирный**, ||спойлер||">${esc(sel.body)}</textarea><div class="small muted">Сохраняется само. Шпаргалка по разметке — в заметке «Как пользоваться».</div>`
      : `<div class="md" id="nb-view">${sel.body.trim() ? mdRender(sel.body) : '<p class="muted">Пустая заметка. Нажми «Редактировать».</p>'}</div>`}`
    : selFolder ? `<div class="nb-head"><input id="nb-title" data-nbtitle="${selFolder.id}" value="${esc(selFolder.name)}" aria-label="Название папки"><div class="row small"><span class="muted">Папка · ${nbKids(selFolder.id).length} внутри</span>
        <select id="nb-move" data-nbmove="${selFolder.id}" aria-label="Переместить папку"><option value="">В корень</option>${folders.filter((f) => f.id !== selFolder.id && !nbDescendants(selFolder.id).includes(f.id)).map((f) => `<option value="${f.id}" ${selFolder.parent === f.id ? 'selected' : ''}>${esc([...nbPath(f), f.name].join(' / '))}</option>`).join('')}</select>
        <button class="ghost danger small" data-nbdel="${selFolder.id}">Удалить папку</button></div></div><div class="empty">Выбери заметку слева или создай новую в этой папке.</div>`
    : '<div class="empty">Выбери заметку слева или создай новую.</div>';
  return `<div class="nb">
    <aside class="panel nb-side"><div class="row"><button class="small" data-nbnew="note">+ Заметка</button><button class="small" data-nbnew="folder">+ Папка</button></div>
      <input id="nb-q" data-nbq value="${esc(N.q || '')}" placeholder="Поиск по заметкам" aria-label="Поиск по заметкам">
      <div class="nb-tree" role="tree">${hits ? (hits.map((h) => `<div class="nb-row ${N.sel === h.id ? 'sel' : ''}" style="--d:0"><span class="nb-tw"></span><button class="nb-name" data-nbsel="${h.id}">${esc(h.name)}<span class="small muted"> ${esc(nbPath(h).join(' / '))}</span></button></div>`).join('') || '<div class="small muted">Ничего не нашлось.</div>') : tree(null, 0) || '<div class="small muted">Пока пусто.</div>'}</div>
      <div class="small muted">Новая заметка создаётся в выбранной папке. Заметки хранятся вместе с персонажем и переносятся кодом персонажа.</div></aside>
    <section class="panel nb-main" id="nb-main">${editor}<div class="err" id="nb-err"></div></section></div>`;
}

/* ---------- События ---------- */
let nbArm = null;
function nbRerenderMain() { const m = document.getElementById('nb-main'); if (m) { keepScroll(render); } }
document.addEventListener('click', (e) => {
  if (C.view !== 'notes') return;
  const sp = e.target.closest('.spoiler'); if (sp) { sp.classList.toggle('open'); return; }
  const b = e.target.closest('button'); if (!b) return;
  const N = nb();
  if (b.dataset.nbsel) { N.sel = b.dataset.nbsel; const it = nbGet(N.sel); if (it?.type === 'note' && !it.body.trim()) N.mode = 'edit'; else if (it?.type === 'note') N.mode = N.mode || 'view'; save(); return keepScroll(render); }
  if (b.dataset.nbtoggle) { const f = nbGet(b.dataset.nbtoggle); f.open = !f.open; save(); return keepScroll(render); }
  if (b.dataset.nbnew) {
    const cur = nbGet(N.sel), parent = cur ? (cur.type === 'folder' ? cur.id : cur.parent) : null;
    if (parent) nbGet(parent).open = true;
    const it = nbAdd(b.dataset.nbnew, b.dataset.nbnew === 'folder' ? 'Новая папка' : 'Новая заметка', parent);
    N.sel = it.id; N.mode = 'edit'; N.q = ''; save(); render();
    const t = document.getElementById('nb-title'); if (t) { t.focus(); t.select(); }
    return;
  }
  if (b.dataset.nbmode) { N.mode = b.dataset.nbmode; save(); return keepScroll(render); }
  if (b.dataset.nbdel) {
    const it = nbGet(b.dataset.nbdel); if (!it) return;
    if (nbArm !== it.id) { nbArm = it.id; b.textContent = it.type === 'folder' ? `Удалить вместе с ${nbDescendants(it.id).length} внутри?` : 'Точно удалить?'; setTimeout(() => { if (nbArm === it.id) { nbArm = null; keepScroll(render); } }, 3500); return; }
    nbArm = null; const ids = new Set([it.id, ...nbDescendants(it.id)]); N.items = N.items.filter((i) => !ids.has(i.id)); N.sel = it.parent; save(); return keepScroll(render);
  }
});
document.addEventListener('change', (e) => {
  if (C.view !== 'notes') return;
  const el = e.target, N = nb();
  if (el.dataset.nbcb != null) {
    const it = nbGet(N.sel); const lines = it.body.split('\n'); const k = +el.dataset.nbcb;
    lines[k] = lines[k].replace(/\[( |x|х)\]/i, el.checked ? '[x]' : '[ ]'); it.body = lines.join('\n'); save(); return;
  }
  if (el.dataset.nbmove != null) { const it = nbGet(el.dataset.nbmove); it.parent = el.value || null; if (it.parent) nbGet(it.parent).open = true; save(); return keepScroll(render); }
});
document.addEventListener('input', (e) => {
  if (C.view !== 'notes') return;
  const el = e.target, N = nb();
  if (el.dataset.nbbody) { nbGet(el.dataset.nbbody).body = el.value; save(); return; }
  if (el.dataset.nbtitle) { nbGet(el.dataset.nbtitle).name = el.value; save(); const row = document.querySelector(`[data-nbsel="${el.dataset.nbtitle}"]`); if (row && !N.q) row.firstChild.textContent = el.value || 'Без названия'; return; }
  if (el.dataset.nbq != null) { N.q = el.value; clearTimeout(window.__nbq); window.__nbq = setTimeout(() => { const pos = el.selectionStart; keepScroll(render); const n = document.getElementById('nb-q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 250); }
});
document.addEventListener('keydown', (e) => {
  if (C.view !== 'notes') return;
  if (e.target.classList?.contains('spoiler') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.classList.toggle('open'); }
  if (e.target.id === 'nb-body' && e.key === 'Tab') { /* отступ для вложенных списков */
    e.preventDefault(); const t = e.target, s0 = t.selectionStart, s1 = t.selectionEnd;
    const ls = t.value.lastIndexOf('\n', s0 - 1) + 1;
    if (e.shiftKey) { if (t.value.slice(ls, ls + 2) === '  ') { t.value = t.value.slice(0, ls) + t.value.slice(ls + 2); t.selectionStart = t.selectionEnd = Math.max(ls, s0 - 2); } }
    else { t.value = t.value.slice(0, ls) + '  ' + t.value.slice(ls); t.selectionStart = s0 + 2; t.selectionEnd = s1 + 2; }
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (e.target.id === 'nb-body' && e.key === 'Enter' && !e.shiftKey) { /* продолжить список */
    const t = e.target, s0 = t.selectionStart, ls = t.value.lastIndexOf('\n', s0 - 1) + 1, line = t.value.slice(ls, s0);
    const m = line.match(/^(\s*)([-*+]|\d+\.)\s+(\[[ xх]\]\s+)?(.*)$/i); if (!m) return;
    e.preventDefault();
    if (!m[4].trim()) { t.value = t.value.slice(0, ls) + t.value.slice(s0); t.selectionStart = t.selectionEnd = ls; }
    else { const nx = /\d/.test(m[2]) ? (parseInt(m[2], 10) + 1) + '.' : m[2]; const ins = '\n' + m[1] + nx + ' ' + (m[3] ? '[ ] ' : ''); t.value = t.value.slice(0, s0) + ins + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s0 + ins.length; }
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

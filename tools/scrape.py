"""Собирает данные Daggerheart (Core/SRD) с ru.daggerheart.su в data.js для конструктора.
Запуск: python3 scrape.py <папка_с_html> <выходной data.js>
HTML-страницы скачиваются заранее (curl), скрипт только парсит.
"""
import json, re, sys, os
from bs4 import BeautifulSoup, NavigableString, Tag

RAW, OUT = sys.argv[1], sys.argv[2]
ALLOWED = {'p', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'br', 'table', 'tr', 'td', 'th', 'thead', 'tbody'}

def soup(name):
    return BeautifulSoup(open(os.path.join(RAW, name), encoding='utf8'), 'html.parser')

def clean(node):
    """Оставляет простую разметку; ссылки на правила превращает в термины-подсказки."""
    if node is None:
        return ''
    out = []
    for ch in node.children:
        if isinstance(ch, NavigableString):
            out.append(str(ch).replace('&', '&amp;').replace('<', '&lt;'))
            continue
        if not isinstance(ch, Tag):
            continue
        n = ch.name
        if n == 'a':
            href = ch.get('href', '')
            inner = clean(ch)
            m = re.match(r'^/rule/([\w-]+)', href)
            out.append(f'<span class="term" data-rule="{m.group(1)}">{inner}</span>' if m else inner)
        elif n == 'roll':
            out.append(f'<b class="roll">{ch.get_text()}</b>')
        elif n in ALLOWED:
            out.append(f'<{n}>' + clean(ch) + (f'</{n}>' if n != 'br' else ''))
        elif n == 'img':
            continue
        else:
            out.append(clean(ch))
    s = ''.join(out)
    s = re.sub(r'<p>\s*<p>', '<p>', s)
    s = re.sub(r'</p>\s*</p>', '</p>', s)
    return re.sub(r'\s+', ' ', s).strip()

def txt(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)) if node else ''

def is_core(card):
    return 'core' in (card.get('data-source') or '') or 'srd' in (card.get('data-source') or '')

def features(container):
    res = []
    for fb in container.select(':scope > .feature-block'):
        res.append({'name': txt(fb.select_one('.feature-name')), 'text': clean(fb.select_one('.feature-body'))})
    return res

def card_features(desc):
    """Свойства на карточке: <p><em><strong>Имя:</strong></em> текст</p>."""
    res = []
    for p in desc.find_all('p', recursive=False):
        st = p.find('strong')
        if st and st.get_text().strip().endswith(':'):
            name = st.get_text().strip().rstrip(':').strip()
            (st.parent if st.parent.name == 'em' else st).extract()
            res.append({'name': name, 'text': clean(p)})
        elif res:
            res[-1]['text'] += ' ' + clean(p)
    return res

data = {}

# ---------- domains & classes ----------
DOMAINS = {'arcana': 'Аркана', 'blade': 'Клинок', 'bone': 'Кость', 'codex': 'Кодекс', 'grace': 'Грация',
           'midnight': 'Полночь', 'sage': 'Мудрость', 'splendor': 'Величие', 'valor': 'Доблесть'}
data['domains'] = DOMAINS

# Классы из дополнений, которые вошли в SRD 2.0 (Public Game Content по DPCGL)
EXTRA_CLASSES = {'playtest-assassin': ('assassin', 'cls_assassin.html', 'Hope & Fear')}

def parse_class(c):
    cid = c['id']
    source = None
    if cid in EXTRA_CLASSES:
        cid, fname, source = EXTRA_CLASSES[c['id']]
    else:
        fname = f'cls_{cid}.html'
    page = soup(fname).select_one('.main_body')
    stats = {h.get('id'): h.find_next_sibling() for h in page.select('.class-stats h2')}
    cf_h = page.find('h2', id='class-feature')
    feats = []
    node = cf_h.find_next_sibling()
    while node is not None and not (node.name == 'h2'):
        if 'feature-block' in (node.get('class') or []):
            feats.append({'name': txt(node.select_one('.feature-name')), 'text': clean(node.select_one('.feature-body'))})
        node = node.find_next_sibling()
    subs = []
    for btn in page.select('button.collapsible'):
        content = btn.find_next_sibling('div', class_='content')
        sub = {'id': btn['id'], 'name': txt(btn), 'blurb': '', 'spellcast': None, 'foundation': [], 'specialization': [], 'mastery': []}
        first_p = content.find('p', recursive=False)
        sub['blurb'] = clean(first_p) if first_p else ''
        cur = None
        for el in content.children:
            if not isinstance(el, Tag):
                continue
            if el.name == 'h2':
                t = txt(el)
                cur = {'Свойства Основы': 'foundation', 'Свойства Специализации': 'specialization',
                       'Свойства Мастерства': 'mastery', 'Характеристика Заклинателя': 'spell'}.get(t)
            elif cur == 'spell' and 'trait_name' in (el.get('class') or []):
                a = el.find('a')
                sub['spellcast'] = (a['href'].split('/')[-1] if a else None)
            elif cur in ('foundation', 'specialization', 'mastery') and 'feature-block' in (el.get('class') or []):
                sub[cur].append({'name': txt(el.select_one('.feature-name')), 'text': clean(el.select_one('.feature-body'))})
        subs.append(sub)

    def ul_after(hid):
        h = page.find('h2', id=hid)
        if not h:
            return []
        ul = h.find_next_sibling('ul')
        return [clean(li) for li in ul.find_all('li', recursive=False)] if ul else []

    intro = page.select_one('.main_content > p')
    return {
        'id': cid, 'source': source, 'slug': c['id'] if source else None, 'name': txt(c.select_one('.title')),
        'tagline': clean(c.select_one('.description')),
        'intro': clean(intro),
        'domains': c['data-domain'].split(','),
        'evasion': int(txt(stats['starting-evasion-score'])),
        'hp': int(txt(stats['hit-points'])),
        'hopeFeature': feats[0] if feats else None,
        'features': feats[1:],
        'subclasses': subs,
        'items': ul_after('class-items'),
        'questions': ul_after('background-questions'),
        'connections': ul_after('connections'),
    }

classes = []
idx = soup('class.html')
for c in idx.select('.main_body .card'):
    if is_core(c) or (c.get('id') in EXTRA_CLASSES and os.path.exists(os.path.join(RAW, EXTRA_CLASSES[c['id']][1]))):
        classes.append(parse_class(c))
data['classes'] = classes

# ---------- ancestries & communities ----------
def heritage(fname):
    res = []
    for c in soup(fname).select('.main_body .card'):
        if not is_core(c):
            continue
        desc = c.select_one('.description')
        res.append({'id': c['id'], 'name': txt(c.select_one('.title')),
                    'prelude': clean(c.select_one('.prelude')), 'features': card_features(desc)})
    return res
data['ancestries'] = heritage('ancestry.html')
data['communities'] = heritage('community.html')

# ---------- domain cards ----------
cards = []
for c in soup('domain-card.html').select('.main_body .card'):
    if not is_core(c):
        continue
    cards.append({'id': c['id'], 'name': txt(c.select_one('.title')), 'domain': c['data-domain'],
                  'level': int(txt(c.select_one('.banner_text')) or 0),
                  'recall': int(txt(c.select_one('.stress_text')) or 0),
                  'type': txt(c.select_one('.label')), 'text': clean(c.select_one('.description'))})
data['cards'] = cards

# ---------- equipment ----------
TRAITS = {'agility': 'agi', 'strength': 'str', 'finesse': 'fin', 'instinct': 'ins', 'presence': 'pre',
          'knowledge': 'kno', 'spellcast': 'spell'}
RANGES = {'melee': 'Вплотную', 'very-close': 'Близко', 'close': 'Средне', 'far': 'Далеко', 'very-far': 'Очень Далеко'}
weapons, armor, items = [], [], []
for c in soup('equipment.html').select('.main_body .card'):
    t = c.get('data-type')
    name = txt(c.select_one('.title'))
    en = txt(c.select_one('.search-tags'))
    tier = txt(c.select_one('.tier span'))
    desc = c.select_one('.description')
    if t in ('primary-weapon', 'secondary-weapon', 'combat-wheelchair'):
        props, feat = {}, []
        for p in desc.find_all('p', recursive=False):
            st = p.find('strong')
            label = st.get_text().strip() if st else ''
            if label in ('Характеристика:', 'Дистанция:', 'Урон:', 'Хват:'):
                props[label[:-1]] = txt(p).split(':', 1)[1].strip()
            else:
                f = card_features(BeautifulSoup('<div>' + str(p) + '</div>', 'html.parser').div)
                feat.extend(f if f else [{'name': '', 'text': clean(p)}])
        dmg = props.get('Урон', '')
        m = re.match(r'(d\d+)\s*(?:\+\s*(\d+))?\s*—\s*(\S+)', dmg)
        weapons.append({'id': c['id'], 'name': name, 'en': en, 'slot': 'primary' if t != 'secondary-weapon' else 'secondary',
                        'wheelchair': t == 'combat-wheelchair', 'tier': int(tier or 1),
                        'trait': TRAITS.get(c.get('data-trait'), c.get('data-trait')),
                        'range': RANGES.get(c.get('data-range'), props.get('Дистанция', '')),
                        'die': m.group(1) if m else '', 'bonus': int(m.group(2) or 0) if m else 0,
                        'magic': bool(m and m.group(3).lower().startswith('маг')),
                        'burden': props.get('Хват', ''), 'features': feat})
    elif t == 'armor':
        thr = sc = None
        feat = []
        for p in desc.find_all('p', recursive=False):
            s = txt(p)
            if s.startswith('Базовые Пороги'):
                nums = re.findall(r'\d+', s); thr = [int(nums[0]), int(nums[1])]
            elif s.startswith('Базовый Показатель'):
                sc = int(re.findall(r'\d+', s)[0])
            else:
                f = card_features(BeautifulSoup('<div>' + str(p) + '</div>', 'html.parser').div)
                feat.extend(f if f else [{'name': '', 'text': clean(p)}])
        armor.append({'id': c['id'], 'name': name, 'en': en, 'tier': int(tier or 1), 'major': thr[0], 'severe': thr[1],
                      'score': sc, 'features': feat})
    else:
        items.append({'id': c['id'], 'name': name, 'en': en, 'kind': 'consumable' if t == 'consumable' else 'item',
                      'text': clean(desc)})
data['weapons'], data['armor'], data['items'] = weapons, armor, items

# ---------- beastforms ----------
bfs = []
for c in soup('beastform.html').select('.main_body .card'):
    fn = f"bf_{c['id']}.html"
    if not os.path.exists(os.path.join(RAW, fn)):
        continue
    mc = soup(fn).select_one('.main_content')
    h5 = mc.find('h5')
    if h5: h5.extract()
    bfs.append({'id': c['id'], 'name': txt(c.select_one('.title')), 'tier': int(txt(c.select_one('.tier span')) or 1),
                'html': clean(mc)})
data['beastforms'] = bfs

# ---------- rules glossary ----------
rules = {}
for c in soup('rule.html').select('.main_body .card'):
    rules[c['id']] = {'t': txt(c.select_one('.title')), 'd': clean(c.select_one('.description'))}
data['rules'] = rules

with open(OUT, 'w', encoding='utf8') as f:
    f.write('/* Данные Daggerheart SRD 1.0 на русском, источник: ru.daggerheart.su. '
            'This product includes materials from the Daggerheart System Reference Document 1.0, © Critical Role, LLC, '
            'under the terms of the Darrington Press Community Gaming (DPCGL) License. */\n')
    f.write('window.DH = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')

print({k: len(v) for k, v in data.items()})

"""Собирает icons.js из game-icons.net (CC BY 3.0). Запуск: python3 icons.py <папка_репозитория> <icons.js>"""
import os, re, sys, json

SRC, OUT = sys.argv[1], sys.argv[2]
index = {}
for root, _, files in os.walk(SRC):
    if 'badges' in root.split(os.sep): continue
    for f in files:
        if f.endswith('.svg'):
            index.setdefault(f[:-4], os.path.join(root, f))

WANT = {
    # классы
    'cls-bard': ['lyre', 'harp'], 'cls-druid': ['wolf-head', 'oak'], 'cls-guardian': ['checked-shield'],
    'cls-ranger': ['high-shot', 'pocket-bow'], 'cls-rogue': ['hood', 'cloak-dagger'], 'cls-seraph': ['angel-wings', 'winged-sword'],
    'cls-sorcerer': ['fire-ray', 'magic-swirl'], 'cls-warrior': ['crossed-swords'], 'cls-wizard': ['pointy-hat', 'wizard-staff'],
    # домены
    'dm-arcana': ['magic-swirl'], 'dm-blade': ['broadsword'], 'dm-bone': ['crossed-bones'], 'dm-codex': ['spell-book'],
    'dm-grace': ['rose'], 'dm-midnight': ['moon', 'night-sky'], 'dm-sage': ['oak-leaf', 'leaf-swirl'],
    'dm-splendor': ['sunbeams', 'sun'], 'dm-valor': ['round-shield', 'shield-reflect'],
    # родословные
    'anc-clank': ['robot-golem'], 'anc-drakona': ['dragon-head'], 'anc-dwarf': ['dwarf-face'], 'anc-elf': ['elf-ear'],
    'anc-faerie': ['fairy-wings', 'fairy'], 'anc-faun': ['goat'], 'anc-firbolg': ['troll'], 'anc-fungril': ['mushroom-gills'],
    'anc-galapa': ['turtle-shell'], 'anc-giant': ['giant'], 'anc-goblin': ['goblin-head'], 'anc-halfling': ['hobbit-door', 'hobbit-dwelling'],
    'anc-human': ['person'], 'anc-infernis': ['devil-mask'], 'anc-katari': ['cat'], 'anc-orc': ['orc-head'],
    'anc-ribbet': ['frog'], 'anc-simiah': ['monkey'],
    # сообщества
    'com-highborne': ['crown'], 'com-loreborne': ['bookshelf', 'open-book'], 'com-orderborne': ['scales'],
    'com-ridgeborne': ['mountains'], 'com-seaborne': ['anchor', 'sailboat'], 'com-slyborne': ['domino-mask'],
    'com-underborne': ['mining', 'cave-entrance'], 'com-wanderborne': ['caravan'], 'com-wildborne': ['forest', 'pine-tree'],
    # снаряжение
    'w-sword': ['broadsword'], 'w-axe': ['battle-axe', 'war-axe'], 'w-bow': ['bow-arrow'], 'w-crossbow': ['crossbow'],
    'w-dagger': ['plain-dagger'], 'w-whip': ['whip'], 'w-hammer': ['thor-hammer', 'flat-hammer'], 'w-mace': ['flanged-mace', 'spiked-mace'],
    'w-flail': ['flail'], 'w-polearm': ['halberd'], 'w-spear': ['barbed-spear', 'spears'], 'w-scythe': ['scythe'],
    'w-staff': ['wizard-staff', 'crescent-staff'], 'w-wand': ['crystal-wand', 'lunar-wand'], 'w-orb': ['gem-pendant', 'double-ringed-orb'],
    'w-rune': ['rune-stone'], 'w-fist': ['fist', 'gauntlet'], 'w-knuckle': ['brass-knuckles'], 'w-sling': ['sling'], 'w-gun': ['pistol-gun'],
    'w-shield': ['round-shield'], 'w-tower': ['checked-shield'], 'w-grapple': ['grapple'], 'w-chair': ['wooden-chair'], 'w-katana': ['katana'],
    'a-leather': ['leather-vest'], 'a-gambeson': ['robe'], 'a-chain': ['chain-mail'], 'a-plate': ['breastplate'], 'a-other': ['shoulder-armor', 'lamellar'],
    'i-potion': ['round-bottom-flask', 'potion-ball'], 'i-item': ['swap-bag', 'knapsack'], 'i-scroll': ['scroll-unfurled'],
    'ui-portrait': ['hooded-figure', 'person'], 'ui-dice': ['dice-twenty-faces-twenty', 'perspective-dice-six-faces-random'],
}
icons, credits, missing = {}, {}, []
for key, cands in WANT.items():
    for c in cands:
        p = index.get(c)
        if not p:
            continue
        svg = open(p, encoding='utf8').read()
        paths = re.findall(r'<path([^>]*)/>', svg)
        ds = [re.search(r'd="([^"]+)"', a).group(1) for a in paths if 'd="M0 0h512v512H0z"' not in a and re.search(r'd="([^"]+)"', a)]
        if ds:
            icons[key] = ds
            author = os.path.relpath(p, SRC).split(os.sep)[0]
            credits.setdefault(author, []).append(c)
            break
    else:
        missing.append(key)

with open(OUT, 'w', encoding='utf8') as f:
    f.write('/* Иконки: game-icons.net, лицензия CC BY 3.0. Авторы: ' + ', '.join(sorted(credits)) + '. */\n')
    f.write('window.DH_ICONS = ' + json.dumps(icons, separators=(',', ':')) + ';\n')
    f.write('window.DH_ICON_AUTHORS = ' + json.dumps(sorted(credits)) + ';\n')
print('icons', len(icons), 'missing', missing, 'authors', sorted(credits))

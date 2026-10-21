h=open('index.html',encoding='utf8').read()
for f in ['data.js','icons.js','bronk.js','app.js','rules.js','boot.js']:
    js=open(f,encoding='utf8').read().replace('</script','<\\/script')
    tag=f'<script src="{f}"></script>'
    assert tag in h, f
    h=h.replace(tag,'<script>\n'+js+'\n</script>')
import os
os.makedirs('dist',exist_ok=True)
out='<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'+h+'\n</html>'
open('dist/index.html','w',encoding='utf8').write(out)
open('daggerheart-forge.html','w',encoding='utf8').write('<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'+h+'\n</html>')
print('built')

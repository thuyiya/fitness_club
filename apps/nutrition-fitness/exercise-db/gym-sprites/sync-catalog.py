"""Refresh generated asset status and build a local browseable gallery."""
import html,json,pathlib
root=pathlib.Path(__file__).parent
path=root/'manifest.json'
data=json.loads(path.read_text())
for e in data['exercises']:
    asset=root/(e['id']+'.png')
    e['sheet']=asset.name if asset.exists() else None
    e['status']='generated-unreviewed' if asset.exists() else 'pending'
data['style']='v1 cel-shaded illustration; dark shaded background'
data['layout']={'columns':3,'rows':2,'rowOrder':['female','male']}
path.write_text(json.dumps(data,indent=2)+'\n')
cards=[]
for e in data['exercises']:
    name=html.escape(e['name'])
    media=f'<img loading="lazy" src="{e["sheet"]}" alt="{name}: female and male exercise poses">' if e['sheet'] else '<div class="pending">Pending generation</div>'
    cards.append(f'<article data-name="{html.escape(e["name"].lower(),quote=True)}"><h2>{name}</h2>{media}</article>')
count=sum(e['sheet'] is not None for e in data['exercises'])
pending=[e for e in data['exercises'] if not e['sheet']]
(root/'checkpoint.json').write_text(json.dumps({'generated':count,'total':len(data['exercises']),'remaining':len(pending),'firstPending':pending[0]['id'] if pending else None,'mode':'built-in image_gen'},indent=2)+'\n')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wellness 2.0 exercise sprites</title><style>body{margin:32px;background:#15151a;color:#f7f7fa;font:16px system-ui}input{font:inherit;padding:12px;width:min(90%,520px);margin:12px 0 28px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:24px}article{background:#222229;border-radius:12px;overflow:hidden}h2{font-size:17px;padding:0 16px}img{display:block;width:100%}.pending{padding:60px 20px;color:#aaa}article[hidden]{display:none}</style><h1>Wellness 2.0</h1>'''+f'<p>{count} / {len(data["exercises"])} exercise sheets generated. Female top row · male bottom row · three poses. Artwork requires movement and branding review before animation.</p>'+'''<input id="search" aria-label="Search exercises" placeholder="Search exercises"><main>'''+''.join(cards)+'''</main><script>document.querySelector('#search').addEventListener('input',e=>document.querySelectorAll('article').forEach(a=>a.hidden=!a.dataset.name.includes(e.target.value.toLowerCase())))</script></html>'''
(root/'index.html').write_text(page)
print(f'{count}/{len(data["exercises"])} sheets saved')

"""Resolve exact Wikipedia articles and save attributed, short fallback excerpts.

No article is treated as a silently interchangeable search result. Redirects are
resolved; missing/disambiguation articles fail validation. Browser reads refresh
these excerpts later using the same public, anonymous MediaWiki API.
"""
import concurrent.futures, datetime, json, pathlib, re, urllib.parse, urllib.request
ROOT=pathlib.Path(__file__).resolve().parent.parent
spec=json.loads((ROOT/'scripts/wiki-specs.json').read_text())
titles=list(dict.fromkeys(spec['titles'].values()))
checked=datetime.datetime.now(datetime.timezone.utc).isoformat()

def short_excerpt(text,limit=180):
    text=re.sub(r'\n{3,}','\n\n',text).strip()
    words=list(re.finditer(r'\S+',text))
    if len(words)<=limit:return text
    cut=text[:words[limit-1].end()]
    stop=max(cut.rfind('. '),cut.rfind('.\n'))
    return cut[:stop+1] if stop>len(cut)*.65 else cut+'…'

def fetch_batch(batch):
    params={'action':'query','format':'json','formatversion':'2','origin':'*','prop':'extracts|info|pageprops','inprop':'url','exintro':'1','explaintext':'1','exlimit':'max','exchars':'4000','redirects':'1','titles':'|'.join(batch)}
    req=urllib.request.Request('https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode(params),headers={'User-Agent':'ManyHistoriesAtlas/1.0 (https://many-histories-atlas.chisom-fn.chatgpt.site; educational timeline)','Origin':'https://many-histories-atlas.chisom-fn.chatgpt.site'})
    with urllib.request.urlopen(req,timeout=35) as response:
        data=json.load(response)
        cors=response.headers.get('Access-Control-Allow-Origin')
    query=data.get('query',{});mapping={x['from']:x['to'] for x in query.get('normalized',[])+query.get('redirects',[])}
    by_title={p['title']:p for p in query.get('pages',[])}
    out={}
    for requested in batch:
        target=requested;seen=set()
        while target in mapping and target not in seen:seen.add(target);target=mapping[target]
        page=by_title.get(target)
        if not page or page.get('missing') or 'disambiguation' in page.get('pageprops',{}):raise RuntimeError('Unresolved or ambiguous article: '+requested+' -> '+str(target))
        if not page.get('extract'):raise RuntimeError('Empty article extract: '+requested)
        out[requested]={'title':page['title'],'pageid':page['pageid'],'url':page['fullurl'],'revision':page.get('lastrevid'),'extract':short_excerpt(page['extract']),'checked':checked}
    print(json.dumps({'resolved':len(out),'cors':cors}),flush=True)
    return out

resolved={}
if (ROOT/'dist/wiki-data.js').exists() and (ROOT/'scripts/wiki-audit.json').exists():
    previous=(ROOT/'dist/wiki-data.js').read_text()
    previous_pages=json.loads(previous.split('const WIKI_PAGES=',1)[1].split(';\nconst WIKI_LINKS=',1)[0])
    by_name={p['title']:p for p in previous_pages.values()}
    audit=json.loads((ROOT/'scripts/wiki-audit.json').read_text())
    for requested,canonical in audit['resolvedTitles'].items():
        if requested in titles and canonical in by_name:resolved[requested]=by_name[canonical]
pending=[t for t in titles if t not in resolved]
batches=[pending[i:i+20] for i in range(0,len(pending),20)]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(fetch_batch,batches):resolved.update(result)
pages={str(p['pageid']):p for p in resolved.values()}
links={id:str(resolved[title]['pageid']) for id,title in spec['titles'].items()}
related={}
for article in spec.get('related',[]):
    page=resolved[article['wikiTitle']]
    related.setdefault(article['history'],[]).append({**article,'pageid':str(page['pageid']),'url':page['url']})
js='// Wikipedia excerpts, 180 words maximum per distinct article.\n// Attribution: Wikipedia contributors, CC BY-SA 4.0.\nconst WIKI_PAGES='+json.dumps(pages,ensure_ascii=False,separators=(',',':'))+';\nconst WIKI_LINKS='+json.dumps(links,ensure_ascii=False,separators=(',',':'))+';\nconst MILESTONES='+json.dumps(spec['milestones'],ensure_ascii=False,separators=(',',':'))+';\nconst RELATED_READINGS='+json.dumps(related,ensure_ascii=False,separators=(',',':'))+';\nfor(const h of [...HISTORIES,...CONNECTION_EXTRAS,...ATLAS_TOPICS,...REGIONAL_ENTRIES,...MILESTONES]){const p=WIKI_PAGES[WIKI_LINKS[h.id]];SOURCES["wikipedia_"+h.id]={publisher:"Wikipedia contributors",title:p.title,url:p.url};h.wikipedia={title:p.title,url:p.url,pageid:p.pageid};const update=POSTER_UPDATES[h.id];if(update){h.posterLabels=update.posterLabels;h.posterNotes=update.notes;h.sources=[...new Set([...(h.sources||[]),...update.sources])];}}\n'
(ROOT/'dist/wiki-data.js').write_text(js)
(ROOT/'scripts/wiki-audit.json').write_text(json.dumps({'checked':checked,'entries':len(links),'distinctArticles':len(pages),'resolvedTitles':{t:p['title'] for t,p in resolved.items()}},ensure_ascii=False,indent=2))
print(json.dumps({'saved':str(ROOT/'dist/wiki-data.js'),'entries':len(links),'distinctArticles':len(pages)}),flush=True)

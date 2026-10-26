const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const context=vm.createContext({});
vm.runInContext(['data.js','additions.js','modern.js','connections-data.js','poster-data.js','connection-coverage.js','regional-data.js','wiki-data.js','prominence-data.js'].map(f=>read('dist/'+f)).join('\n')+'\nthis.data={REGIONS,HISTORIES,SOURCES,MILESTONES,WIKI_PAGES,WIKI_LINKS,RELATED_READINGS,CONNECTION_MAPS,CONNECTION_EXTRAS,CONNECTION_TYPES,ATLAS_TOPICS,POSTER_ITEMS,POSTER_COUNTRIES,PROMINENCE_TIERS,PROMINENCE_RATINGS,PROMINENCE_PHASES,CONNECTION_COVERAGE,CONNECTION_UNCERTAINTIES,REGIONAL_ENTRIES,REGIONAL_COLLECTIONS,REGIONAL_MEMBERSHIP};',context);
const {REGIONS,HISTORIES,SOURCES,MILESTONES,WIKI_PAGES,WIKI_LINKS,RELATED_READINGS,CONNECTION_MAPS,CONNECTION_EXTRAS,CONNECTION_TYPES,ATLAS_TOPICS,POSTER_ITEMS,POSTER_COUNTRIES,PROMINENCE_TIERS,PROMINENCE_RATINGS,PROMINENCE_PHASES,CONNECTION_COVERAGE,CONNECTION_UNCERTAINTIES,REGIONAL_ENTRIES,REGIONAL_COLLECTIONS,REGIONAL_MEMBERSHIP}=context.data;
const related=Object.values(RELATED_READINGS).flat();
const all=[...HISTORIES,...MILESTONES,...CONNECTION_EXTRAS,...ATLAS_TOPICS,...REGIONAL_ENTRIES,...related.filter(r=>!ATLAS_TOPICS.some(t=>t.id===r.id))],ids=new Set();
for(const entry of all){
 assert(!ids.has(entry.id),'Duplicate entry '+entry.id);ids.add(entry.id);
 const page=WIKI_PAGES[WIKI_LINKS[entry.id]];
 assert(page?.extract&&page.title&&page.revision,'Missing Wikipedia metadata '+entry.id);
 assert.equal(new URL(page.url).hostname,'en.wikipedia.org');
 assert.equal(new URL(page.url).protocol,'https:');
 assert(page.extract.trim().split(/\s+/).length<=180,'Oversized excerpt '+entry.id);
 assert(Number.isFinite(Date.parse(page.checked)),'Missing saved date '+entry.id);
}
for(const [owner,articles] of Object.entries(RELATED_READINGS)){
 assert(HISTORIES.some(h=>h.id===owner),'Unknown related-reading owner '+owner);
 for(const article of articles){assert.equal(article.pageid,WIKI_LINKS[article.id]);assert(article.reference?.publisher&&article.reference?.title);assert.equal(new URL(article.reference.url).protocol,'https:');}
}
for(const h of HISTORIES){
 assert(h.start<h.end&&h.start!==0&&h.end!==0,'Invalid dates '+h.id);
 assert(REGIONS.some(r=>r.id===h.region),'Unknown region '+h.id);
 assert(h.note&&h.sources.length,'Missing context '+h.id);
 for(const key of h.sources)assert(SOURCES[key]?.url,'Missing reference '+key);
}
for(const topic of ATLAS_TOPICS){
 assert(topic.title&&topic.dates&&topic.note&&topic.category,'Incomplete detailed topic '+topic.id);
 if(topic.parent)assert(all.some(h=>h.id===topic.parent),'Unknown related topic '+topic.id);
 if(topic.region)assert(REGIONS.some(r=>r.id===topic.region),'Unknown topic region '+topic.id);
 for(const key of topic.sources)assert(SOURCES[key]?.url,'Missing topic source '+topic.id);
 const chain=new Set([topic.id]);let parent=topic.parent;
 while(parent){assert(!chain.has(parent),'Cyclic topic hierarchy '+topic.id);chain.add(parent);parent=all.find(h=>h.id===parent)?.parent;}
}
for(const entry of REGIONAL_ENTRIES){
 assert(entry.regionalOnly&&entry.category&&entry.note&&entry.location&&entry.dates);
 assert(entry.start!==0&&entry.end!==0);
 if(Number.isFinite(entry.start)&&Number.isFinite(entry.end))assert(entry.start<entry.end);
 assert(entry.sources.length);for(const k of entry.sources)assert(SOURCES[k]?.url,'Missing regional source '+entry.id);
 assert(REGIONAL_MEMBERSHIP[entry.id]?.length,'New entry has no regional home '+entry.id);
}
assert.equal(new Set(REGIONAL_COLLECTIONS.map(c=>c.id)).size,REGIONAL_COLLECTIONS.length);
for(const collection of REGIONAL_COLLECTIONS){assert(collection.title&&collection.note&&collection.color);assert.equal(new Set(collection.entries).size,collection.entries.length);for(const id of collection.entries)assert(all.some(e=>e.id===id),'Unknown regional entry '+id);}
const posterSpec=JSON.parse(read('scripts/poster-spec.json'));
assert.equal(posterSpec.items.length,POSTER_ITEMS.length);
for(const item of POSTER_ITEMS){assert(item.label&&item.correction,'Incomplete poster mapping '+item.id);assert(all.some(h=>h.id===item.entryId),'Unrepresented poster label '+item.label);assert(WIKI_LINKS[item.entryId],'No article for '+item.label);}
assert.equal(POSTER_ITEMS.filter(i=>i.category==='milestone').length,30,'All 30 poster milestones must be mapped');
assert.equal(POSTER_ITEMS.filter(i=>i.category==='landmark').length,52,'All 52 poster landmarks must be mapped');
assert.equal(POSTER_COUNTRIES.length,21);
for(const country of POSTER_COUNTRIES)assert(HISTORIES.some(h=>h.id===country.id&&h.ongoing),'Missing modern country '+country.title);
const layout=JSON.parse(read('dist/layout.json'));
const modernLayout=JSON.parse(read('dist/modern-layout.json'));
const equalLayout=JSON.parse(read('dist/equal-layout.json')),modernEqualLayout=JSON.parse(read('dist/modern-equal-layout.json'));
const mapsLayout=JSON.parse(read('dist/connections-layout.json'));
const mapGlyphWidths=require('./font-metrics.json').widths;
const mapTextWidth=(s,f)=>[...s].reduce((n,c)=>n+(mapGlyphWidths[c]??.75),0)*f*1.03;
const edgeIds=new Set();
const rectanglesOverlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y);
const mapEntries=[...HISTORIES,...CONNECTION_EXTRAS,...ATLAS_TOPICS];
for(const map of CONNECTION_MAPS){
 const graph=mapsLayout.find(g=>g.id===map.id);assert(graph,'Missing map '+map.id);
 const nodeIds=new Set(map.nodes.map(n=>n.id));assert.equal(nodeIds.size,map.nodes.length);
 assert.equal(graph.edges.length,map.connections.length);
 for(const node of graph.nodes){assert(mapEntries.some(e=>e.id===node.id),'Unknown map node '+node.id);assert(node.x>=0&&node.y>=180&&node.x+node.w<=map.width&&node.y+node.h<=map.height-100,'Clipped map node '+node.id);}
 for(const node of graph.nodes)for(const line of node.lines)assert(mapTextWidth(line,node.font)<=node.w-20,'Map title overflows: '+node.id);
 for(let i=0;i<graph.nodes.length;i++)for(let j=i+1;j<graph.nodes.length;j++)assert(!rectanglesOverlap(graph.nodes[i],graph.nodes[j]),'Overlapping map nodes');
 for(const edge of map.connections){
  assert(!edgeIds.has(edge.id),'Duplicate event '+edge.id);edgeIds.add(edge.id);
  assert(CONNECTION_TYPES[edge.type]&&edge.label&&edge.dates&&edge.summary&&edge.note,'Incomplete event '+edge.id);
  assert(edge.from.length&&edge.to.length);for(const id of [...edge.from,...edge.to])assert(nodeIds.has(id),'Unknown event endpoint '+id);
  assert(edge.sources.length);for(const key of edge.sources)assert(SOURCES['connection_'+key]?.url,'Unresolved relationship source '+key);
  if(edge.type==='division'&&edge.to.length===1)assert(edge.selectedBranch&&edge.note.length>30,'A selected/grouped division must be explicit: '+edge.id);
 }
 for(const edge of graph.edges){
  assert(edge.box.x>=0&&edge.box.x+edge.box.w<=graph.width,'Clipped arrow label '+edge.id);
  for(const node of graph.nodes)assert(!rectanglesOverlap(edge.box,node),'Arrow label covers a node: '+edge.id);
  for(const route of edge.routes)for(const segment of route.segments)for(let step=0;step<=50;step++){
   const t=step/50,u=1-t;
   const point=segment.kind==='line'?{x:u*segment.a.x+t*segment.b.x,y:u*segment.a.y+t*segment.b.y}:{x:u**3*segment.a.x+3*u*u*t*segment.c1.x+3*u*t*t*segment.c2.x+t**3*segment.b.x,y:u**3*segment.a.y+3*u*u*t*segment.c1.y+3*u*t*t*segment.c2.y+t**3*segment.b.y};
   for(const node of graph.nodes){if(edge.from.includes(node.id)||edge.to.includes(node.id))continue;assert(!(point.x>node.x+2&&point.x<node.x+node.w-2&&point.y>node.y+2&&point.y<node.y+node.h-2),'Arrow crosses unrelated node: '+edge.id+' / '+node.id);}
  }
 }
 for(let i=0;i<graph.edges.length;i++)for(let j=i+1;j<graph.edges.length;j++)assert(!rectanglesOverlap(graph.edges[i].box,graph.edges[j].box),'Overlapping arrow labels');
}
for(const map of CONNECTION_MAPS)for(const link of map.continuations||[]){assert(CONNECTION_MAPS.some(m=>m.id===link.map&&m.nodes.some(n=>n.id===link.history)),'Invalid cross-map continuation '+map.id);}
// Coverage is against this atlas, including explicit evidence limitations.
assert.equal(CONNECTION_COVERAGE.totals.timelineHistories,HISTORIES.length);
assert.equal(CONNECTION_COVERAGE.totals.represented,HISTORIES.length);
assert.equal(CONNECTION_COVERAGE.totals.unmapped,0);
assert.equal(CONNECTION_COVERAGE.totals.maps,CONNECTION_MAPS.length);
assert.equal(CONNECTION_COVERAGE.totals.relationships,edgeIds.size);
assert.equal(new Set(CONNECTION_COVERAGE.entries.map(e=>e.id)).size,HISTORIES.length);
for(const map of CONNECTION_MAPS)assert(REGIONS.some(r=>r.id===map.region)||map.region==='world','Unindexed map region '+map.id);
for(const row of CONNECTION_COVERAGE.entries){
 assert(HISTORIES.some(h=>h.id===row.id));assert(row.maps.length,'Missing map '+row.id);
 for(const id of row.maps)assert(CONNECTION_MAPS.some(m=>m.id===id&&m.nodes.some(n=>n.id===row.id)));
 for(const id of row.relationships)assert(edgeIds.has(id));
 assert(['linked','context','explained'].includes(row.status));
 if(row.status==='context')assert(row.relationshipTypes.every(t=>t==='context'));
 if(row.status==='explained'){assert.equal(row.relationships.length,0);assert(row.reason.length>60&&row.sources.length);for(const k of row.sources)assert(SOURCES['connection_'+k]?.url);}
}
assert.equal(CONNECTION_COVERAGE.entries.find(e=>e.id==='caral').status,'explained');
assert.equal(CONNECTION_COVERAGE.entries.find(e=>e.id==='nok').status,'context');
const sovietSuccessors=['russiafederation','cn-ukraine','cn-belarus','cn-moldova','cn-estonia','cn-latvia','cn-lithuania','cn-armenia','cn-azerbaijan','cn-georgia','cn-kazakhstan','cn-kyrgyzstan','cn-tajikistan','cn-turkmenistan','cn-uzbekistan'];
for(const id of sovietSuccessors)assert(CONNECTION_MAPS.some(m=>m.id.startsWith('soviet-')&&m.connections.some(e=>['division','independence'].includes(e.type)&&e.from.includes('sovietunion')&&e.to.includes(id))),'Missing Soviet successor '+id);
const event=id=>CONNECTION_MAPS.flatMap(m=>m.connections).find(e=>e.id===id);
assert.equal(event('verdun843').to.length,3);
const reachable=(from,to)=>{const seen=new Set(),pending=[from];while(pending.length){const id=pending.pop();if(id===to)return true;if(seen.has(id))continue;seen.add(id);for(const map of CONNECTION_MAPS)for(const e of map.connections)if(e.from.includes(id))pending.push(...e.to);}return false;};
for(const [from,to] of [['cn-ilkhanate','iran-islamic-republic'],['cn-goldenhorde','russiafederation'],['benin','nigeria'],['mali','cn-mali-modern'],['holyroman','germanymodern'],['cn-newgranada','cn-colombia']])assert(reachable(from,to),'Missing selected route to modern era: '+from);
assert.deepEqual(Array.from(event('union1707').from),['england','scotland']);
assert.deepEqual(Array.from(event('partition1947').to),['indiamodern','pakistan']);
assert(event('china1949').note.includes('1945'));
assert.equal(event('ife-benin').certainty,'Tradition');
assert.equal(event('ea-yuan-kamakura').type,'contact','Failed invasions must not claim conquest');
assert.equal(event('ea-tang-nara').dates,'8th century CE');
assert.equal(HISTORIES.find(h=>h.id==='poster-europe-035').end,1071);
assert.equal(layout.length,HISTORIES.length,'Unrendered history');
assert.equal(new Set(layout.map(l=>l.id)).size,HISTORIES.length);
assert.equal(modernLayout.length,HISTORIES.filter(h=>h.end>1450&&h.start<2026).length,'Unrendered modern history');
assert.equal(equalLayout.length,layout.length);assert.equal(modernEqualLayout.length,modernLayout.length);
assert.equal(Object.keys(PROMINENCE_RATINGS).length,HISTORIES.length,'Every history requires an explicit weighting review');
for(const h of HISTORIES){const rating=PROMINENCE_RATINGS[h.id];assert(rating?.reason&&PROMINENCE_TIERS[rating.tier],'Missing weighting '+h.id);}
for(const [id,phases] of Object.entries(PROMINENCE_PHASES)){
 const h=HISTORIES.find(h=>h.id===id);assert(h);assert.equal(phases[0].start,h.start);assert.equal(phases.at(-1).end,h.end);
 for(const [i,p] of phases.entries()){assert(p.start<p.end&&p.multiplier>0&&p.multiplier<=1&&p.label);if(i)assert.equal(phases[i-1].end,p.start);}
}
for(const [list,start] of [[layout,-4500],[modernLayout,1450],[equalLayout,-4500],[modernEqualLayout,1450]])for(const l of list){
 const h=HISTORIES.find(h=>h.id===l.id);
 assert((l.mode==='prominence'||l.label.fits)&&l.label.font>=4,'Unfitted label '+l.id);
 const textHeight=l.label.lines.length*l.label.font*1.23+(l.label.padding??2);
 if(l.label.visible)assert(textHeight<=(l.label.rotated?l.label.width-8:l.label.height)+.01,'Label exceeds band '+l.id);
 assert.equal(l.segments[0].start,Math.max(start,h.start));
 assert.equal(l.segments.at(-1).end,Math.min(2026,h.end));
 for(const s of l.segments)assert(s.start<s.end&&s.x0<s.x1&&s.x0>=95.99&&s.x1<=1772.01,'Invalid segment '+l.id);
}
for(const list of [layout,modernLayout,equalLayout,modernEqualLayout])for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
 const a=list[i],b=list[j];
 for(const x of a.segments)for(const y of b.segments){
  const time=Math.min(x.end,y.end)-Math.max(x.start,y.start),width=Math.min(x.x1,y.x1)-Math.max(x.x0,y.x0);
  assert(!(time>0&&width>.001),'Overlapping blocks '+a.id+' / '+b.id);
 }
}
const widthAt=(list,id,year)=>{const s=list.find(h=>h.id===id).segments.find(s=>s.start<=year&&s.end>year);return s.x1-s.x0;};
assert(widthAt(layout,'rome',120)>widthAt(equalLayout,'rome',120)*1.8,'Rome should stand out visibly');
assert(widthAt(layout,'rome',120)>widthAt(layout,'rome',420),'Roman decline should contract the selected western frame');
for(const id of ['rome','han','mongol','persia','ottoman','britishempire'])assert(layout.find(h=>h.id===id).label.visible,'Prominent history must retain a label '+id);
assert.equal(HISTORIES.find(h=>h.id==='hittite').start,-1650);
assert.equal(HISTORIES.find(h=>h.id==='phoenicia').start,-1200);
assert.equal(HISTORIES.find(h=>h.id==='asante').end,1902);
assert.equal(WIKI_PAGES[WIKI_LINKS.rapanui].title,'Moai');
for(const id of ['britishempire','greatbritain','unitedkingdom','britishamerica','unitedstates','canada','nigeria','indiamodern','prchina','sovietunion'])assert(modernLayout.some(l=>l.id===id),'Missing important modern history '+id);
for(const l of modernLayout){assert.equal(l.fill,layout.find(x=>x.id===l.id).fill,'Color changes between eras '+l.id);}
assert.equal(HISTORIES.find(h=>h.id==='greatbritain').end,HISTORIES.find(h=>h.id==='unitedkingdom').start);
assert.equal(HISTORIES.find(h=>h.id==='republicchina').end,HISTORIES.find(h=>h.id==='taiwanroc').start);
assert(HISTORIES.find(h=>h.id==='unitedstates').ongoing);
assert(MILESTONES.find(m=>m.id==='event-angloamerica').dates.includes('no single founding date'));
const html=read('dist/index.html');
assert.match(html,/<div id="detail-content"><\/div><footer class="reader-actions">/,'Actions must be outside the scrolling article');
assert.match(html,/<a id="wiki-full"[^>]*target="_self"/,'Reader must use native direct same-tab navigation');
assert.equal((html.match(/class="history"/g)||[]).length,layout.length+modernLayout.length+equalLayout.length+modernEqualLayout.length);
const htmlIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(htmlIds.length,new Set(htmlIds).size,'Duplicate HTML/SVG IDs');
let previous=-1;
assert.equal((html.match(/class="map-node"/g)||[]).length,mapsLayout.reduce((n,g)=>n+g.nodes.length,0));
assert.equal((html.match(/class="map-edge"/g)||[]).length,edgeIds.size);
for(const script of ['data.js','additions.js','modern.js','connections-data.js','poster-data.js','connection-coverage.js','regional-data.js','wiki-data.js','prominence-data.js','app.js']){const pos=html.indexOf('src="'+script+'?v=');assert(pos>previous,'Versioned script load order');previous=pos;}

// Exercise application state and network races without emulating browser layout.
class Element{
 constructor(id){this.id=id;this.innerHTML='';this.textContent='';this.hidden=false;this.open=false;this.value='';this.style={};this.dataset={};this.listeners={};this.clientWidth=1200;this.clientHeight=800;this.scrollTop=0;this.scrollLeft=0;this.tagName='BUTTON';this.classes=new Set();this.classList={add:c=>this.classes.add(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 setAttribute(key,value){this[key]=value;}
 removeAttribute(key){delete this[key];}
 getBoundingClientRect(){return {width:1200,left:0,top:0,right:1200,bottom:800};}
 focus(){document.activeElement=this;}
 querySelector(selector){if(selector==='.block-label'||selector==='.map-label')return this.labelTarget??=new Element(this.id+'-label');return null;}
 scrollIntoView(options){this.scrolled=options;}
 showModal(){this.open=true;}
 close(){this.open=false;for(const fn of this.listeners.close||[])fn({target:this});}
}
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
const blocks=[[layout,'all'],[modernLayout,'modern'],[equalLayout,'all-equal'],[modernEqualLayout,'modern-equal']].flatMap(([list,era])=>list.map(h=>{const block=element('block-'+era+'-'+h.id);block.dataset.history=h.id;return block;}));
for(const map of mapsLayout)for(const node of map.nodes){const block=element('map-node-'+map.id+'-'+node.id);block.dataset.history=node.id;block.dataset.map=map.id;blocks.push(block);}
const mapEdges=mapsLayout.flatMap(map=>map.edges.map(edge=>{const el=element('map-edge-'+map.id+'-'+edge.id);el.dataset.connection=edge.id;el.dataset.map=map.id;return el;}));
const documentListeners={};
const document={activeElement:element('sources'),querySelector:s=>s==='dialog[open]'?[...elements.values()].find(e=>e.open):element(s.slice(1)),querySelectorAll:s=>s==='.history,.map-node'?blocks:s==='.map-edge'?mapEdges:[],getElementById:element,addEventListener:(type,fn)=>(documentListeners[type]??=[]).push(fn)};
const pending=[];
const frames=[],motion={matches:false},timerJobs=new Map();let nextTimer=0;
const app=vm.createContext({...context.data,document,window:{innerWidth:1200,innerHeight:900,addEventListener:()=>{},matchMedia:()=>motion},location:{href:'https://example.test/',search:''},history:{replaceState:()=>{}},URL,URLSearchParams,AbortController,Map,Date,requestAnimationFrame:fn=>frames.push(fn),setTimeout:(fn,ms)=>{const id=++nextTimer;timerJobs.set(id,{fn,ms});return id;},clearTimeout:id=>timerJobs.delete(id),fetch:(url,options)=>new Promise((resolve,reject)=>pending.push({url,options,resolve,reject}))});
vm.runInContext(read('dist/app.js')+'\nthis.api={openHistory,showArticle,showSelectedOnChart,locateHistory,search,setZoom,setEra,showMilestones,showSources,excerpt,selectConnectionMap,openConnection,showConnectionKey,showIndex,renderIndex,locationTarget,setSizing,showSizingGuide,jumpToMap,showHistoryTooltip,hideHistoryTooltip,showMapIndex,renderMapIndex,chooseConnectionMap,connectionMapZoom,renderRegional,selectRegionalCollection,openRegion,locateRegional,showRegionalKey};',app);
const {api}=app;
const settle=async()=>{for(let n=0;n<8;n++)await Promise.resolve();};
const response=(request,id,extract)=>request.resolve({ok:true,json:async()=>({query:{pages:[{pageid:WIKI_PAGES[WIKI_LINKS[id]].pageid,title:WIKI_PAGES[WIKI_LINKS[id]].title,fullurl:WIKI_PAGES[WIKI_LINKS[id]].url,extract}]}})});
(async()=>{
 // Full hover labels work on narrow blocks, both sizing modes and map nodes.
 const tooltip=element('history-tooltip');tooltip.getBoundingClientRect=()=>({width:300,height:76,left:0,top:0,right:300,bottom:76});
 for(const [blockId,id] of [['block-all-rome','rome'],['block-modern-britishempire','britishempire'],['block-all-equal-rome','rome'],['block-modern-equal-britishempire','britishempire'],['map-node-iran-modern-cn-ilkhanate','cn-ilkhanate']]){
  const block=element(blockId);block.listeners.pointerenter[0]({pointerType:'mouse',clientX:1198,clientY:898});
  const entry=[...HISTORIES,...CONNECTION_EXTRAS,...ATLAS_TOPICS].find(h=>h.id===id);
  assert(!tooltip.hidden);assert.equal(element('history-tooltip-name').textContent,entry.title);assert.equal(element('history-tooltip-dates').textContent,entry.dates);assert.equal(block['aria-describedby'],'history-tooltip');
  assert(parseFloat(tooltip.style.left)>=12&&parseFloat(tooltip.style.left)+300<=1188,'Tooltip must stay within the viewport horizontally');
  assert(parseFloat(tooltip.style.top)>=12&&parseFloat(tooltip.style.top)+76<=888,'Tooltip must stay within the viewport vertically');
  block.listeners.pointerleave[0]();assert([...timerJobs.values()].some(t=>t.ms===160));tooltip.listeners.pointerenter[0]();assert(![...timerJobs.values()].some(t=>t.ms===160),'The popup must stay visible while hovered');
  tooltip.listeners.pointerleave[0]();assert(tooltip.hidden);assert.equal(block['aria-describedby'],undefined);
 }
 const hoverBlock=element('block-all-rome');hoverBlock.listeners.pointerenter[0]({pointerType:'touch',clientX:100,clientY:200});assert(tooltip.hidden,'Touch must keep the existing tap-to-read behavior');
 hoverBlock.listeners.focus[0]();assert(!tooltip.hidden);hoverBlock.listeners.blur[0]();assert(tooltip.hidden);
 hoverBlock.listeners.focus[0]();for(const fn of documentListeners.keydown)fn({key:'Escape',target:{closest:()=>null}});assert(tooltip.hidden,'Escape dismisses the popup');
 hoverBlock.listeners.focus[0]();api.setEra('modern');assert(tooltip.hidden,'Switching views clears old tooltips');api.setEra('all');
 hoverBlock.listeners.focus[0]();api.openHistory('egypt');assert(tooltip.hidden,'Opening a reader hides the hover label');
 element('search-panel').hidden=false;for(const fn of documentListeners.keydown)fn({key:'Escape',target:{closest:()=>null}});assert(!element('search-panel').hidden,'Escape inside a modal must not alter the search underneath');element('search-panel').hidden=true;

 assert(element('detail').open);
 assert(element('wiki-topics').innerHTML.includes('Pyramids of Giza'));
 assert(element('block-all-egypt').classes.has('selected'));
 let prevented=false;for(const fn of documentListeners.click)fn({target:{closest:()=>null},preventDefault:()=>prevented=true});assert(!prevented,'Wikipedia tap intercepted by app');
 assert.equal(element('wiki-full').href,WIKI_PAGES[WIKI_LINKS.egypt].url);
 assert(element('wiki-credit').innerHTML.includes('Saved '));
 assert.equal(new URL(pending[0].url).searchParams.get('pageids'),String(WIKI_PAGES[WIKI_LINKS.egypt].pageid));
 assert.equal(pending[0].options.credentials,'omit');
 api.openHistory('mali');assert(pending[0].options.signal.aborted);
 response(pending[0],'egypt','STALE EGYPT RESPONSE.');await settle();
 assert(!element('wiki-text').innerHTML.includes('STALE'));
 assert(!vm.runInContext('liveCache.has(WIKI_PAGES[WIKI_LINKS.egypt].pageid)',app),'Aborted requests must not pollute the article cache');
 response(pending[1],'mali','Mali history <script>unsafe</script> & context.');await settle();
 assert(element('wiki-text').innerHTML.includes('&lt;script&gt;unsafe&lt;/script&gt;'));
 assert(!element('wiki-text').innerHTML.includes('<script>'));
 assert(element('wiki-credit').innerHTML.includes('Checked '));assert(!element('wiki-credit').innerHTML.includes('just now'));
 api.openHistory('qin');const saved=element('wiki-text').innerHTML;
 pending[2].reject(new Error('Offline'));await settle();
 assert.equal(element('wiki-text').innerHTML,saved);assert(element('wiki-credit').innerHTML.includes('Saved '));
 api.openHistory('rome');const closed=element('wiki-text').innerHTML;
 element('detail').close();assert(pending[3].options.signal.aborted);
 response(pending[3],'rome','LATE CLOSED RESPONSE.');await settle();assert.equal(element('wiki-text').innerHTML,closed);
 assert(!vm.runInContext('liveCache.has(WIKI_PAGES[WIKI_LINKS.rome].pageid)',app),'Closed readers must not accept late cache writes');
 api.openHistory('event-worldwartwo');assert(element('detail-content').innerHTML.includes('Second World War'));
 assert(element('locate-history').hidden,'Events must not claim a chart block');
 api.showSelectedOnChart();assert(element('detail').open);
 pending[4].reject(new Error('Offline'));await settle();
 api.showMilestones();assert.equal((element('milestone-list').innerHTML.match(/data-history=/g)||[]).length,MILESTONES.length+ATLAS_TOPICS.filter(t=>t.category==='milestone').length);
 api.showSources();assert(element('coverage-scope').textContent.includes('not an exhaustive account'));
 element('search').value='Maori';api.search();assert(element('search-results').innerHTML.includes('data-history="maori"'));
 element('search').value='Nigeria';api.search();assert(element('search-results').innerHTML.includes('data-history="ife"'));
 api.setEra('modern');assert(element('chart-all').hidden);assert(!element('chart-modern').hidden);assert.equal(element('era-modern')['aria-pressed'],'true');assert.equal(element('download').href,'modern-chart.svg');
 element('search').value='Anglo America';api.search();assert(element('search-results').innerHTML.includes('data-history="unitedstates"'));assert(element('search-results').innerHTML.includes('data-history="canada"'));
 element('search').value='Qin';api.search();assert(element('search-results').innerHTML.includes('data-history="qin"'),'Search must include ancient histories from Modern view');
 api.setEra('all');assert(!element('chart-all').hidden);assert(element('chart-modern').hidden);assert.equal(element('download').href,'chart.svg');
 api.search();assert(element('search-results').innerHTML.includes('data-history="qin"'));
 api.setZoom(99);assert.equal(element('fit').textContent,'1200%');assert(element('zoom-in').disabled);
 api.setZoom(-99);assert.equal(element('fit').textContent,'Fit');assert(element('zoom-out').disabled);
 assert(api.excerpt('word '.repeat(250)).trim().split(/\s+/).length<=180);
 // Related articles must update text, link, source and pressed state together.
 api.openHistory('mughal');const overviewRequest=pending.at(-1);
 api.showArticle('reading-tajmahal');assert(overviewRequest.options.signal.aborted);
 const relatedRequest=pending.at(-1),relatedPage=WIKI_PAGES[WIKI_LINKS['reading-tajmahal']];
 assert.equal(element('wiki-full').href,relatedPage.url);assert.equal(element('wiki-article-name').textContent,relatedPage.title);
 assert.match(element('wiki-topics').innerHTML,/data-article="reading-tajmahal" aria-pressed="true"/);
 assert(!element('wiki-topic-reference').hidden);assert.equal(element('wiki-topic-reference').href,RELATED_READINGS.mughal[0].reference.url);
 response(overviewRequest,'mughal','OUTDATED OVERVIEW.');await settle();assert(!element('wiki-text').innerHTML.includes('OUTDATED'));
 response(relatedRequest,'reading-tajmahal','Taj Mahal article refreshed.');await settle();assert(element('wiki-text').innerHTML.includes('Taj Mahal article refreshed.'));
 api.showArticle('overview');assert.equal(element('wiki-full').href,WIKI_PAGES[WIKI_LINKS.mughal].url);assert(element('wiki-topic-reference').hidden);
 api.openHistory('nigeria');const nigeriaRequest=pending.at(-1),nigeriaLink=element('wiki-full').href;api.showArticle('reading-colosseum');assert.equal(element('wiki-full').href,nigeriaLink,'Unrelated article must be rejected');
 api.setEra('all');api.openHistory('unitedkingdom');const locatingRequest=pending.at(-1);api.showSelectedOnChart();
 assert(!element('detail').open);assert(locatingRequest.options.signal.aborted);assert.equal(element('era-modern')['aria-pressed'],'true');
 while(frames.length)frames.shift()();
 assert.equal(document.activeElement.id,'block-modern-unitedkingdom');assert(element('block-modern-unitedkingdom').classes.has('selected'));assert.equal(element('block-modern-unitedkingdom').labelTarget.scrolled.block,'center');
 assert.equal(element('search').value,'');assert(element('search-panel').hidden);
 motion.matches=true;api.locateHistory('qin');while(frames.length)frames.shift()();
 assert.equal(element('era-all')['aria-pressed'],'true');assert.equal(document.activeElement.id,'block-all-qin');assert.equal(element('block-all-qin').labelTarget.scrolled.behavior,'auto');
 assert(!element('block-modern-unitedkingdom').classes.has('selected'));
 api.setEra('connections');assert(!element('chart-connections').hidden);assert(element('chart-all').hidden&&element('chart-modern').hidden);assert(!element('connection-controls').hidden);assert.equal(element('era-connections')['aria-pressed'],'true');assert.equal(element('download').href,'maps/britain-atlantic.svg');
 api.selectConnectionMap('rome-francia');assert(!element('connection-map-rome-francia').hidden);assert(element('connection-map-britain-atlantic').hidden);assert.equal(element('download').href,'maps/rome-francia.svg');
 api.selectConnectionMap('invalid-map');assert.equal(element('connection-network').value,'rome-francia');
 api.openConnection('union1707');assert(element('connection-detail').open);assert(element('connection-content').innerHTML.includes('English and Scottish'));assert(element('connection-content').innerHTML.includes('data-history="scotland"'));assert(element('connection-content').innerHTML.includes('Acts of Union 1707'));
 api.openHistory('cn-ireland');assert(!element('connection-detail').open&&element('detail').open);assert.equal(element('wiki-full').href,WIKI_PAGES[WIKI_LINKS['cn-ireland']].url);assert.equal(element('locate-history').textContent,'Locate on map');
 api.showSelectedOnChart();while(frames.length)frames.shift()();assert.equal(element('connection-network').value,'britain-atlantic');assert.equal(document.activeElement.id,'map-node-britain-atlantic-cn-ireland');
 api.openHistory('greatbritain');assert(element('detail-content').innerHTML.includes('data-connection="union1707"'));assert(element('map-edge-britain-atlantic-union1707').classes.has('related'));
 const switchingRequest=pending.at(-1);api.openConnection('union1707');assert(!element('detail').open&&element('connection-detail').open);assert(switchingRequest.options.signal.aborted);
 api.openHistory('scotland');assert(element('detail').open&&!element('connection-detail').open);element('detail').close();
 api.showConnectionKey();assert(element('connection-content').innerHTML.includes('not measure time, territory or ancestry'));assert(element('connection-content').innerHTML.includes('Independence'));element('connection-detail').close();
 element('search').value='Parthian';api.search();assert(element('search-results').innerHTML.includes('data-history="cn-parthian"'));api.locateHistory('cn-parthian');while(frames.length)frames.shift()();assert.equal(element('connection-network').value,'west-asia');assert.equal(document.activeElement.id,'map-node-west-asia-cn-parthian');
 api.setEra('modern');assert(element('chart-connections').hidden&&element('connection-controls').hidden);assert.equal(element('download').href,'modern-chart.svg');
 // A relationship on another map must not return keyboard focus to a hidden SVG.
 api.setEra('connections');api.selectConnectionMap('rome-francia');
 api.openConnection('union1707');element('connection-detail').close();
 assert.equal(document.activeElement.id,'era-connections','Closing an off-map relationship must focus a visible control');
 // The map catalogue searches across entries, filters regions and keeps focus visible.
 element('map-index-search').value='';element('map-index-region').value='all';element('connection-index-panel').scrollTop=900;api.showMapIndex();
 assert(element('connection-index-dialog').open);assert.equal(element('connection-index-panel').scrollTop,0);
 assert.equal((element('map-index-list').innerHTML.match(/data-select-map=/g)||[]).length,CONNECTION_MAPS.length);
 assert.equal((element('connection-coverage-list').innerHTML.match(/data-history=/g)||[]).length,HISTORIES.length);
 assert(element('connection-coverage-note').textContent.includes('not every event in world history'));
 element('map-index-search').value='Ilkhanate';api.renderMapIndex();assert(element('map-index-list').innerHTML.includes('data-select-map="iran-modern"'));
 element('map-index-search').value='';element('map-index-region').value='oceania';api.renderMapIndex();
 assert.equal((element('map-index-list').innerHTML.match(/data-select-map=/g)||[]).length,CONNECTION_MAPS.filter(m=>m.region==='oceania').length);
 element('map-index-search').value='zzzznohistoricalmatch';api.renderMapIndex();assert(element('map-index-list').innerHTML.includes('No matching maps'));
 api.chooseConnectionMap('afsu-sudan-nile');while(frames.length)frames.shift()();assert(!element('connection-index-dialog').open);assert.equal(element('connection-network').value,'afsu-sudan-nile');assert.equal(document.activeElement.id,'connection-network');
 api.showMapIndex();api.openHistory('caral');assert(!element('connection-index-dialog').open&&element('detail').open);assert(element('detail-content').innerHTML.includes('Why no succession arrow?'));element('detail').close();assert.equal(document.activeElement.id,'connection-index-toggle');
 // Every timeline entry is locatable in Connections, including the isolated Caral node.
 for(const entry of HISTORIES){api.locateHistory(entry.id);while(frames.length)frames.shift()();assert(document.activeElement.id.startsWith('map-node-')&&document.activeElement.dataset.history===entry.id,'Unlocatable map history '+entry.id);}
 const wideMap=CONNECTION_MAPS.reduce((a,b)=>a.width>b.width?a:b);app.window.innerWidth=390;const mobileZoom=api.connectionMapZoom(wideMap);assert(mobileZoom>=2.5&&mobileZoom<=12);api.selectConnectionMap(wideMap.id);assert.notEqual(element('fit').textContent,'Fit');app.window.innerWidth=1200;
 // Phone map openings must include the first row, rather than an empty margin.
 for(const view of [320,390,600]){
  app.window.innerWidth=view;element('canvas').clientWidth=view;
  for(const map of CONNECTION_MAPS){
   api.selectConnectionMap(map.id);const scale=parseFloat(element('paper').style.width)/map.width;
   const first=map.nodes.reduce((a,b)=>b.y<a.y?b:a),left=first.x*scale-element('canvas').scrollLeft,right=(first.x+228)*scale-element('canvas').scrollLeft;
   assert(left<view&&right>0,'First map row opens offscreen: '+map.id+' at '+view);
   assert(15*scale>=10,'Phone arrow labels are too small: '+map.id);
  }
 }
 app.window.innerWidth=1200;element('canvas').clientWidth=1200;
 api.openHistory('afsu-sudan');assert(!element('detail-content').innerHTML.includes('undefined dates'));assert(element('detail-content').innerHTML.includes('Date range'));element('detail').close();
 api.openConnection('afsu-alodia-funj');assert(element('connection-content').innerHTML.includes('Context / overlap'));assert(element('connection-content').innerHTML.includes('not a secure direct succession'));element('connection-detail').close();
 // Reusing a recent extract is fine; an expired one must be requested again.
 const cachedRequests=pending.length;api.openHistory('mali');
 assert.equal(pending.length,cachedRequests,'Fresh articles should reuse their cache');
 assert(element('wiki-credit').innerHTML.includes('Checked '),'Reopened readers should display the validated cached extract');
 vm.runInContext("liveCache.get(WIKI_PAGES[WIKI_LINKS.mali].pageid).checked='2000-06-01T12:00:00Z'",app);
 api.openHistory('mali');assert.equal(pending.length,cachedRequests+1,'Expired Wikipedia cache must refresh');
 assert(element('wiki-credit').innerHTML.includes('2000'),'An older cached extract must retain its real check date');
 assert(!element('wiki-credit').innerHTML.includes('just now'));
 const expiredFallback=element('wiki-text').innerHTML;
 pending.at(-1).reject(new Error('Offline'));await settle();element('detail').close();
 assert.equal(element('wiki-text').innerHTML,expiredFallback,'Keep the last validated extract if refreshing fails');
 // Scrolling content starts at the top each time a panel is opened.
 element('source-panel').scrollTop=900;api.showSources();assert.equal(element('source-panel').scrollTop,0);element('source-dialog').close();
 element('milestone-panel').scrollTop=900;api.showMilestones();assert.equal(element('milestone-panel').scrollTop,0);element('milestone-dialog').close();
 element('connection-content').scrollTop=900;api.openConnection('union1707');assert.equal(element('connection-content').scrollTop,0);element('connection-detail').close();
 element('connection-content').scrollTop=900;api.showConnectionKey();assert.equal(element('connection-content').scrollTop,0);element('connection-detail').close();
 for(const fn of element('search-toggle').listeners.click)fn();assert.equal(document.activeElement.id,'search');
 for(const fn of element('close-search').listeners.click)fn();assert.equal(document.activeElement.id,'search-toggle');assert(element('search-panel').hidden);
 // Every transcribed poster label is a direct, openable index result.
 element('index-search').value='';element('index-panel').scrollTop=900;api.showIndex('poster');assert(element('index-dialog').open);assert.equal(element('index-panel').scrollTop,0);
 assert.equal((element('index-list').innerHTML.match(/data-history=/g)||[]).length,POSTER_ITEMS.length);
 for(const item of POSTER_ITEMS)assert(element('index-list').innerHTML.includes('data-history="'+item.entryId+'"'),'Index omitted '+item.label);
 assert.equal((element('index-countries').innerHTML.match(/data-history=/g)||[]).length,21);
 element('index-kind').value='landmark';api.renderIndex();assert.equal((element('index-list').innerHTML.match(/data-history=/g)||[]).length,ATLAS_TOPICS.filter(t=>t.category==='landmark').length);
 element('index-kind').value='poster';element('index-search').value='Stonehenge';api.renderIndex();assert(element('index-list').innerHTML.includes('data-history="poster-stonehenge"'));
 api.openHistory('poster-stonehenge');assert(!element('index-dialog').open&&element('detail').open);assert.equal(element('wiki-full').href,WIKI_PAGES[WIKI_LINKS['poster-stonehenge']].url);assert(element('detail-content').innerHTML.includes('3000 BCE')&&element('detail-content').innerHTML.includes('long before the Celtic era'));
 element('detail').close();assert.equal(document.activeElement.id,'atlas-index');
 api.setEra('all');api.openHistory('egypt');assert(element('detail-content').innerHTML.includes('data-history="egypt-old-kingdom"'));assert(element('detail-content').innerHTML.includes('data-history="poster-karnak"'));
 api.openHistory('egypt-old-kingdom');assert.equal(element('wiki-full').href,WIKI_PAGES[WIKI_LINKS['egypt-old-kingdom']].url);assert.equal(api.locationTarget('egypt-old-kingdom'),'egypt');
 api.showSelectedOnChart();while(frames.length)frames.shift()();assert.equal(document.activeElement.id,'block-all-egypt');
 api.setEra('all');element('search').value='Wi-Fi';api.search();assert(element('search-results').innerHTML.includes('data-history="poster-wifi"'));
 document.activeElement=element('search');api.openHistory('event-moonlanding');element('detail').close();assert.equal(document.activeElement.id,'search','Searching a key event must return focus to search, not a hidden mobile control');
 // Search spans every view, including key events and new Jewish histories.
 for(const era of ['all','modern','connections']){
  api.setEra(era);element('search').value='moon landing';api.search();assert(element('search-results').innerHTML.includes('data-history="event-moonlanding"'),'Moon landing must be searchable from '+era);
  element('search').value='Jews';api.search();for(const id of ['judah','israel-samaria','hasmonean-judea','jewish-diaspora'])assert(element('search-results').innerHTML.includes('data-history="'+id+'"'),'Jewish history must be discoverable from '+era);
 }
 api.selectConnectionMap('west-asia');assert(element('connection-continuations').innerHTML.includes('data-map-target="iran-modern"'));
 api.openHistory('cn-ilkhanate');assert(element('detail-content').innerHTML.includes('<details class="other-maps">'),'Map links must be collapsible so the article stays accessible');assert(element('detail-content').innerHTML.includes('From the Ilkhanate to modern Iran'));assert(element('detail-content').innerHTML.includes('Connection-map nodes use equal sizes'));
 api.jumpToMap('iran-modern','cn-ilkhanate');while(frames.length)frames.shift()();assert(!element('detail').open);assert.equal(element('connection-network').value,'iran-modern');assert.equal(document.activeElement.id,'map-node-iran-modern-cn-ilkhanate');
 api.jumpToMap('iran-modern','iran-islamic-republic');while(frames.length)frames.shift()();assert.equal(document.activeElement.id,'map-node-iran-modern-iran-islamic-republic');
 api.openHistory('iran-islamic-republic');api.showSelectedOnChart();while(frames.length)frames.shift()();assert.equal(document.activeElement.id,'map-node-iran-modern-iran-islamic-republic');
 api.jumpToMap('south-asia','mughal');while(frames.length)frames.shift()();assert.equal(document.activeElement.id,'map-node-south-asia-mughal');
 api.setEra('all');assert.equal(api.locationTarget('iran-pahlavi'),'iranmodern','Timeline subperiods must locate their timeline parent');
 api.openHistory('event-holocaust');assert.equal(api.locationTarget('event-holocaust'),'germanymodern');assert(element('detail-content').innerHTML.includes('data-history="jewish-diaspora"'));element('detail').close();
 api.showMilestones();assert(element('milestone-list').innerHTML.includes('data-history="event-moonlanding"'));assert(element('milestone-list').innerHTML.includes('data-history="event-holocaust"'));element('milestone-dialog').close();
 assert.match(html,/<button id="search-toggle"[^>]*>[\s\S]*?<span>Search<\/span><\/button>/);
 assert(!read('dist/atlas-index.css').includes('#milestones{display:none}'),'Key events must remain accessible on mobile');
 // Both sizing modes keep the same entries, reader links and locate targets.
 api.setSizing('equal');assert(element('chart-all-prominence').hidden);assert(!element('chart-all-equal').hidden);assert.equal(element('size-equal')['aria-pressed'],'true');assert.equal(element('download').href,'equal-chart.svg');
 api.openHistory('rome');assert(element('detail-content').innerHTML.includes('Equal widths are currently selected'));element('detail').close();
 api.locateHistory('rome');while(frames.length)frames.shift()();assert.equal(document.activeElement.id,'block-all-equal-rome');
 api.setEra('modern');assert.equal(element('download').href,'modern-equal-chart.svg');assert(!element('sizing-controls').hidden);
 api.setEra('connections');assert(element('sizing-controls').hidden);assert(element('download').href.startsWith('maps/'));
 api.setSizing('prominence');api.setEra('all');assert(!element('chart-all-prominence').hidden);assert(element('chart-all-equal').hidden);assert.equal(element('download').href,'chart.svg');
 api.openHistory('rome');assert(element('detail-content').innerHTML.includes('Why this block is this size'));assert(element('detail-content').innerHTML.includes('Trajanic and Antonine reach'));element('detail').close();
 api.showSizingGuide();assert(element('sizing-dialog').open);element('sizing-dialog').close();
 for(const id of ['source-dialog','milestone-dialog','connection-detail','index-dialog','connection-index-dialog']){
  assert.match(html,new RegExp('<dialog id="'+id+'"[^>]*><button[^>]*class="close"[^>]*>×</button><div[^>]*class="dialog-content"'),'Close control must remain outside scrolling content: '+id);
 }
 // Region headings are links, with a readable catalogue independent of SVG size.
 api.openRegion('africa');while(frames.length)frames.shift()();assert.equal(element('era-regions')['aria-pressed'],'true');assert(element('zoom-tools').hidden&&element('sizing-controls').hidden);assert(!element('regional-controls').hidden);
 const africa=REGIONAL_COLLECTIONS.find(r=>r.id==='africa');assert.equal((element('regional-entries').innerHTML.match(/class="regional-entry/g)||[]).length,africa.entries.length);
 assert(element('regional-entries').innerHTML.includes('data-history="nok"'));assert(element('regional-entries').innerHTML.includes('data-history="aksum"'));assert(element('regional-entries').innerHTML.includes('data-history="zimbabwe"'));
 element('regional-search').value='no-such-history-zzzz';api.renderRegional();assert(element('regional-entries').innerHTML.includes('No matching histories'));element('regional-search').value='';
 element('regional-type').value='continuing';api.renderRegional();assert(element('regional-entries').innerHTML.includes('Continuing'));element('regional-type').value='all';api.renderRegional();
 api.openHistory('nok');assert.equal(element('locate-history').textContent,'Locate in Regions');api.showSelectedOnChart();while(frames.length)frames.shift()();assert.equal(document.activeElement.id,'regional-entry-nok');
 api.showRegionalKey();assert(element('connection-content').innerHTML.includes('4500 BCE–2026 CE'));assert(element('connection-content').innerHTML.includes('one linear time scale'));assert(element('connection-content').innerHTML.includes('not that a region had no history'));element('connection-detail').close();
 api.openRegion('');while(frames.length)frames.shift()();assert(!element('regional-directory').hidden);assert.equal((element('regional-directory').innerHTML.match(/class="regional-collection-card"/g)||[]).length,REGIONAL_COLLECTIONS.length);
 api.setEra('all');assert(element('chart-regions').hidden&&!element('zoom-tools').hidden);
 assert.equal((html.match(/class="region-link"/g)||[]).length,28,'Every heading in all four overview variants must be clickable');
 for(const file of ['chart.svg','modern-chart.svg','equal-chart.svg','modern-equal-chart.svg']){const svg=read('dist/'+file);assert.match(svg,/class="region-label"/);assert((svg.match(/class="axis"/g)||[]).length>8,'Missing year labels '+file);assert.match(svg,/Blank space reflects selection/);}
 // Invalid live metadata must leave the validated saved article in place.
 api.openHistory('afsu-southsudan');const malformed=pending.at(-1),fallback=element('wiki-text').innerHTML;
 malformed.resolve({ok:true,json:async()=>({query:{pages:[{pageid:WIKI_LINKS['afsu-southsudan'],fullurl:WIKI_PAGES[WIKI_LINKS['afsu-southsudan']].url,extract:'Malformed response without a title.'}]}})});
 await settle();assert.equal(element('wiki-text').innerHTML,fallback);assert(!vm.runInContext("liveCache.has(WIKI_LINKS['afsu-southsudan'])",app));element('detail').close();
 console.log(JSON.stringify({histories:HISTORIES.length,modernView:modernLayout.length,connectionMaps:CONNECTION_MAPS.length,relationships:edgeIds.size,mapOnlyNodes:CONNECTION_EXTRAS.length,detailedTopics:ATLAS_TOPICS.length,posterReferences:POSTER_ITEMS.length,posterMilestones:30,posterLandmarks:52,countries:POSTER_COUNTRIES.length,articles:Object.keys(WIKI_PAGES).length,geometry:'valid in four timelines and maps',reader:'passed',relationshipNavigation:'passed',relatedArticleRaces:'passed',locateAndFocus:'passed',reducedMotion:'passed',directArticleNavigation:'passed',eraSwitch:'passed',offlineFallback:'passed',cacheExpiry:'passed',visibleFocus:'passed',dialogScrollReset:'passed',completePosterIndex:'passed',periodNavigation:'passed',prominenceWeights:HISTORIES.length+' reviewed',sizingModes:'passed',riseAndDecline:'passed',hoverLabels:'passed',timelineConnectionCoverage:CONNECTION_COVERAGE.totals,mapCatalogue:'passed',allEntriesLocatable:'passed',phoneMapOpening:'passed',regionalCollections:REGIONAL_COLLECTIONS.length,regionalAdditions:REGIONAL_ENTRIES.length,regionalExplorer:'passed',abortedCacheWrites:'blocked',browser:'not tested'}));
})().catch(error=>{console.error(error);process.exitCode=1;});

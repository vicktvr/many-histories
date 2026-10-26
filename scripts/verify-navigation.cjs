// App state tests, including queued native dialog close events. No browser layout.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const data=vm.createContext({});
vm.runInContext(['data','additions','modern','connections-data','poster-data','connection-coverage','regional-data','wiki-data','prominence-data'].map(f=>read('dist/'+f+'.js')).join('\n')+';this.d={REGIONS,HISTORIES,MILESTONES,SOURCES,CONNECTION_MAPS,CONNECTION_EXTRAS,CONNECTION_TYPES,CONNECTION_UNCERTAINTIES,CONNECTION_COVERAGE,ATLAS_TOPICS,POSTER_ITEMS,POSTER_COUNTRIES,WIKI_PAGES,WIKI_LINKS,RELATED_READINGS,PROMINENCE_RATINGS,PROMINENCE_PHASES,PROMINENCE_TIERS,REGIONAL_ENTRIES,REGIONAL_COLLECTIONS,REGIONAL_MEMBERSHIP};',data);
function harness(query=''){
 const elements=new Map(),tasks=[],frames=[],requests=[],listeners={},timers=new Map();let serial=0,document;
 class Element{
  constructor(id,tag='BUTTON'){this.id=id;this.tagName=tag;this.open=false;this.hidden=false;this.style={};this.dataset={};this.listeners={};this.clientWidth=1200;this.clientHeight=800;this.scrollTop=0;this.scrollLeft=0;this.value='';this.classes=new Set();this.classList={add:c=>this.classes.add(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
  set innerHTML(html){this.html=html;for(const m of html.matchAll(/<([a-z][\w-]*)\b[^>]*\bid="([^"]+)"/gi))if(!elements.has(m[2]))elements.set(m[2],new Element(m[2],m[1].toUpperCase()));}
  get innerHTML(){return this.html||'';}
  setAttribute(k,v){this[k]=v;}removeAttribute(k){delete this[k];}
  addEventListener(t,f){(this.listeners[t]??=[]).push(f);}
  focus(){document.activeElement=this;}
  getBoundingClientRect(){return {width:1200,left:0,top:0,right:1200,bottom:800};}
  querySelector(s){if(['.block-label','.map-label'].includes(s))return this.label??=new Element(this.id+'-label','text');return null;}
  closest(s){const key={'[data-history]':'history','[data-connection]':'connection','[data-map-target]':'mapTarget','[data-region-explore]':'regionExplore'}[s];return key&&this.dataset[key]?this:null;}
  scrollIntoView(o){this.scrolled=o;}
  showModal(){this.prior=document.activeElement;this.open=true;this.focus();}
  close(){if(!this.open)return;this.open=false;this.prior?.focus();tasks.push(()=>{for(const f of this.listeners.close||[])f({target:this});});}
 }
 const element=id=>{const e=elements.get(id);assert(e,'Unknown DOM id '+id);return e;};
 for(const m of read('dist/index.html').matchAll(/<([a-z][\w-]*)\b[^>]*\bid="([^"]+)"/gi))elements.set(m[2],new Element(m[2],m[1].toUpperCase()));
 const blocks=[],edges=[];
 for(const suffix of ['all','modern','all-equal','modern-equal'])for(const region of data.d.REGIONS)element('region-'+suffix+'-'+region.id).dataset.regionExplore=region.id;
 for(const [file,era] of [['layout.json','all'],['modern-layout.json','modern'],['equal-layout.json','all-equal'],['modern-equal-layout.json','modern-equal']])for(const h of JSON.parse(read('dist/'+file))){const b=element('block-'+era+'-'+h.id);b.dataset.history=h.id;blocks.push(b);}
 for(const map of data.d.CONNECTION_MAPS){for(const node of map.nodes){const b=element('map-node-'+map.id+'-'+node.id);b.dataset={history:node.id,map:map.id};blocks.push(b);}for(const edge of map.connections){const b=element('map-edge-'+map.id+'-'+edge.id);b.dataset={connection:edge.id,map:map.id};edges.push(b);}}
 document={activeElement:element('sources'),getElementById:element,querySelector:s=>s==='dialog[open]'?[...elements.values()].find(e=>e.open):s==='.download'?elements.get('download')||elements.get('download-anchor'):element(s.slice(1)),querySelectorAll:s=>s==='.history,.map-node'?blocks:s==='.map-edge'?edges:[],addEventListener:(t,f)=>(listeners[t]??=[]).push(f)};
 // The download link is class-addressed in the production template.
 elements.set('download-anchor',new Element('download-anchor','A'));
 const location={href:'https://example.test/'+query,search:query},history={replaceState(_a,_b,url){location.href=String(url);location.search=new URL(url).search;}};
 const ctx=vm.createContext({...data.d,document,window:{innerWidth:1200,innerHeight:900,addEventListener:()=>{},matchMedia:()=>({matches:true})},location,history,URL,URLSearchParams,AbortController,Map,Date,requestAnimationFrame:f=>frames.push(f),setTimeout:(f,ms)=>{const id=++serial;timers.set(id,{f,ms});return id;},clearTimeout:id=>timers.delete(id),fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject}))});
 vm.runInContext(read('dist/app.js')+';this.api={openHistory,showArticle,showIndex,openConnection,jumpToMap,showSelectedOnChart,setEra,setSizing,selectConnectionMap,showMapIndex,chooseConnectionMap,search,openRegion,selectRegionalCollection,renderRegional,locateRegional};',ctx);
 const flush=()=>{while(tasks.length)tasks.shift()();while(frames.length)frames.shift()();};
 const key=(el,key)=>{let prevented=false;for(const f of listeners.keydown||[])f({target:el,key,preventDefault(){prevented=true;}});return prevented;};
 const click=(el,options={})=>{let prevented=false;for(const f of listeners.click||[])f({target:el,...options,preventDefault(){prevented=true;}});return prevented;};
 const params=()=>new URL(location.href).searchParams;
 return {ctx,api:ctx.api,e:element,document,requests,flush,key,click,params,location,tasks};
}
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
(async()=>{
 // Shared links must restore the exact view, map, sizing and selected article.
 let h=harness('?era=connections&map=iran-modern&history=iran-pahlavi&size=equal');
 assert.equal(h.e('era-connections')['aria-pressed'],'true');assert.equal(h.e('connection-network').value,'iran-modern');assert(h.e('detail').open);assert.equal(h.params().get('history'),'iran-pahlavi');
 h.e('detail').close();h.flush();assert(!h.params().has('history'));assert.equal(h.params().get('map'),'iran-modern');
 for(const map of data.d.CONNECTION_MAPS){
  const first=map.nodes[0].id;h=harness('?era=connections&map='+map.id+'&history='+first);
  assert.equal(h.e('connection-network').value,map.id);assert(!h.e('connection-map-'+map.id).hidden);assert(h.e('detail').open);assert.equal(h.params().get('history'),first);
  h.e('detail').close();h.flush();assert.equal(h.params().get('map'),map.id);assert(!h.params().has('history'));
 }
 h=harness('?era=modern&size=equal&history=mughal&article=reading-tajmahal');assert(h.e('detail').open);assert.equal(h.e('wiki-full').href,data.d.WIKI_PAGES[data.d.WIKI_LINKS['reading-tajmahal']].url);assert.equal(h.params().get('article'),'reading-tajmahal');
 for(const [owner,articles] of Object.entries(data.d.RELATED_READINGS))for(const article of articles){
  const link='?era=all&history='+encodeURIComponent(owner)+'&article='+encodeURIComponent(article.id);h=harness(link);
  assert(h.e('detail').open);assert.equal(h.e('wiki-full').href,data.d.WIKI_PAGES[article.pageid].url,'Broken article deep link '+article.id);
  assert.equal(h.params().get('history'),owner);assert.equal(h.params().get('article'),article.id);
 }
 h=harness('?index=landmark');assert(h.e('index-dialog').open);assert.equal(h.e('index-kind').value,'landmark');h.api.openHistory('poster-stonehenge');h.flush();assert(h.e('detail').open);assert.equal(h.params().get('history'),'poster-stonehenge');assert(!h.params().has('index'));h.e('detail').close();h.flush();assert.equal(h.document.activeElement.id,'atlas-index');
 // Regional entry points work as links, keyboard controls and shareable views.
 h=harness();assert(!h.click(h.e('region-all-africa'),{ctrlKey:true}));assert.notEqual(h.params().get('era'),'regions','Modified links must keep native browser behavior');
 assert(h.key(h.e('region-all-africa'),'Enter'));h.flush();assert.equal(h.params().get('era'),'regions');assert.equal(h.params().get('region'),'africa');assert(!h.e('chart-regions').hidden);
 h.api.openHistory('nok');h.api.showSelectedOnChart();h.flush();assert.equal(h.document.activeElement.id,'regional-entry-nok');
 for(const collection of data.d.REGIONAL_COLLECTIONS){
  h=harness('?era=regions&region='+collection.id);assert.equal(h.e('regional-collection').value,collection.id);assert.equal(h.e('regional-title').textContent,collection.title);assert(!h.e('chart-regions').hidden);
 }
 for(const entry of data.d.REGIONAL_ENTRIES){h=harness('?history='+entry.id);assert(h.e('detail').open,entry.id);assert.equal(h.e('locate-history').textContent,'Locate in Regions');assert(data.d.WIKI_PAGES[data.d.WIKI_LINKS[entry.id]],entry.id+' article');h.api.showSelectedOnChart();h.flush();assert.equal(h.document.activeElement.id,'regional-entry-'+entry.id);assert.equal(h.params().get('era'),'regions');}
 // Queued close handlers must not cancel or erase a newly opened reader.
 h=harness();h.api.openHistory('qin');h.e('detail').close();h.api.openHistory('han');const latest=h.requests.at(-1);h.flush();assert(h.e('detail').open);assert.equal(h.params().get('history'),'han','An earlier close event erased a newer reader URL');assert(!latest.options.signal.aborted,'An earlier close event aborted a newer reader request');
 // A newer reader cancels an older queued relationship or map jump.
 for(const transition of ['relationship','map']){
  h=harness();h.api.openHistory('qin');
  if(transition==='relationship')h.api.openConnection('union1707');else h.api.jumpToMap('iran-modern','iran-pahlavi');
  h.api.openHistory('han');h.flush();assert(h.e('detail').open);assert.equal(h.params().get('history'),'han');
  h.e('detail').close();h.flush();assert(!h.e('connection-detail').open,'Obsolete relationship opened after a newer reader closed');assert(!h.params().has('era'),'Obsolete map jump replaced the newer selection');
 }
 // A response arriving between close() and its close event is already obsolete.
 h=harness();h.api.openHistory('qin');const old=h.requests.at(-1),page=data.d.WIKI_PAGES[data.d.WIKI_LINKS.qin];h.e('detail').close();old.resolve({ok:true,json:async()=>({query:{pages:[{pageid:page.pageid,title:page.title,fullurl:page.url,extract:'Obsolete response arriving after close.'}]}})});await settle();assert(!vm.runInContext('liveCache.has(WIKI_LINKS.qin)',h.ctx),'A closed reader accepted a response before its queued close event');h.flush();
 // Reopening the index before an earlier close event keeps its new state.
 h=harness();h.api.showIndex('poster');h.e('index-dialog').close();h.api.showIndex('landmark');h.flush();assert(h.e('index-dialog').open);assert.equal(h.params().get('index'),'landmark');
 // Keyboard activation of SVG blocks and arrows follows the same reader path.
 h=harness();assert(h.key(h.e('block-all-rome'),'Enter'));assert(h.e('detail').open);h.e('detail').close();h.flush();h.api.setEra('connections');assert(h.key(h.e('map-edge-britain-atlantic-union1707'),' '));assert(h.e('connection-detail').open);h.api.openHistory('scotland');h.flush();assert(h.e('detail').open&&!h.e('connection-detail').open);h.api.showSelectedOnChart();h.flush();assert.equal(h.document.activeElement.id,'map-node-britain-atlantic-scotland');
 // A mapped subperiod returns to its timeline parent when the view changes.
 h=harness('?era=connections&map=iran-modern&history=iran-pahlavi');h.e('detail').close();h.flush();h.api.setEra('modern');assert(h.e('block-modern-iranmodern').classes.has('selected'),'Changing view dropped the selected subperiod’s timeline parent');
 console.log(JSON.stringify({sharedLinks:'passed',sharedMapLinks:data.d.CONNECTION_MAPS.length,relatedArticleLinks:Object.values(data.d.RELATED_READINGS).flat().length,queuedDialogTransitions:'passed',keyboardActivation:'passed',closeResponseRace:'passed',crossViewSelection:'passed',regionalNavigation:'passed',browser:'not tested'}));
})().catch(e=>{console.error(e);process.exitCode=1;});

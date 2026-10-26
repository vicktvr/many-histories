'use strict';
const $=selector=>document.querySelector(selector);
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ʻʼ‘’']/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const blocks=[...document.querySelectorAll('.history,.map-node')],mapEdges=[...document.querySelectorAll('.map-edge')],entries=[...HISTORIES,...MILESTONES,...CONNECTION_EXTRAS,...ATLAS_TOPICS,...REGIONAL_ENTRIES],liveCache=new Map();
const relationships=CONNECTION_MAPS.flatMap(map=>map.connections.map(edge=>({...edge,map:map.id}))),mappedIds=new Set(CONNECTION_MAPS.flatMap(map=>map.nodes.map(n=>n.id)));
const posterAliases=new Map(),entryById=new Map(entries.map(h=>[h.id,h]));
for(const item of POSTER_ITEMS){if(!posterAliases.has(item.entryId))posterAliases.set(item.entryId,[]);posterAliases.get(item.entryId).push(item.label);}
// A readable hover label independent of the browser's delayed SVG title UI.
const hoverTooltip=$('#history-tooltip');let tooltipOwner=null,tooltipHideTimer=null;
function hideHistoryTooltip(){
 clearTimeout(tooltipHideTimer);tooltipHideTimer=null;hoverTooltip.hidden=true;
 tooltipOwner?.removeAttribute('aria-describedby');tooltipOwner=null;
}
function placeHistoryTooltip(x,y){
 const box=hoverTooltip.getBoundingClientRect(),gap=12;
 const width=window.innerWidth,height=window.innerHeight;
 const left=Math.max(gap,Math.min(x+16,width-box.width-gap));
 let top=y+18;if(top+box.height>height-gap)top=y-box.height-14;
 hoverTooltip.style.left=left+'px';hoverTooltip.style.top=Math.max(gap,Math.min(top,height-box.height-gap))+'px';
}
function showHistoryTooltip(block,event){
 if(event?.pointerType==='touch'||document.querySelector('dialog[open]'))return;
 const entry=entryById.get(block.dataset.history);if(!entry)return;
 hideHistoryTooltip();tooltipOwner=block;
 $('#history-tooltip-name').textContent=entry.title;$('#history-tooltip-dates').textContent=entry.dates;
 hoverTooltip.hidden=false;block.setAttribute('aria-describedby','history-tooltip');
 const rect=(block.querySelector('.block-label')||block.querySelector('.map-label')||block).getBoundingClientRect();
 const x=Number.isFinite(event?.clientX)?event.clientX:Math.max(12,Math.min(rect.left+rect.width/2,window.innerWidth-12));
 const y=Number.isFinite(event?.clientY)?event.clientY:Math.max(12,Math.min(rect.bottom,window.innerHeight-12));
 placeHistoryTooltip(x,y);
}
for(const block of blocks){
 // Downloaded SVGs retain their titles as a fallback. The inline chart uses this popup.
 block.querySelector('title')?.remove();
 block.addEventListener('pointerenter',event=>showHistoryTooltip(block,event));
 block.addEventListener('pointerleave',()=>{if(tooltipOwner===block)tooltipHideTimer=setTimeout(hideHistoryTooltip,160);});
 block.addEventListener('focus',()=>showHistoryTooltip(block));
 block.addEventListener('blur',()=>{if(tooltipOwner===block)hideHistoryTooltip();});
}
hoverTooltip.addEventListener('pointerenter',()=>{clearTimeout(tooltipHideTimer);tooltipHideTimer=null;});
hoverTooltip.addEventListener('pointerleave',hideHistoryTooltip);
const kindName={history:'History',period:'Period',culture:'Peoples & cultures',milestone:'Milestone',landmark:'Landmark',guide:'Reading the chart'};
const kindOf=h=>h.category||(HISTORIES.includes(h)||CONNECTION_EXTRAS.includes(h)?'history':'milestone');
const entryText=h=>normalize([h.title,h.dates,h.location,h.summary,h.note,h.id,...(h.searchAliases||[]),...(h.posterLabels||[]),...(posterAliases.get(h.id)||[]),REGIONS.find(r=>r.id===h.region)?.name||''].join(' '));
function locationTarget(id){const seen=new Set();while(id&&!seen.has(id)){seen.add(id);if((currentEra==='regions'||entryById.get(id)?.regionalOnly)&&REGIONAL_MEMBERSHIP[id])return id;if(HISTORIES.some(h=>h.id===id))return id;const entry=entryById.get(id);if(mappedIds.has(id)&&(currentEra==='connections'||entry?.graphOnly||!entry?.parent))return id;id=entry?.parent;}return null;}
function relatedTopics(id){
 const links=entryById.get(id)?.seeAlso||[];
 const children=entries.filter(h=>(h.parent===id||links.includes(h.id))&&h.id!==id).sort((a,b)=>(a.start??a.year??Infinity)-(b.start??b.year??Infinity)||a.title.localeCompare(b.title));if(!children.length)return '';
 return `<details class="related-topics"><summary>Periods &amp; related topics · ${children.length}</summary><div class="related-topics-list">${children.map(h=>`<button data-history="${esc(h.id)}">${esc(h.title)}<span>${esc(h.dates)} · ${esc(kindName[kindOf(h)])}</span></button>`).join('')}</div></details>`;
}
function sizingNote(id){
 const rating=PROMINENCE_RATINGS[id];if(!rating)return '';
 const phases=PROMINENCE_PHASES[id]||[],date=y=>Math.abs(y)+' '+(y<0?'BCE':'CE');
 return `<details class="entry-sizing"><summary>${currentEra==='connections'?'Timeline prominence':currentSizing==='equal'?'Prominence rating':'Why this block is this size'}</summary><p class="sizing-tier">${esc(PROMINENCE_TIERS[rating.tier].label)}</p><p>${esc(rating.reason)}</p><p>${currentEra==='connections'?'Connection-map nodes use equal sizes. In the timelines, height follows duration and width is an approximate editorial weighting shared with contemporary histories.':currentSizing==='equal'?'Equal widths are currently selected. Height follows duration; the rating above is used only in Prominence view.':'Height follows duration. Width is an approximate editorial weighting, shared with contemporary histories.'} It is not a direct measure of territory or population.</p>${phases.length?'<ul>'+phases.map(p=>'<li>'+esc(date(p.start)+'–'+date(p.end)+' · '+p.label)+'</li>').join('')+'</ul>':''}<button class="reader-parent" data-sizing-help>Read the sizing method ↗</button></details>`;
}
function renderIndex(){
 const kind=$('#index-kind').value||'poster',query=normalize($('#index-search').value.trim());
 let rows=kind==='poster'?POSTER_ITEMS.map(item=>({entry:entryById.get(item.entryId),label:item.label})):entries.filter(h=>kind==='all'||kindOf(h)===kind).map(entry=>({entry,label:entry.title}));
 rows=rows.filter(row=>!query||entryText(row.entry).includes(query)||normalize(row.label).includes(query));
 $('#index-count').textContent=rows.length+(kind==='poster'?' poster references':' topics');
 const groups=[...REGIONS.map(r=>({id:r.id,title:r.name,color:r.color})),...REGIONAL_COLLECTIONS.filter(r=>!REGIONS.some(g=>g.id===r.id)&&entries.some(e=>e.region===r.id)).map(r=>({id:r.id,title:r.title,color:r.color})),{id:null,title:'Across regions & reading the chart',color:'#8a9979'}];
 $('#index-list').innerHTML=rows.length?groups.map(region=>{const list=rows.filter(row=>(row.entry.region||null)===region.id);return list.length?`<h3 class="index-region">${esc(region.title)}</h3>${list.map(({entry:h,label})=>`<button class="index-entry" style="--entry-color:${region.color}" data-history="${esc(h.id)}"><b>${esc(label)}</b><span>${esc(h.dates)}</span><small>${esc(label!==h.title?h.title+' · ':'')}${esc(kindName[kindOf(h)])}</small></button>`).join('')}`:'';}).join(''):'<p class="index-empty">No matching topics.</p>';
 if($('#index-dialog').open){const url=new URL(location.href);url.searchParams.set('index',kind);history.replaceState(null,'',url);}
}
function showIndex(kind){
 if(kind&&['poster','all',...Object.keys(kindName)].includes(kind))$('#index-kind').value=kind;
 if(!$('#index-kind').value)$('#index-kind').value='poster';
 $('#index-countries').innerHTML=POSTER_COUNTRIES.map(c=>`<button data-history="${esc(c.id)}"><span aria-hidden="true">${esc(c.flag)}</span>${esc(c.title)}</button>`).join('');
 hideHistoryTooltip();if(!$('#index-dialog').open)$('#index-dialog').showModal();renderIndex();$('#index-panel').scrollTop=0;
}
let zoom=1,previousFocus=null,detailRequest=0,activeController=null,currentEra='all',currentSizing='prominence',selectedHistory=null,pendingLocate=null,articleOptions=[],currentMap=CONNECTION_MAPS[0].id,currentRegional='',pendingConnection=null,relationshipFocus=null,pendingMapJump=null;
const canvas=$('#canvas'),paper=$('#paper');
function markHistory(id){
 selectedHistory=id;
 const target=locationTarget(id);
 blocks.forEach(block=>block.classList.toggle('selected',block.dataset.history===target));
 document.querySelectorAll('.regional-entry').forEach(card=>card.classList.toggle('is-selected',card.dataset.history===id));
 mapEdges.forEach(edge=>{const data=relationships.find(r=>r.id===edge.dataset.connection);edge.classList.toggle('related',!!data&&(data.from.includes(target)||data.to.includes(target)));});
}
function updateDownload(){const download=$('.download'),file=currentEra==='regions'?'regional-catalogue.json':currentEra==='connections'?'maps/'+currentMap+'.svg':currentEra==='modern'?(currentSizing==='equal'?'modern-equal-chart.svg':'modern-chart.svg'):(currentSizing==='equal'?'equal-chart.svg':'chart.svg');download.href=file;download.setAttribute('aria-label',currentEra==='regions'?'Download regional catalogue':'Download chart');download.setAttribute('download',currentEra==='regions'?'many-histories-regional-catalogue.json':currentEra==='connections'?'connections-'+currentMap+'.svg':(currentEra==='modern'?'modern-world-history':'timeline-of-world-history')+'-'+currentSizing+'.svg');}
function setSizing(mode,updateUrl=true){
 hideHistoryTooltip();
 currentSizing=mode==='equal'?'equal':'prominence';
 for(const era of ['all','modern'])for(const size of ['prominence','equal'])$('#chart-'+era+'-'+size).hidden=size!==currentSizing;
 $('#size-prominence').setAttribute('aria-pressed',String(currentSizing==='prominence'));$('#size-equal').setAttribute('aria-pressed',String(currentSizing==='equal'));
 $('#sizing-caption').textContent=currentSizing==='prominence'?'Height = years · Width = prominence':'Height = years · Equal widths within regions';
 updateDownload();
 if(updateUrl){const url=new URL(location.href);if(currentSizing==='equal')url.searchParams.set('size','equal');else url.searchParams.delete('size');history.replaceState(null,'',url);}
}
function showSizingGuide(){if(!$('#sizing-dialog').open)$('#sizing-dialog').showModal();}
function selectConnectionMap(id,updateUrl=true){
 hideHistoryTooltip();
 if(!CONNECTION_MAPS.some(map=>map.id===id))return;
 currentMap=id;for(const map of CONNECTION_MAPS)$('#connection-map-'+map.id).hidden=map.id!==id;
 $('#connection-network').value=id;updateDownload();
 const continuations=CONNECTION_MAPS.find(map=>map.id===id).continuations||[];$('#connection-continuations').hidden=!continuations.length;$('#connection-continuations').innerHTML=continuations.map(link=>`<button data-map-target="${esc(link.map)}" data-map-history="${esc(link.history)}">${esc(link.label)} <span aria-hidden="true">→</span></button>`).join('');
 if(currentEra==='connections'){
  const map=CONNECTION_MAPS.find(m=>m.id===id);setZoom(connectionMapZoom(map));canvas.scrollTop=0;
  // All map cards are 228px wide. Show the first row at enlarged phone scales.
  const first=map.nodes.reduce((a,b)=>b.y<a.y?b:a),width=fitWidth()*zoom;
  canvas.scrollLeft=Math.max(0,Math.min(width-canvas.clientWidth,(first.x+114)*width/map.width-canvas.clientWidth/2));
 }
 search();if(updateUrl){const url=new URL(location.href);url.searchParams.set('map',id);history.replaceState(null,'',url);}
}
function jumpToMap(map,id){
 if(!CONNECTION_MAPS.some(m=>m.id===map&&m.nodes.some(n=>n.id===id)))return;
 if($('#detail').open){pendingMapJump={map,id};$('#detail').close();return;}
 if($('#connection-detail').open)$('#connection-detail').close();
 setEra('connections');selectConnectionMap(map);locateHistory(id);
}
function otherMaps(id){
 const maps=CONNECTION_MAPS.filter(map=>map.nodes.some(node=>node.id===id)&&(currentEra!=='connections'||map.id!==currentMap));
 if(!maps.length)return '';
 return `<details class="other-maps"><summary>Maps featuring this history · ${maps.length}</summary><nav aria-label="Follow this history on another map">${maps.map(map=>`<button data-map-target="${esc(map.id)}" data-map-history="${esc(id)}">${esc(map.title)} <span aria-hidden="true">→</span></button>`).join('')}</nav></details>`;
}
function isContinuing(entry){return !!entry.ongoing||/present|continuing|living/i.test(entry.dates);}
function renderRegional(){
 const collection=REGIONAL_COLLECTIONS.find(r=>r.id===currentRegional),query=normalize($('#regional-search').value.trim()),type=$('#regional-type').value||'all';
 const directory=!collection&&!query&&type==='all';
 $('#regional-directory').hidden=!directory;$('#regional-entries').hidden=directory;$('#regional-count').hidden=directory;$('#regional-scale-note').hidden=directory;
 $('#regional-title').textContent=collection?.title||(directory?'A wider history':'Across all regions');
 $('#regional-subtitle').textContent=collection?.note||(directory?'Choose a region to explore beyond the overview.':'Selected societies, peoples, places and developments.');
 $('#regional-directory').innerHTML=REGIONAL_COLLECTIONS.map(r=>`<button class="regional-collection-card" data-region-explore="${esc(r.id)}" style="--collection-color:${r.color}"><b>${esc(r.title)}</b><span>${r.entries.length} entries</span></button>`).join('');
 if(directory){$('#regional-entries').innerHTML='';return;}
 const memberIds=collection?new Set(collection.entries):null;
 const rows=entries.filter(e=>(!memberIds||memberIds.has(e.id))&&(!query||entryText(e).includes(query))&&(type==='all'||type==='continuing'?type!=='continuing'||isContinuing(e):kindOf(e)===type)).sort((a,b)=>a.title.localeCompare(b.title));
 $('#regional-count').textContent=rows.length+' entries'+(collection?' in this collection':' across regions');
 $('#regional-entries').innerHTML=rows.length?rows.map(e=>`<button id="regional-entry-${esc(e.id)}" class="regional-entry${selectedHistory===e.id?' is-selected':''}" data-history="${esc(e.id)}" style="--collection-color:${collection?.color||REGIONAL_COLLECTIONS.find(r=>r.entries.includes(e.id))?.color||'#9eaa91'}"><b>${esc(e.title)}</b><span class="regional-date">${esc(e.dates)}</span><small>${esc(kindName[kindOf(e)])}${isContinuing(e)?' · Continuing':''}</small></button>`).join(''):'<p class="regional-empty">No matching histories. Try another name or choose All topics.</p>';
}
function selectRegionalCollection(id,updateUrl=true){
 if(id&&!REGIONAL_COLLECTIONS.some(r=>r.id===id))return;
 currentRegional=id||'';$('#regional-collection').value=currentRegional;renderRegional();
 if(updateUrl&&currentEra==='regions'){const url=new URL(location.href);if(currentRegional)url.searchParams.set('region',currentRegional);else url.searchParams.delete('region');history.replaceState(null,'',url);}
}
function openRegion(id){
 if(id&&!REGIONAL_COLLECTIONS.some(r=>r.id===id))return;
 currentRegional=id||'';$('#regional-search').value='';$('#regional-type').value='all';toggleSearch(false);setEra('regions');selectRegionalCollection(currentRegional);canvas.scrollTop=0;canvas.scrollLeft=0;
 requestAnimationFrame(()=>$('#regional-collection').focus({preventScroll:true}));
}
function locateRegional(id){
 const options=REGIONAL_MEMBERSHIP[id];if(!options?.length)return;
 const collection=options.includes(currentRegional)?currentRegional:entryById.get(id)?.collections?.find(c=>options.includes(c))||options.find(c=>c===entryById.get(id)?.region)||options[0];
 currentRegional=collection;$('#regional-search').value='';$('#regional-type').value='all';if(currentEra!=='regions')setEra('regions');selectRegionalCollection(collection);toggleSearch(false);markHistory(id);
 requestAnimationFrame(()=>{const card=document.getElementById('regional-entry-'+id);card?.scrollIntoView({block:'center',inline:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});card?.focus({preventScroll:true});});
}
function showRegionalKey(){
 hideHistoryTooltip();relationshipFocus=$('#regional-key');
 $('#connection-content').innerHTML='<div class="regional-guide"><p class="detail-region">Reading the regional atlas</p><h2 id="connection-title">More room for different histories</h2><p>This is a selected, expandable catalogue. Every card shows its name and dates; card sizes do not measure duration, territory, power or human worth. Collections overlap and are navigation aids, not historical borders.</p><h3>Before states, alongside states</h3><p>Foraging, farming, mobile pastoral societies, city-states and Indigenous nations are histories in their own right. A community’s history does not end at colonial conquest or begin at a modern state’s founding. Uncertain beginnings stay uncertain.</p><h3>Reading the overview</h3><p>The overview covers 4500 BCE–2026 CE on one linear time scale; the Modern era view uses a separate, clearly labelled linear window. Width in Prominence view is an editorial display weighting, not measured territory or power. Blank space means the overview has no selected block there, not that a region had no history. The regional catalogue reaches earlier where evidence supports it.</p><p>Dates are approximate where marked. Farming and domestication developed gradually in different regions; there is no single global Neolithic start date. Select an entry for its scope, sources and Wikipedia article.</p><a class="source-link" href="regional-catalogue.json" download="many-histories-regional-catalogue.json">Download the regional catalogue ↗</a></div>';
 if(!$('#connection-detail').open)$('#connection-detail').showModal();$('#connection-content').scrollTop=0;
}
function connectionMapZoom(map,locate=false){return Math.min(12,Math.max(1,(window.innerWidth<=600?3.5:(locate?1.5:1))*Math.max(1,map.width/(window.innerWidth<=600?1600:2200))));}
function renderMapIndex(){
 const query=normalize($('#map-index-search').value.trim()),region=$('#map-index-region').value||'all';
 const matches=CONNECTION_MAPS.filter(map=>(region==='all'||map.region===region)&&(!query||normalize(map.title+' '+map.nodes.map(n=>entryText(entryById.get(n.id))).join(' ')).includes(query)));
 const groups=[...REGIONS,{id:'world',name:'Across regions'}];
 $('#map-index-list').innerHTML=matches.length?groups.map(group=>{const maps=matches.filter(m=>m.region===group.id);return maps.length?`<h3 class="map-index-region">${esc(group.name)}</h3><div class="map-index-grid">${maps.map(map=>`<button data-select-map="${esc(map.id)}"><b>${esc(map.title)}</b><span>${map.nodes.length} entries · ${map.connections.length} relationships</span></button>`).join('')}</div>`:'';}).join(''):'<p class="index-empty">No matching maps.</p>';
 const t=CONNECTION_COVERAGE.totals;
 $('#connection-coverage-summary').textContent=`Timeline coverage · ${t.represented} of ${t.timelineHistories} entries represented`;
 $('#connection-coverage-note').textContent=`${t.linked} entries have selected historical relationships; ${t.contextOnly||0} have context or heritage links only; ${t.explained} have an explicit evidence limitation. This checks the atlas timeline, not every event in world history.`;
 const rows=CONNECTION_COVERAGE.entries.filter(row=>(region==='all'||row.region===region)&&(!query||entryText(entryById.get(row.id)).includes(query)));
 $('#connection-coverage-list').innerHTML=rows.map(row=>`<button data-history="${esc(row.id)}"><b>${esc(row.title)}</b><span>${row.status==='explained'?'Evidence limitation':row.status==='context'?'Context / heritage only':row.status==='unmapped'?'Coverage gap':row.relationships.length+' relationships'} · ${row.maps.length} maps</span></button>`).join('');
}
function showMapIndex(){hideHistoryTooltip();if(!$('#connection-index-dialog').open)$('#connection-index-dialog').showModal();renderMapIndex();$('#connection-index-panel').scrollTop=0;}
function chooseConnectionMap(id){
 if(!CONNECTION_MAPS.some(m=>m.id===id))return;
 if($('#connection-index-dialog').open)$('#connection-index-dialog').close();
 setEra('connections');selectConnectionMap(id);requestAnimationFrame(()=>$('#connection-network').focus({preventScroll:true}));
}
function connectionList(id){
 const linked=relationships.filter(r=>r.from.includes(id)||r.to.includes(id));if(!linked.length){const limit=CONNECTION_UNCERTAINTIES.find(note=>note.id===id);return limit?`<details class="entry-connections"><summary>Why no succession arrow?</summary><p class="relationship-limit">${esc(limit.reason)}</p>${limit.sources.map(key=>sourceLink('connection_'+key)).join('')}</details>`:'';}
 return `<details class="entry-connections"><summary>Connections · ${linked.length}</summary>${linked.map(r=>`<button data-connection="${esc(r.id)}">${esc(r.label)}<span>${esc(CONNECTION_TYPES[r.type].label)} · ${esc(CONNECTION_MAPS.find(m=>m.id===r.map).title)}</span></button>`).join('')}</details>`;
}
function openConnection(id){
 hideHistoryTooltip();
 const edge=relationships.find(r=>r.id===id);if(!edge)return;
 if($('#detail').open){pendingConnection=id;$('#detail').close();return;}
 const type=CONNECTION_TYPES[edge.type],name=id=>entries.find(h=>h.id===id).title;
 relationshipFocus=currentEra==='connections'&&edge.map===currentMap?document.getElementById('map-edge-'+edge.map+'-'+id):$('#era-connections');
 const parties=ids=>ids.map(id=>`<button data-history="${esc(id)}">${esc(name(id))}</button>`).join('');
 $('#connection-content').innerHTML=`<p class="detail-region" style="color:${type.color}">${esc(type.label)}${edge.selectedBranch?' · selected / grouped branch':''}${edge.certainty?' · '+esc(edge.certainty):''}</p><h2 id="connection-title">${esc(edge.label)}</h2><p class="relationship-dates">${esc(edge.dates)}</p><div class="relationship-parties"><div>${parties(edge.from)}</div><b aria-hidden="true">${edge.bidirectional?'↔':'→'}</b><div>${parties(edge.to)}</div></div><p class="relationship-summary">${esc(edge.summary)}</p><aside class="date-note"><h3>Historical context</h3><p>${esc(edge.note)}</p></aside><div class="relationship-sources"><h3>Sources</h3>${edge.sources.map(key=>sourceLink('connection_'+key)).join('')}</div>`;
 if(!$('#connection-detail').open)$('#connection-detail').showModal();$('#connection-content').scrollTop=0;
}
function showConnectionKey(){
 relationshipFocus=$('#connection-key');
 const map=CONNECTION_MAPS.find(m=>m.id===currentMap),mapNote=map.note||map.description||'';
 $('#connection-content').innerHTML=`<p class="detail-region">Reading the maps</p><h2 id="connection-title">Different arrows, different histories</h2><p class="relationship-summary">Tap a node for Wikipedia, or an arrow for the event and its sources. These are selected connections. Position and size do not measure time, territory or ancestry.</p>${mapNote?`<aside class="date-note"><h3>${esc(map.title)}</h3><p>${esc(mapNote)}</p></aside>`:''}<div class="connection-legend">${Object.values(CONNECTION_TYPES).map(type=>`<div><b style="--edge-color:${type.color}">${esc(type.label)}</b><p>${esc(type.description)}</p></div>`).join('')}</div>`;
 $('#connection-detail').showModal();$('#connection-content').scrollTop=0;
}
function locateHistory(id){
 id=locationTarget(id);if(!id)return;
 if(REGIONAL_MEMBERSHIP[id]&&(currentEra==='regions'||entryById.get(id)?.regionalOnly)){locateRegional(id);return;}
 if(mappedIds.has(id)&&(currentEra==='connections'||!HISTORIES.some(h=>h.id===id))){
  const map=CONNECTION_MAPS.find(m=>m.id===currentMap&&m.nodes.some(n=>n.id===id))||CONNECTION_MAPS.find(m=>m.nodes.some(n=>n.id===id));
  if(currentEra!=='connections')setEra('connections');selectConnectionMap(map.id);toggleSearch(false);markHistory(id);setZoom(connectionMapZoom(map,true));
  requestAnimationFrame(()=>{const node=document.getElementById('map-node-'+map.id+'-'+id);(node.querySelector('.map-label')||node).scrollIntoView({block:'center',inline:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});node.focus({preventScroll:true});});return;
 }
 const entry=HISTORIES.find(h=>h.id===id);if(!entry)return;
 if(currentEra==='connections')setEra(entry.start>=1450?'modern':'all');
 if(entry.start>=1450&&currentEra==='all')setEra('modern');
 else if(entry.end<=1450&&currentEra==='modern')setEra('all');
 toggleSearch(false);markHistory(id);setZoom(Math.max(zoom,window.innerWidth<=600?3.5:1.5));
 requestAnimationFrame(()=>{
  const block=document.getElementById(`block-${currentEra}${currentSizing==='equal'?'-equal':''}-${id}`);if(!block)return;
  const target=block.querySelector('.block-label')||block;
  target.scrollIntoView({block:'center',inline:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  block.focus({preventScroll:true});
 });
}
function showSelectedOnChart(){
 if(!locationTarget(selectedHistory))return;
 pendingLocate=selectedHistory;$('#detail').close();
}
function setEra(era,updateUrl=true){
 hideHistoryTooltip();
 currentEra=['modern','connections','regions'].includes(era)?era:'all';
 $('#chart-all').hidden=currentEra!=='all';$('#chart-modern').hidden=currentEra!=='modern';
 $('#chart-connections').hidden=currentEra!=='connections';$('#connection-controls').hidden=currentEra!=='connections';
 $('#sizing-controls').hidden=currentEra==='connections'||currentEra==='regions';$('#chart-regions').hidden=currentEra!=='regions';$('#regional-controls').hidden=currentEra!=='regions';$('#zoom-tools').hidden=currentEra==='regions';
 $('#era-all').setAttribute('aria-pressed',String(currentEra==='all'));$('#era-modern').setAttribute('aria-pressed',String(currentEra==='modern'));
 $('#era-connections').setAttribute('aria-pressed',String(currentEra==='connections'));$('#era-regions').setAttribute('aria-pressed',String(currentEra==='regions'));updateDownload();
 $('#zoom-hint').hidden=currentEra==='regions';$('#zoom-hint').textContent=currentEra==='connections'?'Scroll or zoom · Tap a node or arrow':'Zoom in to explore · Tap a block for Wikipedia';
 if(currentEra==='regions'){setZoom(1);selectRegionalCollection(currentRegional,false);canvas.scrollTop=0;canvas.scrollLeft=0;search();}else if(currentEra==='connections')selectConnectionMap(currentMap,false);else{setZoom(1);canvas.scrollTop=0;canvas.scrollLeft=0;search();}
 if(selectedHistory)markHistory(selectedHistory);
 if(updateUrl){const url=new URL(location.href);if(currentEra==='all')url.searchParams.delete('era');else url.searchParams.set('era',currentEra);if(currentEra==='connections')url.searchParams.set('map',currentMap);else url.searchParams.delete('map');if(currentEra==='regions'&&currentRegional)url.searchParams.set('region',currentRegional);else url.searchParams.delete('region');history.replaceState(null,'',url);}
}
function fitWidth(){return Math.min(1500,canvas.clientWidth-(window.innerWidth<=600?12:40));}
function setZoom(value){
 hideHistoryTooltip();
 const old=paper.getBoundingClientRect().width,center=(canvas.scrollLeft+canvas.clientWidth/2)/old,vertical=(canvas.scrollTop+canvas.clientHeight/2)/old;
 zoom=Math.max(1,Math.min(12,value));const width=fitWidth()*zoom;
 paper.style.width=width+'px';paper.style.marginLeft=width>canvas.clientWidth?'6px':'auto';paper.style.marginRight=width>canvas.clientWidth?'6px':'auto';
 canvas.scrollLeft=Math.max(0,center*width-canvas.clientWidth/2);canvas.scrollTop=Math.max(0,vertical*width-canvas.clientHeight/2);
 $('#zoom-out').disabled=zoom===1;$('#zoom-in').disabled=zoom===12;$('#fit').textContent=zoom===1?'Fit':Math.round(zoom*100)+'%';
}
function sourceLink(key){const s=SOURCES[key];return s?`<a class="source-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗<span>${esc(s.publisher)}</span></a>`:'';}
function excerpt(text,limit=180){
 const words=[...text.matchAll(/\S+/g)];if(words.length<=limit)return text.trim();
 const cut=text.slice(0,words[limit-1].index+words[limit-1][0].length),stop=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('.\n'));
 return stop>cut.length*.65?cut.slice(0,stop+1):cut+'…';
}
function renderWiki(page,live=false){
 const text=excerpt(page.extract||'');
 $('#wiki-text').innerHTML=text.split(/\n+/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('');
 const checked=new Date(page.checked);
 $('#wiki-credit').innerHTML=`Wikipedia contributors · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a> · ${live?'Checked '+checked.toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Saved '+checked.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
 $('#wiki-article-name').textContent=page.title;
 $('#wiki-full').href=page.url;
}
function showArticle(id,updateUrl=true){
 const option=articleOptions.find(a=>a.id===id);if(!option)return;
 activeController?.abort();const request=++detailRequest,page=WIKI_PAGES[option.pageid];
 $('#wiki-topics').innerHTML=articleOptions.map(a=>`<button id="topic-${esc(a.id)}" data-article="${esc(a.id)}" aria-pressed="${a.id===id}">${esc(a.label)}</button>`).join('');
 $('#wiki-topics').hidden=articleOptions.length<2;
 const reference=$('#wiki-topic-reference');reference.hidden=!option.reference;
 if(option.reference){reference.href=option.reference.url;reference.textContent=option.reference.publisher+' ↗';reference.title=option.reference.title;}
 renderWiki(page);$('#detail-content').scrollTop=0;
 if(updateUrl){
  const url=new URL(location.href);if(id==='overview')url.searchParams.delete('article');else url.searchParams.set('article',id);history.replaceState(null,'',url);
  $('#topic-'+id).focus({preventScroll:true});
 }
 void refreshWikipedia(page,request);
}
async function refreshWikipedia(page,request){
 const cached=liveCache.get(page.pageid),age=cached?Date.now()-Date.parse(cached.checked):Infinity;
 if(cached&&request===detailRequest)renderWiki(cached,true);
 if(age>=0&&age<5*60*1000)return;
 const controller=new AbortController();activeController=controller;
 const timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',prop:'extracts|info',inprop:'url',exintro:'1',explaintext:'1',exchars:'4000',pageids:String(page.pageid)});
  const response=await fetch('https://en.wikipedia.org/w/api.php?'+params,{signal:controller.signal,credentials:'omit',mode:'cors'});
  if(!response.ok)throw new Error('Wikipedia unavailable');
  const data=await response.json(),result=data.query?.pages?.[0];
  if(typeof result?.extract!=='string'||!result.extract.trim()||typeof result.title!=='string'||!result.title.trim()||result.missing||Number(result.pageid)!==Number(page.pageid))throw new Error('No matching article extract');
  const url=new URL(result.fullurl);if(url.protocol!=='https:'||url.hostname!=='en.wikipedia.org')throw new Error('Invalid article URL');
  if(controller.signal.aborted||request!==detailRequest||!$('#detail').open)return;
  const updated={title:result.title,pageid:result.pageid,url:url.href,extract:excerpt(result.extract),checked:new Date().toISOString()};
  liveCache.set(page.pageid,updated);
  if(request===detailRequest&&$('#detail').open)renderWiki(updated,true);
 }catch(error){
  // A validated, attributed saved excerpt is already visible. Never replace it
  // with an empty panel or mislabel it as a successful live response.
 }finally{clearTimeout(timeout);if(activeController===controller)activeController=null;}
}
function openHistory(id){
 hideHistoryTooltip();
 const h=entries.find(entry=>entry.id===id);if(!h)return;
 if(!$('#detail').open)previousFocus=$('#connection-index-dialog').open?$('#connection-index-toggle'):$('#index-dialog').open?$('#atlas-index'):$('#connection-detail').open?$('#era-connections'):$('#milestone-dialog').open?$('#milestones'):document.activeElement;
 if($('#connection-index-dialog').open)$('#connection-index-dialog').close();
 if($('#index-dialog').open)$('#index-dialog').close();
 if($('#connection-detail').open)$('#connection-detail').close();
 if($('#milestone-dialog').open)$('#milestone-dialog').close();
 markHistory(id);pendingLocate=null;pendingConnection=null;pendingMapJump=null;$('#locate-history').hidden=!locationTarget(id);$('#locate-history').textContent=(currentEra==='regions'||h.regionalOnly)&&REGIONAL_MEMBERSHIP[id]?'Locate in Regions':locationTarget(id)!==id?'Locate related history':mappedIds.has(locationTarget(id))&&(currentEra==='connections'||h.graphOnly)?'Locate on map':'Locate on chart';
 const region=REGIONS.find(r=>r.id===h.region)?.name||REGIONAL_COLLECTIONS.find(r=>r.id===h.region)?.title||kindName[kindOf(h)];
 articleOptions=[{id:'overview',label:'Overview',pageid:WIKI_LINKS[id]},...(RELATED_READINGS[id]||[])];
 const references=(h.sources||[]).filter(key=>!key.startsWith('wikipedia_'));
 const parent=entryById.get(h.parent),posterNotes=(h.posterNotes||[]).filter(note=>note!==h.note);
 $('#detail-content').innerHTML=`${parent?`<button class="reader-parent" data-history="${esc(parent.id)}">← ${esc(parent.title)}</button>`:''}<p class="detail-region">${esc(region)}</p><span class="entry-kind">${esc(kindName[kindOf(h)])}</span><h2 class="detail-title" id="detail-title">${esc(h.title)}</h2><p class="detail-dates">${esc(h.dates)}</p><p class="detail-location">${esc(h.location)}</p>${otherMaps(id)}${relatedTopics(id)}<nav id="wiki-topics" class="wiki-topics" aria-label="Wikipedia articles for this history" hidden></nav><div class="wiki-heading"><div><span class="wiki-label">FROM WIKIPEDIA</span><span id="wiki-article-name"></span></div><a id="wiki-topic-reference" class="wiki-topic-reference" target="_self" hidden></a></div><div id="wiki-text" class="wiki-text" aria-live="polite"></div><p id="wiki-credit" class="wiki-credit"></p>${connectionList(id)}<details class="atlas-context"><summary>Dates &amp; historical context <span aria-hidden="true">＋</span></summary>${h.summary?`<p>${esc(h.summary)}</p>`:''}<aside class="date-note"><h3>${h.status?esc(h.status)+' dates':'Date range'}</h3><p>${esc(h.note)}</p></aside>${posterNotes.length?'<div class="poster-context"><h3>Reference poster context</h3>'+posterNotes.map(note=>'<p>'+esc(note)+'</p>').join('')+'</div>':''}${references.length?'<div class="entry-sources"><h3>Atlas references</h3>'+references.map(sourceLink).join('')+'</div>':''}<p class="date-convention">These notes concern the selected topic. Related topics are not necessarily successive governments. Arrows describe particular events, not the origins or disappearance of peoples.</p></details>`;
 $('#detail-content').innerHTML+=sizingNote(id);
 showArticle('overview',false);
 if(!$('#detail').open)$('#detail').showModal();$('#detail-content').scrollTop=0;
 const url=new URL(location.href);url.searchParams.set('history',id);url.searchParams.delete('article');history.replaceState(null,'',url);
}
function showSources(){
 $('#coverage-scope').textContent=`${HISTORIES.length} timeline histories, ${ATLAS_TOPICS.length} detailed topics and ${MILESTONES.length} additional contextual entries through 2026. The index maps every named reference-poster topic to an entry, including 30 milestones and 52 landmarks, with corrected dates and explicit qualifications. This is not an exhaustive account of world history. The ${CONNECTION_MAPS.length} maps show ${relationships.length} selected relationships. Regions adds ${REGIONAL_ENTRIES.length} researched entries and brings existing topics together in ${REGIONAL_COLLECTIONS.length} overlapping collections. Timeline dates are linear; map positions have no time, territory or ancestry scale.`;
 const sources=[...new Map(Object.entries(SOURCES).filter(([key])=>key.startsWith('connection_')||entries.some(h=>(h.sources||[]).includes(key))).map(([,s])=>[s.url,s])).values()];
 $('#source-content').innerHTML=sources.map(s=>`<div class="source-item"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>${esc(s.publisher)}</p></div>`).join('');$('#source-dialog').showModal();$('#source-panel').scrollTop=0;
}
function showMilestones(){
 $('#milestone-list').innerHTML=[...MILESTONES,...ATLAS_TOPICS.filter(h=>h.category==='milestone')].sort((a,b)=>(a.year??Infinity)-(b.year??Infinity)).map(m=>`<button class="milestone-row" data-history="${m.id}"><span>${esc(m.dates)}</span><b>${esc(m.title)}</b><i aria-hidden="true">↗</i></button>`).join('');$('#milestone-dialog').showModal();$('#milestone-panel').scrollTop=0;
}
function search(){
 const query=normalize($('#search').value.trim());
 const rank=h=>{const title=normalize(h.title);return title===query?0:title.startsWith(query)?1:(h.searchAliases||[]).some(alias=>normalize(alias)===query)?2:3;};
 const matches=query?entries.filter(h=>entryText(h).includes(query)).sort((a,b)=>rank(a)-rank(b)||a.title.localeCompare(b.title)):[];
 const found=new Set(matches.map(h=>locationTarget(h.id)));
 blocks.forEach(block=>{const match=!query||found.has(block.dataset.history);block.classList.toggle('dim',!match);block.classList.toggle('hit',!!query&&match);});
 $('#search-count').textContent=query?`${matches.length} found`:'';
 $('#search-results').hidden=!query;
 $('#search-results').innerHTML=matches.length?matches.map(h=>`<button data-history="${h.id}"><b>${esc(h.title)}</b><span>${esc(h.dates)}</span><small class="entry-kind">${esc(kindName[kindOf(h)])}</small></button>`).join(''):query?'<p>No matching topics. Try another name, place or event.</p>':'';
}
function toggleSearch(show){const restore=!show&&!$('#search-panel').hidden;$('#search-panel').hidden=!show;$('#search-toggle').setAttribute('aria-expanded',String(show));if(show)$('#search').focus();else{$('#search').value='';search();if(restore)$('#search-toggle').focus({preventScroll:true});}}
$('#zoom-in').addEventListener('click',()=>setZoom(zoom+.5));$('#zoom-out').addEventListener('click',()=>setZoom(zoom-.5));$('#fit').addEventListener('click',()=>{setZoom(1);canvas.scrollTop=0;canvas.scrollLeft=0;});
$('#era-all').addEventListener('click',()=>setEra('all'));$('#era-modern').addEventListener('click',()=>setEra('modern'));
$('#era-connections').addEventListener('click',()=>setEra('connections'));$('#connection-index-toggle').addEventListener('click',showMapIndex);$('#map-index-search').addEventListener('input',renderMapIndex);$('#map-index-region').addEventListener('change',renderMapIndex);$('#connection-network').addEventListener('change',event=>selectConnectionMap(event.target.value));$('#connection-key').addEventListener('click',showConnectionKey);
$('#era-regions').addEventListener('click',()=>setEra('regions'));$('#regional-home').addEventListener('click',()=>openRegion(''));$('#regional-collection').addEventListener('change',event=>openRegion(event.target.value));$('#regional-search').addEventListener('input',renderRegional);$('#regional-type').addEventListener('change',renderRegional);$('#regional-key').addEventListener('click',showRegionalKey);
$('#locate-history').addEventListener('click',showSelectedOnChart);
$('#search-toggle').addEventListener('click',()=>toggleSearch($('#search-panel').hidden));$('#close-search').addEventListener('click',()=>toggleSearch(false));$('#search').addEventListener('input',search);$('#sources').addEventListener('click',showSources);$('#milestones').addEventListener('click',showMilestones);
$('#atlas-index').addEventListener('click',()=>showIndex());$('#index-kind').addEventListener('change',renderIndex);$('#index-search').addEventListener('input',renderIndex);
$('#size-prominence').addEventListener('click',()=>setSizing('prominence'));$('#size-equal').addEventListener('click',()=>setSizing('equal'));$('#sizing-key').addEventListener('click',showSizingGuide);
document.addEventListener('click',event=>{hideHistoryTooltip();const region=event.target.closest('[data-region-explore]');if(region){if(!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();openRegion(region.dataset.regionExplore);}return;}const chapter=event.target.closest('[data-select-map]');if(chapter){chooseConnectionMap(chapter.dataset.selectMap);return;}const jump=event.target.closest('[data-map-target]');if(jump){jumpToMap(jump.dataset.mapTarget,jump.dataset.mapHistory);return;}const block=event.target.closest('[data-history]');if(block){openHistory(block.dataset.history);return;}const edge=event.target.closest('[data-connection]');if(edge){openConnection(edge.dataset.connection);return;}const article=event.target.closest('[data-article]');if(article){showArticle(article.dataset.article);return;}if(event.target.closest('[data-sizing-help]')){showSizingGuide();return;}const close=event.target.closest('[data-close]');if(close)document.getElementById(close.dataset.close).close();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideHistoryTooltip();const region=event.target.closest?.('[data-region-explore]');if(region&&(event.key==='Enter'||event.key===' ')&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.shiftKey){event.preventDefault();openRegion(region.dataset.regionExplore);return;}const jump=event.target.closest?.('[data-map-target]'),block=event.target.closest?.('[data-history]'),edge=event.target.closest?.('[data-connection]');if((jump||block||edge)&&(event.key==='Enter'||event.key===' ')){event.preventDefault();if(jump)jumpToMap(jump.dataset.mapTarget,jump.dataset.mapHistory);else if(block)openHistory(block.dataset.history);else openConnection(edge.dataset.connection);}else if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&!$('#search-panel').hidden)toggleSearch(false);else if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();toggleSearch(true);}});
for(const id of ['detail','source-dialog','milestone-dialog','connection-detail','index-dialog','sizing-dialog','connection-index-dialog']){const dialog=document.getElementById(id);dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});}
$('#detail').addEventListener('close',()=>{if($('#detail').open)return;++detailRequest;activeController?.abort();activeController=null;const url=new URL(location.href);url.searchParams.delete('history');url.searchParams.delete('article');history.replaceState(null,'',url);const target=pendingLocate,next=pendingConnection,jump=pendingMapJump;pendingLocate=null;pendingConnection=null;pendingMapJump=null;if(jump)jumpToMap(jump.map,jump.id);else if(next)openConnection(next);else if(target)locateHistory(target);else previousFocus?.focus({preventScroll:true});});
$('#connection-detail').addEventListener('close',()=>{if(!$('#connection-detail').open&&!$('#detail').open)relationshipFocus?.focus({preventScroll:true});});
$('#index-dialog').addEventListener('close',()=>{if($('#index-dialog').open)return;const url=new URL(location.href);url.searchParams.delete('index');history.replaceState(null,'',url);if(!$('#detail').open)$('#atlas-index').focus({preventScroll:true});});
$('#connection-index-dialog').addEventListener('close',()=>{if(!$('#connection-index-dialog').open&&!$('#detail').open)$('#connection-index-toggle').focus({preventScroll:true});});
window.addEventListener('resize',()=>{const top=canvas.scrollTop;setZoom(zoom);canvas.scrollTop=top;});canvas.addEventListener('scroll',hideHistoryTooltip,{passive:true});window.addEventListener('blur',hideHistoryTooltip);canvas.addEventListener('scroll',()=>$('#zoom-hint').classList.add('fade'),{once:true});setTimeout(()=>$('#zoom-hint').classList.add('fade'),6500);$('#zoom-out').disabled=true;
const mapRegions=[...REGIONS,{id:'world',name:'Across regions'}];
$('#connection-network').innerHTML=mapRegions.map(region=>{const maps=CONNECTION_MAPS.filter(map=>map.region===region.id);return maps.length?`<optgroup label="${esc(region.name)}">${maps.map(map=>`<option value="${map.id}">${esc(map.title)}</option>`).join('')}</optgroup>`:'';}).join('');
$('#map-index-region').innerHTML='<option value="all">Every region</option>'+mapRegions.filter(region=>CONNECTION_MAPS.some(m=>m.region===region.id)).map(region=>`<option value="${region.id}">${esc(region.name)}</option>`).join('');
$('#regional-collection').innerHTML='<option value="">All regional collections</option>'+REGIONAL_COLLECTIONS.map(r=>`<option value="${r.id}">${esc(r.title)}</option>`).join('');
const initialParams=new URLSearchParams(location.search);if(REGIONAL_COLLECTIONS.some(r=>r.id===initialParams.get('region')))currentRegional=initialParams.get('region');if(CONNECTION_MAPS.some(map=>map.id===initialParams.get('map')))currentMap=initialParams.get('map');setSizing(initialParams.get('size'),false);setEra(initialParams.get('era'),false);
const initialHistory=initialParams.get('history');if(initialHistory){openHistory(initialHistory);const article=initialParams.get('article');if(article)showArticle(article);}
else if(initialParams.has('index'))showIndex(initialParams.get('index'));

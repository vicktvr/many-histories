// Authored regional research is kept separate from generated layout geometry.
const fs=require('node:fs'),path=require('node:path');
module.exports=function expand(spec){
 const files=fs.readdirSync(path.join(__dirname,'regions')).filter(f=>f.endsWith('.json')).sort();
 const oldRegions={'britain-atlantic':'europe','rome-francia':'europe','west-asia':'westasia','mongols-china':'eastasia','south-asia':'southasia','west-africa':'africa','iberian-americas':'americas','iran-modern':'westasia','africa-modern':'africa','steppe-russia':'europe'};
 for(const map of spec.networks)map.region??=oldRegions[map.id]||'world';
 spec.unconnected=[];
 spec.types.context={label:'Context / overlap',color:'#92917a',description:'A shared period, geographical frame or later heritage. This is not a claim of direct political succession or descent.'};
 spec.types.period={label:'Period transition',color:'#7d8c6f',description:'A conventional change of archaeological or cultural period. Populations, institutions and practices can continue across it.'};
 const contextIds=new Set(['eu-hallstatt-networks','eu-sicily-regionalcontext','ws-sumer-uruk']);
 const periodIds=new Set(['eu-palaces-earlyiron','eu-archaic-classical','eu-earlyiron-archaic','ws-uruk-citystates']);

 const knownExtras=new Map(spec.extras.map(e=>[e.id,e]));
 for(const file of files){
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,'regions',file),'utf8')),prefix=file.replace('.json','').replace(/[^a-z0-9]/g,'_')+'_';
  const key=k=>{k=k.replace(/^connection_/,'');return data.sources[k]?prefix+k:k;};
  for(const [id,source] of Object.entries(data.sources)){
   if(!source.publisher||!source.title||new URL(source.url).protocol!=='https:')throw Error('Incomplete regional source '+file+' '+id);
   spec.sources[prefix+id]=source;
  }
  for(const extra of data.extras||[]){
   const entry={...extra,sources:(extra.sources||[]).map(k=>'connection_'+key(k))};
   if(knownExtras.has(entry.id)){
    const prior=knownExtras.get(entry.id);if(prior.wikiTitle!==entry.wikiTitle)throw Error('Conflicting extra '+entry.id+' in '+file);
    prior.sources=[...new Set([...prior.sources,...entry.sources])];
   }else{spec.extras.push(entry);knownExtras.set(entry.id,entry);}
  }
  for(const original of data.maps||[]){
   if(spec.networks.some(m=>m.id===original.id))throw Error('Duplicate map '+original.id);
   const map={...original,autoLayout:true,nodes:original.nodes.map(n=>typeof n==='string'?{id:n}:n),connections:original.connections.map(e=>({...e,type:contextIds.has(e.id)||['heritage','period-example'].includes(e.basis)?'context':periodIds.has(e.id)?'period':e.type,selectedBranch:e.type==='division'&&e.to.length===1,sources:e.sources.map(key)}))};
   spec.networks.push(map);
  }
  for(const reason of data.unconnected||[])spec.unconnected.push({...reason,sources:(reason.sourceKeys||reason.sources||[]).map(key)});
 }
 // The older three-state preview now points to the complete regional chapters.
 const preview=spec.networks.flatMap(m=>m.connections).find(e=>e.id==='soviet-successors1991');
 if(preview&&files.length)preview.note='This preview shows three of fifteen states. All fifteen appear in the Soviet regional maps, accessible through Maps & coverage. Regional groupings are navigation aids, not intermediate successor states.';
 // A chronological continuation takes priority over shared cultural contacts.
 const earlyChina=spec.networks.find(m=>m.id==='china-early');
 if(earlyChina)earlyChina.continuations=[{map:'mongols-china',history:'song',label:'Later China: Mongol conquest and modern states'},...(earlyChina.continuations||[])];
 // Connect chapters through shared entries. Links are navigation, never additional
 // historical assertions. Existing hand-authored continuations retain priority.
 for(const map of spec.networks){
  const links=map.continuations||[],seen=new Set(links.map(l=>l.map));
  const peers=spec.networks.filter(other=>other.id!==map.id&&!seen.has(other.id)).map(other=>({map:other,shared:map.nodes.filter(n=>other.nodes.some(o=>o.id===n.id))})).filter(p=>p.shared.length).sort((a,b)=>(b.map.region===map.region)-(a.map.region===map.region)||b.shared.length-a.shared.length||a.map.title.localeCompare(b.map.title));
  const sameRegion=peers.some(p=>p.map.region===map.region);
  for(const peer of peers){if(sameRegion&&peer.map.region!==map.region&&peer.shared.length<2)continue;if(links.length>=3)break;links.push({map:peer.map.id,history:peer.shared[0].id,label:peer.map.title});}
  map.continuations=links;
 }
 return spec;
};

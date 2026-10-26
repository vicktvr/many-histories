// Regional catalogues supplement the overview; cards are not a time/power scale.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),dir=path.join(__dirname,'regional-research');
const c=vm.createContext({REGIONAL_ENTRIES:[]});
vm.runInContext(['data','additions','modern','connections-data','poster-data','wiki-data'].map(f=>fs.readFileSync(path.join(root,'dist',f+'.js'),'utf8')).join('\n')+';this.existing=[...HISTORIES,...CONNECTION_EXTRAS,...ATLAS_TOPICS,...MILESTONES];this.existingSources=SOURCES;this.pages=WIKI_PAGES;this.links=WIKI_LINKS;',c);
const existing=c.existing,byId=new Map(existing.map(e=>[e.id,e])),sources={},entries=[],explicit={};
const definitions=[
 ['early-world','Early human histories','Across regions, before and alongside the first states.','#ac9374'],
 ['africa','Africa','Northern, western, eastern, central and southern histories.','#d9ae65'],
 ['westasia','West Asia','Mesopotamia, Iran, Anatolia, the Levant and neighbouring worlds.','#c6af70'],
 ['arabia-caucasus','Arabia & the Caucasus','Focused histories beyond the large imperial frames.','#bd9b7a'],
 ['centralasia','Central Asia & the steppe','Mobile societies, exchange networks, khaganates and modern states.','#ab9fc2'],
 ['southasia','South Asia','Cultures, states, religious traditions and modern transformations.','#88b9ae'],
 ['eastasia','East & Southeast Asia','The wider collection, with a focused Southeast Asian view below.','#baa3c2'],
 ['southeastasia','Southeast Asia','Mainland and maritime histories, including continuing communities.','#88b4a3'],
 ['europe','Europe','Regional societies and kingdoms, confederations and modern states.','#abc18e'],
 ['americas','The Americas','Archaeological traditions, living peoples and later states.','#91b6c4'],
 ['oceania','Oceania & the Pacific','Island histories, voyaging, living cultures and modern states.','#c5b28c'],
 ['world','Across regions','Shared developments and guides that cross regional boundaries.','#9eaa91']
];
const validCollections=new Set(definitions.map(d=>d[0]));
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort()){
 const d=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8')),prefix='regional_'+file.replace(/\.json$/,'').replace(/[^a-z0-9]/gi,'_')+'_';
 for(const [key,source] of Object.entries(d.sources||{})){
  if(!source.publisher||!source.title||new URL(source.url).protocol!=='https:')throw Error('Incomplete regional source '+file+' '+key);
  sources[prefix+key]=source;
 }
 for(const e of d.entries||[]){
  if(byId.has(e.id))throw Error('Duplicate regional entry '+e.id);
  if(!e.id.startsWith('rx-')||!e.title||!e.dates||!e.note||!e.location||!e.wikiTitle)throw Error('Incomplete regional entry '+e.id);
  if(e.start===0||e.end===0||Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.start>=e.end)throw Error('Invalid regional dates '+e.id);
  if(!e.sources?.length||e.sources.some(k=>!sources[prefix+k]))throw Error('Missing regional reference '+e.id);
  const entry={...e,regionalOnly:true,status:e.status||'Selected',sources:e.sources.map(k=>prefix+k)};
  const wiki=c.pages[c.links[e.id]];if(wiki){const key='wikipedia_'+e.id;sources[key]={publisher:'Wikipedia contributors',title:wiki.title,url:wiki.url};entry.sources.push(key);entry.wikipedia={title:wiki.title,url:wiki.url,pageid:wiki.pageid};}
  entries.push(entry);byId.set(entry.id,entry);
  for(const id of entry.collections||[]){if(!validCollections.has(id))throw Error('Unknown regional collection '+id);(explicit[id]??=new Set()).add(entry.id);}
 }
 for(const [id,ids] of Object.entries(d.memberships||{})){
  if(!validCollections.has(id))throw Error('Unknown membership collection '+id);
  for(const entry of ids)(explicit[id]??=new Set()).add(entry);
 }
}
const all=[...existing,...entries],collections=definitions.map(([id,title,note,color])=>{
 const ids=new Set(explicit[id]||[]);
 for(const entry of all){if(entry.region===id||id==='world'&&!entry.region||id==='early-world'&&Number.isFinite(entry.start??entry.year)&&(entry.start??entry.year)<=-3000)ids.add(entry.id);}
 for(const entry of ids)if(!byId.has(entry))throw Error('Unknown regional membership '+id+' / '+entry);
 return {id,title,note,color,entries:[...ids].sort((a,b)=>byId.get(a).title.localeCompare(byId.get(b).title))};
});
const memberships={};for(const collection of collections)for(const id of collection.entries)(memberships[id]??=[]).push(collection.id);
const js='// Expanded regional catalogue. Cards are not a time or power scale.\nconst REGIONAL_ENTRIES='+JSON.stringify(entries)+';\nconst REGIONAL_COLLECTIONS='+JSON.stringify(collections)+';\nconst REGIONAL_MEMBERSHIP='+JSON.stringify(memberships)+';\nObject.assign(SOURCES,'+JSON.stringify(sources)+');\n';
fs.writeFileSync(path.join(root,'dist/regional-data.js'),js);
fs.writeFileSync(path.join(root,'dist/regional-catalogue.json'),JSON.stringify({scope:'Selected, overlapping regional collections, not an exhaustive history. Card sizes do not measure time, power, population or importance. Living peoples do not require a single founding year.',collections,entries:all,sources:{...c.existingSources,...sources}},null,2)+'\n');
console.log(JSON.stringify({regionalCollections:collections.length,newEntries:entries.length,uniqueEntries:Object.keys(memberships).length}));

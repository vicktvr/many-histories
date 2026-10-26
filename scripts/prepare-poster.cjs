const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({});
vm.runInContext(['data.js','additions.js','modern.js','connections-data.js'].map(f=>fs.readFileSync(path.join(root,'dist',f),'utf8')).join('\n')+';this.data={histories:HISTORIES,nodes:CONNECTION_EXTRAS};',ctx);
const originalMilestones=JSON.parse(fs.readFileSync(path.join(root,'scripts/wiki-specs.json'),'utf8')).milestones;
const base=new Map([...ctx.data.histories,...originalMilestones].map(h=>[h.id,h]));
const nodes=new Map(ctx.data.nodes.map(h=>[h.id,h]));
const load=file=>JSON.parse(fs.readFileSync(path.join(root,'scripts',file),'utf8'));
const europe=load('poster-europe.json'),asia=load('poster-asia.json'),details=load('poster-details.json');
const rows=[...europe,...asia,...require('./poster-americas.cjs'),...require('./poster-guides.cjs'),...details.milestones,...details.landmarks];
const shortTitles={'cn-alexander':'Macedon','cn-westrome':'Western Rome','cn-eastfrancia':'East Francia','cn-westfrancia':'West Francia','poster-europe-004':'Punic Iberia','poster-europe-007':'Roman Kingdom','poster-europe-036':'Portucale II','poster-europe-078':'Two Sicilies','poster-europe-082':'Germanic peoples','poster-europe-084':'Alpine kingdoms','poster-europe-098':'Habsburg Austria',portugalmodern:'Portugal',austriamodern:'Austria',greecemodern:'Greece',iraqmodern:'Iraq','iraq-kingdom':'Kingdom of Iraq','muhammad-ali':'Muhammad Ali dynasty',sumer:'Sumer',medes:'Medes','five-dynasties':'Five Dynasties',timurid:'Timurid Empire','cn-ilkhanate':'Ilkhanate'};
const added=[],topics=[],items=[],byId=new Map(base),sources={},promoted=[],updates={};
const slug=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
for(const [index,row] of rows.entries()){
 const label=row.posterLabel;if(!label)throw Error('Missing poster label '+index);
 const category=row.category||(details.landmarks.includes(row)?'landmark':details.milestones.includes(row)?'milestone':'period');
 const separatePeriod=category==='period'&&row.parent===row.id&&base.has(row.id);
 const id=separatePeriod?(row.suggestedId||row.proposedId||'period-'+slug(label)):(row.id||row.suggestedId||row.proposedId||'poster-'+slug(label));
 if(!row.wikiTitle)throw Error('Missing article title: '+label);
 const sourceKeys=[];
 for(const [i,source] of (row.sources||[]).entries()){
  if(!source.url||new URL(source.url).protocol!=='https:')throw Error('Invalid source '+label);
  const key='poster_'+id+'_'+i;sources[key]=source;sourceKeys.push(key);
 }
 let entry=byId.get(id);
 if(!entry){
  const prior=nodes.get(id),start=id==='cn-alexander'?-334:row.start??row.year??null,end=row.end??null,ongoing=row.end===null&&row.start!==undefined;
  entry={...prior,id,title:prior?.title||row.proposedTitle||row.title||label,shortTitle:row.shortTitle||prior?.shortTitle||row.proposedTitle||row.title||label,region:row.region||null,dates:prior?.dates||row.dates||`${start<0?Math.abs(start)+' BCE':start+' CE'}–${end===null?'present':end<0?Math.abs(end)+' BCE':end+' CE'}`,type:{history:'Political or archaeological frame',period:'Selected subperiod',culture:'Living cultures and historical context',landmark:'Landmark',milestone:'Event / development',guide:'Reading the chart'}[category],status:row.status||(/debat|disput|tradition/i.test(row.note||'')?'Debated':/\bc\.|approximate/i.test(row.dates||'')?'Approximate':'Contextual'),location:row.location||({africa:'Africa',westasia:'West Asia',southasia:'South Asia',eastasia:'East Asia',europe:'Europe',americas:'The Americas',oceania:'Oceania'}[row.region]||'Comparative history'),summary:row.summary||'',note:prior?.note||row.note||'A selected topic from the reference poster. The article supplies further historical context.',wikiTitle:row.wikiTitle,parent:row.parent||row.history||null,category,sources:[...sourceKeys,'wikipedia_'+id],posterLabels:[label]};
  if(category==='history'){
   if(!Number.isFinite(start)||!Number.isFinite(end)&&!ongoing)throw Error('History needs bounded or ongoing dates: '+label);
   entry.start=start;entry.end=ongoing?2027:end;entry.ongoing=ongoing;entry.graphOnly=false;entry.shortTitle=shortTitles[id]||row.shortTitle||label.split(' · ')[0];
   if(start===0||entry.end===0||start>=entry.end)throw Error('Invalid dates: '+label);
   added.push(entry);if(prior)promoted.push(id);
  }else{
   entry.start=start;entry.end=ongoing?2027:end;entry.year=row.year??start;entry.ongoing=ongoing;
   topics.push(entry);
  }
  byId.set(id,entry);
 }else if(entry.posterLabels&&!entry.posterLabels.includes(label))entry.posterLabels.push(label);
 if(base.has(id)){
  const update=updates[id]??={posterLabels:[],notes:[],sources:[]};
  if(!update.posterLabels.includes(label))update.posterLabels.push(label);
  if(row.note&&!update.notes.includes(row.note))update.notes.push(row.note);
  update.sources.push(...sourceKeys);
 }
 if(!row.derivedDetail)items.push({id:'item-'+index,label:row.posterLabelOriginal||label,entryId:id,category,correction:row.note||entry.note||'',representation:originalMilestones.some(m=>m.id===id)?'Key event article':base.has(id)?'Timeline history':category==='history'?'Timeline history':category==='period'?'Named period in the index and related history reader':category==='landmark'?'Landmark article and related history reader':category==='milestone'?'Milestone article':'Context article'});
}
// Additional coverage is separate from the poster checklist.
const supplemental=require('./supplemental-spec.cjs');Object.assign(sources,supplemental.sources);
for(const entry of supplemental.histories){if(byId.has(entry.id))throw Error('Duplicate supplemental history '+entry.id);added.push(entry);byId.set(entry.id,entry);}
for(const entry of supplemental.topics){if(byId.has(entry.id))throw Error('Duplicate supplemental topic '+entry.id);topics.push(entry);byId.set(entry.id,entry);}
// Preserve the four additional landmark readings already offered by the atlas.
for(const reading of load('related-readings.json'))if(!byId.has(reading.id)){
 const entry={id:reading.id,title:reading.label,wikiTitle:reading.wikiTitle,category:'landmark',type:'Landmark',status:'Contextual',dates:'Construction and use developed over time',start:null,end:null,year:null,region:byId.get(reading.history)?.region||null,parent:reading.history,location:byId.get(reading.history)?.location||'',summary:'',note:'This additional landmark reading extends the atlas beyond the reference poster. See the article and heritage reference for its construction and use chronology.',sources:['poster_'+reading.id,'wikipedia_'+reading.id]};
 sources['poster_'+reading.id]=reading.reference;topics.push(entry);byId.set(entry.id,entry);
}
// Some source poster phases have a shared title but different dates. Every row
// maps to a stable entry; repeated words alone never count as coverage.
for(const entry of [...added,...topics]){
 if(!entry.region&&entry.parent)entry.region=byId.get(entry.parent)?.region||nodes.get(entry.parent)?.region||null;
 if(!entry.region&&entry.category==='landmark'){
  const location=entry.location.toLowerCase();
  for(const [region,pattern] of [['africa',/egypt|luxor|giza/],['westasia',/iran|iraq|istanbul|turkey|türkiye/],['southasia',/india|pakistan|taxila/],['eastasia',/china|japan|kyoto|beijing/],['americas',/america|united states|mexico|canada|argentina|buenos aires|alberta|illinois|colorado/],['oceania',/australia|uluru|sydney/],['europe',/england|britain|france|spain|portugal|italy|germany|austria|vienna|paris|rome|pisa|lisbon|cologne|antequera|hallstatt|salisbury|cantabria|dordogne/]])if(pattern.test(location)){entry.region=region;break;}
 }
 if(entry.parent&&!byId.has(entry.parent)&&!nodes.has(entry.parent)&&!['event-printing','event-atlanticvoyage','event-moonlanding'].includes(entry.parent))throw Error('Unknown related history '+entry.id+' -> '+entry.parent);
 if(entry.parent===entry.id)throw Error('Self-parent '+entry.id);
}
const countries=[['🇺🇸','United States','unitedstates'],['🇨🇦','Canada','canada'],['🇲🇽','Mexico','mexicomodern'],['🇦🇷','Argentina','argentinamodern'],['🇦🇺','Australia','australiamodern'],['🇬🇧','United Kingdom','unitedkingdom'],['🇵🇹','Portugal','portugalmodern'],['🇪🇸','Spain','spainmodern'],['🇫🇷','France','francemodern'],['🇮🇹','Italy','italymodern'],['🇩🇪','Germany','germanymodern'],['🇦🇹','Austria','austriamodern'],['🇬🇷','Greece','greecemodern'],['🇹🇷','Türkiye','turkiye'],['🇪🇬','Egypt','egyptmodern'],['🇮🇶','Iraq','iraqmodern'],['🇮🇷','Iran','iranmodern'],['🇵🇰','Pakistan','pakistan'],['🇮🇳','India','indiamodern'],['🇨🇳','China','prchina'],['🇯🇵','Japan','japanmodern']].map(([flag,title,id])=>({flag,title,id}));
const spec={histories:added,topics,items,sources,promoted,countries,updates};
fs.writeFileSync(path.join(root,'scripts/poster-spec.json'),JSON.stringify(spec,null,2)+'\n');
const js='// Named poster topics. Corrected dates and qualifications are explicit.\nObject.assign(SOURCES,'+JSON.stringify(sources)+');\nHISTORIES.push(...'+JSON.stringify(added)+');\nfor(let i=CONNECTION_EXTRAS.length-1;i>=0;i--)if('+JSON.stringify(promoted)+'.includes(CONNECTION_EXTRAS[i].id))CONNECTION_EXTRAS.splice(i,1);\nconst ATLAS_TOPICS='+JSON.stringify(topics)+';\nconst POSTER_ITEMS='+JSON.stringify(items)+';\nconst POSTER_COUNTRIES='+JSON.stringify(countries)+';\nconst POSTER_UPDATES='+JSON.stringify(updates)+';\n';
fs.writeFileSync(path.join(root,'dist/poster-data.js'),js);
fs.writeFileSync(path.join(root,'dist/poster-coverage.json'),JSON.stringify({scope:'Named histories, phases, milestones, landmarks, era labels and country flags transcribed from the supplied reference poster. Each maps to a dedicated entry; corrections are explicit. Decorative slogans and branding are not reproduced.',items,countries},null,2)+'\n');
console.log(JSON.stringify({posterItems:items.length,newHistories:added.length,topics:topics.length,promotedMapNodes:promoted.length,countries:countries.length}));

require('./build-connection-coverage.cjs');

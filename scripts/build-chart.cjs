const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),ctx={};vm.createContext(ctx);
vm.runInContext(['data.js','additions.js','modern.js','connections-data.js','poster-data.js','connection-coverage.js','regional-data.js','wiki-data.js'].map(file=>fs.readFileSync(path.join(root,'dist',file),'utf8')).join('\n')+'\nthis.data={regions:REGIONS,histories:HISTORIES,sources:SOURCES,milestones:MILESTONES,relatedReadings:RELATED_READINGS,connectionMaps:CONNECTION_MAPS,connectionNodes:CONNECTION_EXTRAS,topics:ATLAS_TOPICS,posterItems:POSTER_ITEMS,countries:POSTER_COUNTRIES,connectionCoverage:CONNECTION_COVERAGE,regionalEntries:REGIONAL_ENTRIES,regionalCollections:REGIONAL_COLLECTIONS};',ctx);
const {regions,histories}=ctx.data;
const prominence=require('./prominence-model.cjs');
const W=1800,H=3600,TOP=190,BOTTOM=3500,LEFT=96,RIGHT=28,CW=(W-LEFT-RIGHT)/7;
const axis=y=>y<0?y+1:y;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num=v=>Number(v.toFixed(2));
const palettes={africa:['#efb34c','#87c5ae','#ef9479','#b8cf7a','#f2d27b','#8ebfd1','#dbadca','#e6ac5c','#91c399','#e8a4a1'],westasia:['#e9c56b','#eab18d','#e1ce82','#9bc6b5','#86b5c2'],southasia:['#9ac9c8','#c0ca82','#8db5cd','#b5c98a'],eastasia:['#efc675','#e99e9b','#8fc5ae','#a8c6d9','#d4b7d4','#f0bf7a'],europe:['#edbc75','#b7d08f','#ee9792','#c4afd1','#92c4bd'],americas:['#92bccd','#efc16f','#a9cd9b','#d2aed0','#98c8b1','#eba395','#b3c2de'],oceania:['#d7c69e','#99c6ba','#b4c9a3','#e7bb8c']};
const names={egypt:'Ancient Egyptian dynasties',nubia:'Nubian kingdoms',nok:'Nok culture',jenne:'Jenne-jeno',ghana:'Ghana / Wagadu',aksum:'Aksum',zimbabwe:'Great Zimbabwe',benin:'Kingdom of Benin',mali:'Mali Empire',songhai:'Songhai Empire',uruk:'Uruk · early urban growth',akkad:'Akkadian period',persia:'Achaemenid Persian Empire',abbasid:'Abbasid caliphate',ottoman:'Ottoman Empire',indus:'Indus · Mature Harappan',maurya:'Mauryan Empire',gupta:'Gupta period',mughal:'Mughal dynasty',han:'Han dynasties',tang:'Tang dynasty',angkor:'Angkor · Khmer capitals',song:'Song dynasties',joseon:'Joseon dynasty',edo:'Edo / Tokugawa',minoan:'Minoan culture',greece:'Classical Greek world',rome:'Roman Empire · West',byzantium:'Eastern Roman / Byzantine Empire',carolingian:'Carolingian period',caral:'Caral-Supe',olmec:'Olmec traditions',teotihuacan:'Teotihuacan',maya:'Maya · Classic period',cahokia:'Cahokia',mexica:'Aztec Triple Alliance',inca:'Inca expansion',australia:'Aboriginal Australian cultures',lapita:'Lapita traditions',nanmadol:'Nan Madol',maori:'Māori cultures'};
Object.assign(names,{ife:'Ife',oyo:'Oyo Empire',asante:'Asante Empire',kongo:'Kongo',kilwa:'Kilwa',ethiopia:'Solomonic Ethiopia',kanem:'Kanem',bornu:'Bornu',hittite:'Hittite kingdom',phoenicia:'Phoenician city-states',sasanian:'Sasanian Empire',rashidun:'Rashidun',umayyad:'Umayyad caliphate',seljuq:'Great Seljuqs',safavid:'Safavid Iran',kushan:'Kushan Empire',chola:'Chola dynasty',delhi:'Delhi Sultanate',vijayanagara:'Vijayanagara',maratha:'Maratha polity',qin:'Qin',sui:'Sui',mongol:'Mongol Empire',yuan:'Yuan',ming:'Ming',qing:'Qing',heian:'Heian period',goryeo:'Goryeo',srivijaya:'Srivijaya',majapahit:'Majapahit',mycenaean:'Mycenaean societies',romanrepublic:'Roman Republic',hellenistic:'Hellenistic kingdoms',holyroman:'Holy Roman Empire',rus:'Kyivan Rusʹ',moche:'Moche',nazca:'Nazca',chaco:'Chaco Canyon',wari:'Wari',tiwanaku:'Tiwanaku',tonga:'Tuʻi Tonga',rapanui:'Rapa Nui · moai'});
names.byzantium='Byzantium';
const glyphWidths=require('./font-metrics.json').widths;
const textWidth=(text,font)=>[...text].reduce((n,c)=>n+(glyphWidths[c]??.75),0)*font*1.03;
function wrap(text,width,font,splitLong=false){
 const words=text.split(' '),lines=[];let line='';
 for(const word of words){
  if(line&&textWidth(line+' '+word,font)>width){lines.push(line);line='';}
  if(splitLong&&textWidth(word,font)>width){let chunk='';for(const char of word){if(chunk&&textWidth(chunk+char,font)>width){lines.push(chunk);chunk='';}chunk+=char;}line=chunk;}
  else line+=(line?' ':'')+word;
 }
 if(line)lines.push(line);return lines;
}
const regionColors=Object.fromEntries(histories.map(h=>[h.id,require('./chart-colors.cjs').color(h)]));
// Stable regional budgets within broad eras keep the display legible: a new
// local polity does not shift every other continent's lane sideways.
const epochs=[-4500,-3000,-1500,-500,1,500,1000,1450,1700,1850,1914,1945,1991,2026];
const worldBoundaries=[...new Set([...epochs,...histories.flatMap(h=>[h.start,h.end]),...Object.values(prominence.phases).flat().flatMap(p=>[p.start,p.end])])].filter(y=>y>=epochs[0]&&y<=2026).sort((a,b)=>a-b);
const eraBudgets=epochs.slice(0,-1).map((a,i)=>{
 const z=epochs[i+1],strengths=regions.map(()=>0);
 for(let j=0;j<worldBoundaries.length-1;j++){
  const from=Math.max(a,worldBoundaries[j]),to=Math.min(z,worldBoundaries[j+1]);if(from>=to)continue;const mid=(from+to)/2;
  regions.forEach((region,ri)=>{const weights=histories.filter(h=>h.region===region.id&&h.start<=mid&&h.end>=mid).map(h=>prominence.weightAt(h.id,mid)),peak=Math.max(0,...weights),sum=weights.reduce((a,b)=>a+b,0);strengths[ri]+=(peak+.12*(sum-peak))*(axis(to)-axis(from));});
 }
 const total=strengths.reduce((a,b)=>a+b,0);return {start:a,end:z,widths:strengths.map(s=>CW*.4+(W-LEFT-RIGHT)*.6*(total?s/total:1/7))};
});
function buildChart(start,end,suffix,heading,step,weighted=true){
const selected=histories.filter(h=>h.start<end&&h.end>start);
const y=year=>TOP+(axis(year)-axis(start))/(axis(end)-axis(start))*(BOTTOM-TOP);
const date=year=>Math.abs(year)+' '+(year<0?'BC':'AD');
function labelCandidate(segment,title){
 const width=segment.x1-segment.x0,height=y(segment.end)-y(segment.start);
 const rotated=width<68&&height>(weighted?55:110),availableWidth=rotated?height-(weighted?12:24):width-8,availableHeight=rotated?width-8:height,padding=availableHeight<10?0:2;
 let font=rotated?(width>35?16:13):width>160?17:width>100?15:width>65?13:11,lines=wrap(title,availableWidth,font);
 while(font>4&&(lines.length*font*1.23+padding>availableHeight||lines.some(line=>textWidth(line,font)>availableWidth))){font--;lines=wrap(title,availableWidth,font);}
 if(font===4&&lines.some(line=>textWidth(line,font)>availableWidth))lines=wrap(title,availableWidth,font,true);
 const fits=lines.length*font*1.23+padding<=availableHeight&&lines.every(line=>textWidth(line,font)<=availableWidth);
 return {segment,width,height,font,lines,fits,rotated,padding,score:(fits&&font>=8?1e9:fits?1e8:0)+width*height};
}
let elements=[];
elements.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-labelledby="chart-title-${suffix} chart-desc-${suffix}"><title id="chart-title-${suffix}">${esc(heading)}</title><desc id="chart-desc-${suffix}">${selected.length} selected histories. Time flows from ${date(start)} at the top to ${date(end)} at the bottom on one linear scale. ${weighted?'Width shows an approximate editorial weighting of reach, influence and lasting impact. Regional lanes expand and contract, in the left-to-right order shown. It is not a measurement of territory, population or the worth of a people.':'Seven fixed regional columns. Concurrent histories share equal widths; width carries no prominence score.'} Select a block for Wikipedia, dates and its sizing explanation.</desc><style>text{font-family:Arial,Helvetica,sans-serif;fill:#222821}.history{cursor:pointer;outline:none}.history .shape{stroke:#fffdf8;stroke-width:1.15;stroke-linejoin:round}.history:hover .shape,.history:focus .shape{stroke:#26362d;stroke-width:2.6}.history.dim{opacity:.10}.history.hit .shape{stroke:#16291d;stroke-width:2.8}.block-label,.block-date{pointer-events:none}.block-label{font-weight:600}.block-date{fill:#384136}.grid{stroke:#dddcd3;stroke-width:.7;stroke-dasharray:3 6}.axis{fill:#73766b;font-size:11px}.region-link{cursor:pointer;outline:none}.region-link:hover .region-target,.region-link:focus .region-target{fill:#e9eee3;stroke:#94aa87;stroke-width:1}.region-label{font-weight:600;font-size:13px;letter-spacing:1.5px}.heading{font-size:57px;font-weight:700;letter-spacing:-1.7px}.micro{fill:#777d70;font-size:11px;letter-spacing:.5px}</style><rect width="${W}" height="${H}" fill="#fdfcf8"/><text class="heading" x="${W/2}" y="80" text-anchor="middle">${esc(heading.toUpperCase())}</text><text class="micro" x="${W/2}" y="112" text-anchor="middle">${date(start)} — ${date(end)} · ${weighted?'PROMINENCE VIEW':'EQUAL WIDTHS'}</text>${weighted?`<text class="micro" x="${W/2}" y="134" text-anchor="middle">REGIONS RUN LEFT → RIGHT · LANES EXPAND WITH PROMINENCE</text>`:''}`);
const ticks=[];for(let year=start;year<=end;year+=step)if(end-year>step*.18)ticks.push(year===0?1:year);ticks.push(end);
for(const yr of ticks){const py=num(y(yr));elements.push(`<path class="grid" d="M${LEFT} ${py}H${W-RIGHT}"/><path d="M77 ${py}h11" stroke="#a5aa99"/><text class="axis" text-anchor="end" x="69" y="${py+4}">${date(yr)}</text>`);}
elements.push(`<text class="micro" x="69" y="171" text-anchor="end">YEAR ↓</text>`);
const layout=[];
const weightedSegments=new Map(selected.map(h=>[h.id,[]]));
if(weighted){
 const boundaries=[...new Set([start,end,...epochs,...selected.flatMap(h=>[Math.max(start,h.start),Math.min(end,h.end)]),...Object.values(prominence.phases).flat().flatMap(p=>[p.start,p.end])])].filter(v=>v>=start&&v<=end).sort((a,b)=>a-b);
 for(let b=0;b<boundaries.length-1;b++){
  const a=boundaries[b],z=boundaries[b+1],mid=(a+z)/2;
  const lanes=regions.map(region=>{
   const active=selected.filter(h=>h.region===region.id&&h.start<=mid&&h.end>=mid).sort((a,b)=>a.start-b.start||a.end-b.end);
   const weights=active.map(h=>prominence.weightAt(h.id,mid)),sum=weights.reduce((a,b)=>a+b,0),peak=Math.max(0,...weights);
   return {active,weights,sum,strength:peak+.12*(sum-peak)};
  });
  const budgets=eraBudgets.find(era=>mid>=era.start&&mid<era.end).widths;let left=LEFT;
  for(const [ri,lane] of lanes.entries()){
   const budget=budgets[ri];
   const used=Math.min(budget,Math.max(lane.active.length*16,budget*Math.min(1,lane.strength/8))),minimum=Math.min(16,used/Math.max(1,lane.active.length));let cursor=left+(budget-used)/2;
   lane.active.forEach((h,i)=>{const width=minimum+(used-minimum*lane.active.length)*(lane.weights[i]/lane.sum),x0=cursor,x1=cursor+width,arr=weightedSegments.get(h.id),last=arr.at(-1);if(last&&Math.abs(last.x0-x0)<.001&&Math.abs(last.x1-x1)<.001&&last.end===a)last.end=z;else arr.push({x0,x1,start:a,end:z,weight:lane.weights[i]});cursor=x1;});
   left+=budget;
  }
 }
}
regions.forEach((region,ri)=>{
 const rx=LEFT+ri*CW,entries=selected.filter(h=>h.region===region.id).sort((a,b)=>a.start-b.start||a.end-b.end),color=palettes[region.id][0],label=region.id==='eastasia'?'EAST & SE ASIA':region.short.toUpperCase();
 elements.push(`<a class="region-link" id="region-${suffix}-${region.id}" data-region-explore="${region.id}" href="./?era=regions&amp;region=${region.id}" aria-label="Explore ${esc(region.name)} in Regions"><rect class="region-target" x="${num(rx+3)}" y="139" width="${num(CW-6)}" height="43" rx="4" fill="none" pointer-events="all"/><text class="region-label" x="${num(rx+CW/2)}" y="158" text-anchor="middle">${esc(label)}</text><rect x="${num(rx+9)}" y="174" width="${num(CW-18)}" height="3" fill="${color}"/></a>${weighted?'':`<path d="M${num(rx)} ${TOP}V${BOTTOM}" stroke="#e0e1d6" stroke-width=".7"/>`}`);
 const boundaries=[...new Set([start,end,...entries.flatMap(h=>[Math.max(start,h.start),Math.min(end,h.end)])])].filter(v=>v>=start&&v<=end).sort((a,b)=>a-b),segments=weighted?weightedSegments:new Map(entries.map(h=>[h.id,[]]));
 if(!weighted)for(let b=0;b<boundaries.length-1;b++){const a=boundaries[b],z=boundaries[b+1],mid=(a+z)/2,active=entries.filter(h=>h.start<=mid&&h.end>=mid);active.forEach((h,index)=>{const x0=rx+index/active.length*CW,x1=rx+(index+1)/active.length*CW,arr=segments.get(h.id),last=arr.at(-1);if(last&&Math.abs(last.x0-x0)<.001&&Math.abs(last.x1-x1)<.001&&last.end===a){last.end=z;}else arr.push({x0,x1,start:a,end:z});});}
 entries.forEach((h,index)=>{
  const segs=segments.get(h.id);if(!segs.length)return;
  let d=`M${num(segs[0].x0)},${num(y(segs[0].start))}`;
  segs.forEach((s,i)=>{if(i)d+=` L${num(s.x0)},${num(y(s.start))}`;d+=` L${num(s.x0)},${num(y(s.end))}`;});const last=segs.at(-1);d+=` L${num(last.x1)},${num(y(last.end))}`;[...segs].reverse().forEach((s,i)=>{if(i)d+=` L${num(s.x1)},${num(y(s.end))}`;d+=` L${num(s.x1)},${num(y(s.start))}`;});d+=' Z';
  // Find rectangles contained in consecutive stair segments as well as single
  // segments. A changing neighbouring state must not unnecessarily fragment a label.
  const labelAreas=[...segs];for(let i=0;i<segs.length;i++){let x0=segs[i].x0,x1=segs[i].x1;for(let j=i+1;j<segs.length;j++){x0=Math.max(x0,segs[j].x0);x1=Math.min(x1,segs[j].x1);if(x1-x0<8)break;labelAreas.push({x0,x1,start:segs[i].start,end:segs[j].end});}}
  const candidate=labelAreas.map(s=>labelCandidate(s,h.shortTitle||names[h.id]||h.title)).sort((a,b)=>b.score-a.score)[0],best=candidate.segment,bw=candidate.width,bh=candidate.height,cx=(best.x0+best.x1)/2;
  const {font,lines}=candidate;
  const lineHeight=font*1.23,blockHeight=lines.length*lineHeight,cy=(y(best.start)+y(best.end))/2,labelY=cy-blockHeight/2+font*.8,fill=regionColors[h.id],first=segs[0],firstH=y(first.end)-y(first.start),continuing=h.ongoing||h.end>end,startLabel=h.start<start?'← Earlier':`${h.status==='Approximate'||h.status==='Debated'?'c. ':''}${Math.abs(h.start)} ${h.start<0?'BC':'AD'}`;
  const transform=candidate.rotated?` transform="rotate(-90 ${num(cx)} ${num(cy)})"`:'';
  let labels=candidate.fits?lines.map((text,i)=>`<text id="label-${suffix}-${h.id}-${i}" class="block-label" font-size="${font}" x="${num(cx)}" y="${num(labelY+i*lineHeight)}" text-anchor="middle"${transform}>${esc(text)}</text>`).join(''):'';
  if(firstH>22&&first.x1-first.x0>startLabel.length*9*.57+12&&(first!==best||bh>blockHeight+30))labels+=`<text class="block-date" font-size="9" x="${num(first.x0+6)}" y="${num(y(first.start)+12)}">${esc(startLabel)}</text>`;
  const endLabel=continuing?'Continuing':`${Math.abs(h.end)} ${h.end<0?'BC':'AD'}`,endFont=bw>100?10:9;
  if(!candidate.rotated&&bh>blockHeight+45&&bw>endLabel.length*endFont*.57+8)labels+=`<text class="block-date" font-size="${endFont}" x="${num(cx)}" y="${num(labelY+blockHeight+10)}" text-anchor="middle">${esc(endLabel)}</text>`;
  if(continuing&&last.x1-last.x0>25)labels+=`<text class="block-date" font-size="9" x="${num((last.x0+last.x1)/2)}" y="${BOTTOM-9}" text-anchor="middle">↓</text>`;
  elements.push(`<g class="history" id="block-${suffix}-${h.id}" data-history="${h.id}" data-region="${h.region}" role="button" tabindex="0" aria-label="${esc(h.title+', '+h.dates+'. Open Wikipedia and dates.')}" aria-haspopup="dialog"><title>${esc(h.title+' · '+h.dates)}</title><path class="shape" fill="${fill}" d="${d}"/>${labels}</g>`);
  layout.push({id:h.id,region:h.region,mode:weighted?'prominence':'equal',tier:prominence.ratings[h.id].tier,segments:segs,label:{x:num(cx),y:num(labelY),font,lines,width:bw,height:bh,fits:candidate.fits,visible:candidate.fits,rotated:candidate.rotated,padding:candidate.padding,start:best.start,end:best.end},fill});
 });
});
elements.push(`<path d="M${W-RIGHT} ${TOP}V${BOTTOM}" stroke="#e0e1d6" stroke-width=".7"/><text class="micro" x="${LEFT}" y="${BOTTOM+38}">${weighted?'Height = years · Width = approximate editorial prominence':'c. = approximate · Selected histories · Blank space does not mean an absence of history'}</text><text class="micro" x="${W-RIGHT}" y="${BOTTOM+38}" text-anchor="end">${weighted?'Not territory, population or the worth of a people':'Widths do not represent territory or power'}</text><text class="micro" x="${W/2}" y="${BOTTOM+55}" text-anchor="middle">Blank space reflects selection, not an absence of history · Select a region for more</text><text x="${W/2}" y="${BOTTOM+72}" text-anchor="middle" style="font-size:10px;fill:#8a8e80;letter-spacing:1.4px">MANY HISTORIES</text></svg>`);
return {svg:elements.join('\n'),layout};
}
const full=buildChart(-4500,2026,'all','Timeline of World History',500),modern=buildChart(1450,2026,'modern','Modern World History',50),equal=buildChart(-4500,2026,'all-equal','Timeline of World History',500,false),modernEqual=buildChart(1450,2026,'modern-equal','Modern World History',50,false);
fs.writeFileSync(path.join(root,'dist/chart.svg'),full.svg);
fs.writeFileSync(path.join(root,'dist/modern-chart.svg'),modern.svg);
fs.writeFileSync(path.join(root,'dist/equal-chart.svg'),equal.svg);fs.writeFileSync(path.join(root,'dist/modern-equal-chart.svg'),modernEqual.svg);
fs.writeFileSync(path.join(root,'dist/prominence-data.js'),'// Editorial display weights, not measured historical quantities.\nconst PROMINENCE_TIERS='+JSON.stringify(prominence.tiers)+';\nconst PROMINENCE_RATINGS='+JSON.stringify(prominence.ratings)+';\nconst PROMINENCE_PHASES='+JSON.stringify(prominence.phases)+';\n');
fs.writeFileSync(path.join(root,'dist/prominence-method.json'),JSON.stringify({methodology:prominence.source.methodology,height:'Linear historical years; duration is not counted again in the width score.',width:'Reviewed tier weight, multiplied by the selected phase factor. Concurrent weights share each regional lane. Lane budgets combine a 40% equal regional reserve and 60% proportional strength, averaged within the documented broad eras. Regional strength is its largest active weight plus 12% of its other active weights. Occupied lane width is capped by strength/8, with a minimum of sixteen SVG units per visible block where possible. These are layout choices, not measured historical quantities.',eraBudgets,tiers:prominence.tiers,ratings:prominence.ratings,phases:prominence.phases,sources:prominence.source.sources},null,2)+'\n');
ctx.data.prominence={methodology:prominence.source.methodology,tiers:prominence.tiers,ratings:prominence.ratings,phases:prominence.phases};
const template=fs.readFileSync(path.join(root,'scripts/page.html'),'utf8').replace(/\b(src|href)="([^"?]+\.(?:js|css))"/g,(match,attribute,file)=>`${attribute}="${file}?v=${crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist',file))).digest('hex').slice(0,12)}"`);
fs.writeFileSync(path.join(root,'dist/index.html'),template.replace('<!-- CHART -->',`<div id="chart-all" class="chart-view"><div id="chart-all-prominence" class="chart-variant">${full.svg}</div><div id="chart-all-equal" class="chart-variant" hidden>${equal.svg}</div></div><div id="chart-modern" class="chart-view" hidden><div id="chart-modern-prominence" class="chart-variant">${modern.svg}</div><div id="chart-modern-equal" class="chart-variant" hidden>${modernEqual.svg}</div></div>`).replace('<!-- CONNECTIONS -->',fs.readFileSync(path.join(root,'dist/connections-fragment.html'),'utf8')));
fs.writeFileSync(path.join(root,'dist/layout.json'),JSON.stringify(full.layout));
fs.writeFileSync(path.join(root,'dist/modern-layout.json'),JSON.stringify(modern.layout));
fs.writeFileSync(path.join(root,'dist/equal-layout.json'),JSON.stringify(equal.layout));fs.writeFileSync(path.join(root,'dist/modern-equal-layout.json'),JSON.stringify(modernEqual.layout));
console.log(JSON.stringify({entries:full.layout.length,modernEntries:modern.layout.length,regions:regions.length,width:W,height:H}));
fs.writeFileSync(path.join(root,'dist/histories.json'),JSON.stringify({title:'Many Histories',checked:'2026-10',scope:`${histories.length} selected histories, ${ctx.data.milestones.length} contextual entries and ${ctx.data.topics.length} detailed topics. All named reference-poster topics are indexed; world history itself is not exhaustive. Full window 4500 BC–2026 AD; Modern era window 1450–2026 AD. Earlier origins are indicated and explained in the reader.`,dateConvention:'Negative historical years are BC; positive years are AD. No year zero. Approximate dates are plotting anchors. ongoing=true means the bar continues beyond the editorial cutoff, not a prediction. Selected phases and interruptions are explained in entry notes.',...ctx.data},null,2)+'\n');

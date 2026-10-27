const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context=vm.createContext({});
vm.runInContext(['data.js','additions.js','modern.js','connections-data.js','poster-data.js','regional-data.js','wiki-data.js'].map(f=>fs.readFileSync(path.join(root,'dist',f),'utf8')).join('\n')+'\nthis.data={histories:[...HISTORIES,...CONNECTION_EXTRAS,...ATLAS_TOPICS],maps:CONNECTION_MAPS,types:CONNECTION_TYPES,uncertainties:CONNECTION_UNCERTAINTIES};',context);
const {histories,maps,types,uncertainties}=context.data,byId=new Map(histories.map(h=>[h.id,h]));
const colors=new Map(histories.filter(h=>h.region).map(h=>[h.id,require('./chart-colors.cjs').color(h)]));
const regionColors={africa:'#efc475',westasia:'#d5c291',southasia:'#b5d3c8',eastasia:'#d2c1da',europe:'#c9d7b7',americas:'#accbd8',oceania:'#d8cbac'};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function wrap(text,max){const lines=[];let line='';for(const word of text.split(/\s+/)){if(line&&(line+' '+word).length>max){lines.push(line);line='';}line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
const W=228,H=94,glyphWidths=require('./font-metrics.json').widths;
const textWidth=(text,font=1)=>[...text].reduce((n,c)=>n+(glyphWidths[c]??.75),0)*font*1.03;
const routed=JSON.parse(fs.readFileSync(path.join(root,'scripts/connection-routes.json'),'utf8'));
const diagnostics=[],markup=[];fs.mkdirSync(path.join(root,'dist/maps'),{recursive:true});
for(const map of maps){
 const nodes=new Map(map.nodes.map(n=>[n.id,{...n,w:W,h:H}]));
 const out=[],layout={id:map.id,width:map.width,height:map.height,nodes:[],edges:[]};
 out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${map.width} ${map.height}" width="${map.width}" height="${map.height}" role="group" aria-labelledby="map-title-${map.id} map-desc-${map.id}"><title id="map-title-${map.id}">${escape(map.title)}</title><desc id="map-desc-${map.id}">Selected, sourced connections. Arrows label unions, divisions, conquest, independence, changes in rule, and contact. Node positions do not measure time or ancestry. ${escape(map.note||map.description||'')} Select a node for Wikipedia or an arrow for its sources.</desc><defs>`);
 for(const [id,t] of Object.entries(types))out.push(`<marker id="arrow-${map.id}-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${t.color}"/></marker>`);
 out.push(`</defs><style>text{font-family:Arial,Helvetica,sans-serif;fill:#25372c}.map-node,.map-edge{cursor:pointer;outline:none}.map-node rect{stroke:#fffdf8;stroke-width:2}.map-node:hover rect,.map-node:focus rect{stroke:#3c5441;stroke-width:3}.map-label{font-size:21px;font-weight:600;pointer-events:none}.map-date{font-size:12px;fill:#617056;pointer-events:none}.edge-line{fill:none;stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}.edge-hit{fill:none;stroke:transparent;stroke-width:36;vector-effect:non-scaling-stroke}.map-edge:hover .edge-label-bg,.map-edge:focus .edge-label-bg{stroke:#334d3c;stroke-width:2}.map-edge:hover .edge-line,.map-edge:focus .edge-line{stroke-width:4}.edge-label{font-size:15px;font-weight:500;pointer-events:none}.map-heading{font-size:47px;font-weight:700;letter-spacing:-1.2px}.map-subtitle{font-size:24px;fill:#67785a}.map-micro{font-size:13px;fill:#8a977d}.map-node.dim{opacity:.15}.map-node.hit rect{stroke:#294332;stroke-width:4}.map-node.selected rect{stroke:#294332;stroke-width:4}.map-edge.related .edge-line{stroke-width:4.5}</style><rect width="100%" height="100%" fill="#fdfcf8"/><text class="map-heading" x="${map.width/2}" y="74" text-anchor="middle">EMPIRES &amp; CONNECTIONS</text><text class="map-subtitle" x="${map.width/2}" y="117" text-anchor="middle">${escape(map.title)}</text><text class="map-micro" x="${map.width/2}" y="154" text-anchor="middle">Tap a node to read · Tap an arrow for the event and sources</text>`);
 for(const relation of map.connections){
  const type=types[relation.type],from=relation.from.map(id=>nodes.get(id)),to=relation.to.map(id=>nodes.get(id));
  if(!type||from.some(n=>!n)||to.some(n=>!n))throw Error('Invalid relationship '+relation.id);
  const routes=[];
  const line=(a,b)=>({kind:'line',a,b});
  const curve=(a,c1,c2,b)=>({kind:'curve',a,c1,c2,b});
  const center=n=>({x:n.x+W/2,y:n.y+H/2});
  const joint={x:relation.x,y:relation.y};
  if(routed[map.id]?.[relation.id]){routes.push(...routed[map.id][relation.id].routes);}
  else if(relation.sideRoute){
   const a=from[0],b=to[0],trunk=Math.max(a.x,b.x)+W+80;
   routes.push({arrow:true,segments:[line({x:a.x+W,y:center(a).y},{x:trunk,y:center(a).y}),line({x:trunk,y:center(a).y},{x:trunk,y:center(b).y}),line({x:trunk,y:center(b).y},{x:b.x+W,y:center(b).y})]});
  }else if(relation.horizontal){
   const a=from[0],b=to[0],right=b.x>a.x;
   const p={x:a.x+(right?W:0),y:center(a).y},q={x:b.x+(right?0:W),y:center(b).y};
   routes.push({arrow:true,both:relation.bidirectional,segments:[curve(p,{x:joint.x,y:p.y},{x:joint.x,y:q.y},q)]});
  }else{
   for(const n of from){
    const start=relation.fromSide==='right'?{x:n.x+W,y:center(n).y}:relation.fromSide==='left'?{x:n.x,y:center(n).y}:{x:center(n).x,y:n.y+H};
    if(relation.via){const points=[start,...relation.via,joint];routes.push({segments:points.slice(1).map((point,i)=>line(points[i],point))});}
    else if(relation.trunkY!==undefined){const bend={x:start.x+24,y:start.y};routes.push({segments:[line(start,bend),line(bend,{x:bend.x,y:relation.trunkY}),line({x:bend.x,y:relation.trunkY},{x:joint.x,y:relation.trunkY}),line({x:joint.x,y:relation.trunkY},joint)]});}
    else if(relation.trunkX!==undefined){routes.push({segments:[line(start,{x:relation.trunkX,y:start.y}),line({x:relation.trunkX,y:start.y},{x:relation.trunkX,y:joint.y}),line({x:relation.trunkX,y:joint.y},joint)]});}
    else routes.push({segments:[curve(start,{x:start.x,y:joint.y},{x:start.x,y:joint.y},joint)]});
   }
   for(const n of to){const end=relation.toSide==='left'?{x:n.x,y:center(n).y}:relation.toSide==='right'?{x:n.x+W,y:center(n).y}:{x:center(n).x,y:n.y};routes.push({arrow:true,segments:[relation.toSide?curve(joint,{x:joint.x,y:end.y},{x:end.x+(relation.toSide==='left'?-70:70),y:end.y},end):curve(joint,{x:end.x,y:joint.y},{x:end.x,y:joint.y},end)]});}
  }
  const labelLines=wrap(relation.label,38),labelW=routed[map.id]?.[relation.id]?.labelBox.w||Math.min(350,Math.max(...labelLines.map(s=>s.length))*7.5+30),labelH=routed[map.id]?.[relation.id]?.labelBox.h||labelLines.length*20+14;
  const box={x:joint.x-labelW/2,y:joint.y-labelH/2,w:labelW,h:labelH};
  const names=ids=>ids.map(id=>nodes.get(id).label||byId.get(id).shortTitle||byId.get(id).title).join(' + ');
  out.push(`<g class="map-edge" id="map-edge-${map.id}-${relation.id}" data-connection="${relation.id}" data-map="${map.id}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${escape(names(relation.from)+' to '+names(relation.to)+': '+relation.label+'. Open relationship details.')}" style="--edge-color:${type.color}"><title>${escape(type.label+': '+relation.label)}</title>`);
  for(const route of routes){
   let d='';for(const [i,s] of route.segments.entries()){if(i===0)d+=`M${s.a.x} ${s.a.y}`;d+=s.kind==='line'?`L${s.b.x} ${s.b.y}`:`C${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.b.x} ${s.b.y}`;}
   const marker=`url(#arrow-${map.id}-${relation.type})`;
   out.push(`<path class="edge-hit" d="${d}"/><path class="edge-line" stroke="${type.color}" ${['contact','context'].includes(relation.type)?'stroke-dasharray="6 6"':''} d="${d}"${route.arrow?` marker-end="${marker}"`:''}${route.both?` marker-start="${marker}"`:''}/>`);
  }
  out.push(`<rect class="edge-label-bg" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="7" fill="#fdfcf8" stroke="${type.color}" stroke-opacity=".28"/>`);
  labelLines.forEach((text,i)=>out.push(`<text class="edge-label" x="${joint.x}" y="${joint.y-(labelLines.length-1)*10+5+i*20}" text-anchor="middle">${escape(text)}</text>`));out.push('</g>');
  layout.edges.push({id:relation.id,from:relation.from,to:relation.to,box,routes});
 }
 for(const node of nodes.values()){
  const entry=byId.get(node.id);if(!entry)throw Error('Unknown map node '+node.id);
  const uncertain=uncertainties.find(note=>note.id===node.id);
  const label=node.label||entry.shortTitle||entry.title,lines=wrap(label,19),font=Math.min(lines.length===3?18:21,Math.floor((W-24)/Math.max(...lines.map(line=>textWidth(line)))));
  const dates=node.dates||(entry.dates.includes('BC')?entry.dates:entry.dates.replace(/ AD/g,''));
  const fill=colors.get(node.id)||regionColors[entry.region],lineStep=lines.length===3?22:24,baseline=node.y+H/2-(lines.length-1)*lineStep/2-4;
  if(lines.length>3)throw Error('Too many title lines '+node.id);
  out.push(`<g class="map-node" id="map-node-${map.id}-${node.id}" data-history="${node.id}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${escape(entry.title+', '+entry.dates+'. Open Wikipedia.')}" data-map="${map.id}"><title>${escape(entry.title+' · '+entry.dates)}</title><rect x="${node.x}" y="${node.y}" width="${W}" height="${H}" rx="10" fill="${fill}"/>`);
  if(uncertain)out.push(`<circle cx="${node.x+W-14}" cy="${node.y+14}" r="10" fill="#fdfcf8"/><text x="${node.x+W-14}" y="${node.y+18}" text-anchor="middle" style="font-size:12px;font-weight:700">?</text>`);
  lines.forEach((line,i)=>out.push(`<text class="map-label" style="font-size:${font}px" x="${node.x+W/2}" y="${baseline+i*lineStep}" text-anchor="middle">${escape(line)}</text>`));
  out.push(`<text class="map-date" x="${node.x+W/2}" y="${node.y+H-15}" text-anchor="middle">${escape(dates.length>35?dates.slice(0,33)+'…':dates)}</text></g>`);
  layout.nodes.push({...node,label,lines,font});
 }
 const links=map.continuations||[];
 if(links.length){
  const y=map.height-195,linkW=Math.min(680,(map.width-120)/links.length-16),total=links.length*(linkW+16)-16;
  out.push(`<text class="map-micro" x="${map.width/2}" y="${y-14}" text-anchor="middle">Continue this history on another map</text>`);
  for(const [i,link] of links.entries()){
   const x=(map.width-total)/2+i*(linkW+16),lines=wrap(link.label,Math.floor((linkW-24)/8));
   out.push(`<g class="map-continuation" id="map-jump-${map.id}-${i}" role="button" tabindex="0" data-map-target="${escape(link.map)}" data-map-history="${escape(link.history)}" aria-label="${escape(link.label)}"><rect x="${x}" y="${y}" width="${linkW}" height="70" rx="8" fill="#edf3e5" stroke="#bdcdb1"/>`);
   lines.forEach((line,j)=>out.push(`<text x="${x+linkW/2}" y="${y+36-(lines.length-1)*9+j*18}" text-anchor="middle" style="font-size:16px">${escape(line)}</text>`));out.push('</g>');
  }
 }
 const legendTypes=Object.values(types),columns=5,rows=Math.ceil(legendTypes.length/columns),legendY=map.height-37-rows*26;
 legendTypes.forEach((t,i)=>{const x=70+(i%columns)*(map.width-140)/columns,y=legendY+Math.floor(i/columns)*26;out.push(`<path d="M${x} ${y}h20" stroke="${t.color}" stroke-width="3"/><text x="${x+28}" y="${y+5}" style="font-size:14px;fill:#6b7b5e">${escape(t.label)}</text>`);});
 out.push(`<text class="map-micro" x="${map.width/2}" y="${map.height-22}" text-anchor="middle">Selected connections · Layout is not a time, territory or ancestry scale</text></svg>`);
 const svg=out.join('\n');fs.writeFileSync(path.join(root,'dist/maps',map.id+'.svg'),svg);
 markup.push(`<div id="connection-map-${map.id}" class="connection-map" hidden>${svg}</div>`);diagnostics.push(layout);
}
fs.writeFileSync(path.join(root,'dist/connections-fragment.html'),markup.join('\n'));
fs.writeFileSync(path.join(root,'dist/connections-layout.json'),JSON.stringify(diagnostics));
console.log(JSON.stringify({maps:maps.length,nodes:diagnostics.reduce((n,m)=>n+m.nodes.length,0),relationships:diagnostics.reduce((n,m)=>n+m.edges.length,0)}));

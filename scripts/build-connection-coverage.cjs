const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),root=path.resolve(__dirname,'..');
const context=vm.createContext({});
vm.runInContext(['data.js','additions.js','modern.js','connections-data.js','poster-data.js'].map(file=>fs.readFileSync(path.join(root,'dist',file),'utf8')).join('\n')+';this.d={histories:HISTORIES,maps:CONNECTION_MAPS,uncertainties:CONNECTION_UNCERTAINTIES};',context);
const {histories,maps,uncertainties}=context.d,relationships=maps.flatMap(map=>map.connections.map(edge=>({...edge,map:map.id})));
const entries=histories.map(h=>{
 const chapters=maps.filter(m=>m.nodes.some(n=>n.id===h.id)),edges=relationships.filter(e=>e.from.includes(h.id)||e.to.includes(h.id)),reason=uncertainties.find(note=>note.id===h.id);
 return {id:h.id,title:h.title,region:h.region,maps:chapters.map(m=>m.id),relationships:edges.map(e=>e.id),relationshipTypes:[...new Set(edges.map(e=>e.type))],status:edges.length?(edges.every(e=>e.type==='context')?'context':'linked'):reason?'explained':'unmapped',...reason?{reason:reason.reason,sources:reason.sources}:{}};
});
const totals={timelineHistories:entries.length,represented:entries.filter(e=>e.maps.length).length,linked:entries.filter(e=>e.status==='linked').length,contextOnly:entries.filter(e=>e.status==='context').length,explained:entries.filter(e=>e.status==='explained').length,unmapped:entries.filter(e=>e.status==='unmapped').length,maps:maps.length,relationships:relationships.length};
const coverage={scope:'Coverage against the current atlas timeline, not every event or relationship in world history. A linked entry may have selected contacts or context relationships rather than direct political succession. Archaeological uncertainty is retained explicitly.',totals,entries};
fs.writeFileSync(path.join(root,'dist/connection-coverage.json'),JSON.stringify(coverage,null,2)+'\n');
fs.writeFileSync(path.join(root,'dist/connection-coverage.js'),'// A transparent audit against the atlas timeline.\nconst CONNECTION_COVERAGE='+JSON.stringify(coverage)+';\n');
console.log(JSON.stringify({connectionCoverage:totals}));

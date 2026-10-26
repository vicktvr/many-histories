const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const spec=require('./connections-spec.cjs');
(async()=>{
const extras=spec.extras.map(h=>({...h,graphOnly:true,sources:[...h.sources,'wikipedia_'+h.id]}));
const sources=Object.fromEntries(Object.entries(spec.sources).map(([id,source])=>['connection_'+id,source]));
const maps=[],routes={};
for(const original of spec.networks){
 const m=original.autoLayout?await require('./layout-connections.cjs')(original):{...original,height:Math.max(original.height,...original.nodes.map(n=>n.y+234+(original.continuations?.length?130:0)))};
 routes[m.id]=Object.fromEntries(m.connections.filter(e=>e.layoutRoutes).map(e=>[e.id,{routes:e.layoutRoutes,labelBox:e.labelBox}]));
 maps.push({...m,connections:m.connections.map(({layoutRoutes,labelBox,...edge})=>edge)});
}
fs.writeFileSync(path.join(root,'scripts/connection-routes.json'),JSON.stringify(routes));
const js='// Selected, sourced historical relationships; positions are not a time scale.\nconst CONNECTION_TYPES='+JSON.stringify(spec.types)+';\nconst CONNECTION_MAPS='+JSON.stringify(maps)+';\nconst CONNECTION_EXTRAS='+JSON.stringify(extras)+';\nconst CONNECTION_UNCERTAINTIES='+JSON.stringify(spec.unconnected||[])+';\nObject.assign(SOURCES,'+JSON.stringify(sources)+');\n';
fs.writeFileSync(path.join(root,'dist/connections-data.js'),js);
console.log(JSON.stringify({maps:maps.length,relationships:maps.reduce((n,m)=>n+m.connections.length,0),mapOnlyNodes:extras.length}));

})().catch(error=>{console.error(error);process.exitCode=1;});

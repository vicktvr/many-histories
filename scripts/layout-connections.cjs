// Offline build-time layout. Event cards are graph nodes so Graphviz routes
// around both history blocks and arrow labels; the published app needs no WASM.
const {instance}=require('@viz-js/viz');
const W=228,H=94;
function wrap(text,max=38){const lines=[];let line='';for(const word of text.split(/\s+/)){if(line&&(line+' '+word).length>max){lines.push(line);line='';}line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
function labelBox(label){const lines=wrap(label);return {lines,w:Math.min(380,Math.max(...lines.map(s=>s.length))*7.5+30),h:lines.length*20+14};}
let engine;
module.exports=async function layoutMap(map){
 engine??=await instance();
 const nodeKeys=new Map(map.nodes.map((n,i)=>[n.id,'n'+i]));
 const events=map.connections.map((edge,i)=>({...edge,key:'e'+i,box:labelBox(edge.label)}));
 const graph={name:map.id,directed:true,graphAttributes:{rankdir:'TB',ranksep:1.05,nodesep:.65,pad:0,splines:'spline',newrank:true,outputorder:'edgesfirst'},nodeAttributes:{shape:'box',fixedsize:true,width:W/72,height:H/72,label:'',margin:0},edgeAttributes:{arrowhead:'none',arrowtail:'none'},nodes:[...map.nodes.map(n=>({name:nodeKeys.get(n.id)})),...events.map(e=>({name:e.key,attributes:{width:e.box.w/72,height:e.box.h/72}}))],edges:[]};
 for(const e of events){
  for(const [i,id] of e.from.entries()){if(!nodeKeys.has(id))throw Error('Unknown layout endpoint '+id);graph.edges.push({tail:nodeKeys.get(id),head:e.key,attributes:{id:e.key+'-from-'+i,...e.constraint===false?{constraint:false}:{}}});}
  for(const [i,id] of e.to.entries()){if(!nodeKeys.has(id))throw Error('Unknown layout endpoint '+id);graph.edges.push({tail:e.key,head:nodeKeys.get(id),attributes:{id:e.key+'-to-'+i,...e.constraint===false?{constraint:false}:{}}});}
 }
 const data=engine.renderJSON(graph,{yInvert:true}),objects=new Map(data.objects.map(o=>[o.name,o]));
 const bounds=data.bb.split(',').map(Number),graphW=Math.abs(bounds[2]-bounds[0]),graphH=Math.abs(bounds[3]-bounds[1]);
 const width=Math.max(1600,Math.ceil(graphW+120)),left=(width-graphW)/2,top=220;
 const p=point=>({x:+(point[0]+left).toFixed(3),y:+(point[1]+top).toFixed(3)});
 const nodes=map.nodes.map(n=>{const pos=objects.get(nodeKeys.get(n.id)).pos.split(',').map(Number);return {...n,x:pos[0]+left-W/2,y:pos[1]+top-H/2};});
 const connections=events.map(e=>{
  const pos=objects.get(e.key).pos.split(',').map(Number),routes=[];
  for(const side of ['from','to'])for(let i=0;i<e[side].length;i++){
   const edge=data.edges.find(edge=>edge.id===e.key+'-'+side+'-'+i);if(!edge)throw Error('Missing Graphviz route '+e.id);
   const segments=[];
   for(const draw of edge._draw_||[])if(draw.op==='b'){
    const points=draw.points.map(p);for(let j=1;j+2<points.length;j+=3)segments.push({kind:'curve',a:points[j-1],c1:points[j],c2:points[j+1],b:points[j+2]});
   }else if(draw.op==='L'){
    const points=draw.points.map(p);for(let j=1;j<points.length;j++)segments.push({kind:'line',a:points[j-1],b:points[j]});
   }
   if(!segments.length)throw Error('Empty Graphviz route '+e.id);
   routes.push({arrow:side==='to',both:side==='from'&&!!e.bidirectional,segments});
  }
  const {key,box,...clean}=e;return {...clean,x:pos[0]+left,y:pos[1]+top,layoutRoutes:routes,labelBox:{w:box.w,h:box.h}};
 });
 return {...map,width,height:Math.ceil(top+graphH+(map.continuations?.length?330:190)),nodes,connections};
};

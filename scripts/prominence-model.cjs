// Editorial display weights, not a historical measurement or a value judgement.
const source=require('./prominence-profiles.json');
const tiers={context:{label:'Context frame',weight:.7},local:{label:'Focused history',weight:1},regional:{label:'Regional reach',weight:2},major:{label:'Broad reach and influence',weight:4},landmark:{label:'Extensive reach and influence',weight:8}};
const ratings=Object.fromEntries(source.ratings.map(r=>[r.id,r]));
const phases=source.phases||{};
function weightAt(id,year){
 const rating=ratings[id];if(!rating)throw Error('Missing prominence review '+id);
 const phase=(phases[id]||[]).find(p=>year>=p.start&&year<p.end);
 return tiers[rating.tier].weight*(phase?.multiplier??1);
}
module.exports={tiers,ratings,phases,weightAt,source};

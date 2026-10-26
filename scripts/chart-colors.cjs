const colors=require('./base-colors.json');
const palettes={africa:['#efb34c','#87c5ae','#ef9479','#b8cf7a','#f2d27b','#8ebfd1','#dbadca','#e6ac5c','#91c399','#e8a4a1'],westasia:['#e9c56b','#eab18d','#e1ce82','#9bc6b5','#86b5c2'],southasia:['#9ac9c8','#c0ca82','#8db5cd','#b5c98a'],eastasia:['#efc675','#e99e9b','#8fc5ae','#a8c6d9','#d4b7d4','#f0bf7a'],europe:['#edbc75','#b7d08f','#ee9792','#c4afd1','#92c4bd'],americas:['#92bccd','#efc16f','#a9cd9b','#d2aed0','#98c8b1','#eba395','#b3c2de'],oceania:['#d7c69e','#99c6ba','#b4c9a3','#e7bb8c']};
const color=h=>colors[h.id]||palettes[h.region][[...h.id].reduce((n,c)=>n*31+c.charCodeAt(0)>>>0,0)%palettes[h.region].length];
module.exports={color,palettes};

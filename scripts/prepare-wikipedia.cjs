const fs=require('fs'),path=require('path'),vm=require('node:vm'),root=path.resolve(__dirname,'..');
const titles={egypt:'Ancient Egypt',nubia:'Nubia',nok:'Nok culture',jenne:'Djenné-Djenno',ghana:'Ghana Empire',aksum:'Kingdom of Aksum',zimbabwe:'Great Zimbabwe',benin:'Kingdom of Benin',mali:'Mali Empire',songhai:'Songhai Empire',uruk:'Uruk',akkad:'Akkadian Empire',persia:'Achaemenid Empire',abbasid:'Abbasid Caliphate',ottoman:'Ottoman Empire',indus:'Indus Valley Civilisation',maurya:'Maurya Empire',gupta:'Gupta Empire',mughal:'Mughal Empire',han:'Han dynasty',tang:'Tang dynasty',angkor:'Angkor',song:'Song dynasty',joseon:'Joseon',edo:'Edo period',minoan:'Minoan civilization',greece:'Classical Greece',rome:'Roman Empire',byzantium:'Byzantine Empire',carolingian:'Carolingian Empire',caral:'Caral',olmec:'Olmecs',teotihuacan:'Teotihuacan',maya:'Maya civilization',cahokia:'Cahokia',mexica:'Aztec Empire',inca:'Inca Empire',australia:'Aboriginal Australians',lapita:'Lapita culture',nanmadol:'Nan Madol',maori:'Māori people',mesop:'Early Dynastic Period (Mesopotamia)',oldbab:'First Babylonian dynasty',kassite:'Kassite dynasty',assyria:'Neo-Assyrian Empire',vedic:'Vedic period',liangzhu:'Archaeological ruins of Liangzhu City',shang:'Shang dynasty',zhou:'Zhou dynasty',archaic:'Archaic Greece'};
for(const row of JSON.parse(fs.readFileSync(path.join(root,'scripts/additions.json'),'utf8')))titles[row[0]]=row[10];
for(const entry of JSON.parse(fs.readFileSync(path.join(root,'scripts/modern.json'),'utf8')))titles[entry.id]=entry.wikiTitle;
const milestones=[
 ['writing','Early writing','c. 3400–3200 BCE','History of writing','Mesopotamia and other independent traditions',-3400],
 ['buddhism','Origins of Buddhism','c. 5th century BCE','History of Buddhism','South Asia',-500],
 ['christianity','Early Christianity','1st century CE','History of Christianity','Eastern Mediterranean',1],
 ['islam','Emergence of Islam','7th century CE','History of Islam','Arabia and neighbouring regions',600],
 ['silkroads','Silk Road exchanges','c. 2nd century BCE–15th century CE','Silk Road','Networks across Eurasia',-200],
 ['blackdeath','Black Death','1346–1353','Black Death','Eurasia and North Africa',1346],
 ['printing','Gutenberg printing','c. 1450','Printing press','Mainz · present-day Germany',1450],
 ['atlanticvoyage','Columbus’s first Atlantic voyage','1492','Voyages of Christopher Columbus','Atlantic Ocean and Caribbean',1492],
 ['colonialism','European colonial expansion','15th–20th centuries','Western European colonialism and colonization','Africa, the Americas, Asia and Oceania',1500],
 ['slavetrade','Transatlantic slave trade','c. 1500–1867','Atlantic slave trade','Africa, Atlantic islands, Europe and the Americas',1501],
 ['industry','Industrial Revolution','c. 1760–1840','Industrial Revolution','Beginning in Britain, with wider transformations',1760],
 ['americanindependence','United States independence','1776','United States Declaration of Independence','North America',1776],
 ['frenchrevolution','French Revolution','1789–1799','French Revolution','France and wider repercussions',1789],
 ['haitianrevolution','Haitian Revolution','1791–1804','Haitian Revolution','Caribbean · present-day Haiti',1791],
 ['abolition','Abolition movements','18th–19th centuries','Abolitionism','Multiple regions, with differing laws and timelines',1800],
 ['berlinconference','Berlin Conference','1884–1885','Berlin Conference','Europe and the partition of Africa',1884],
 ['worldwarone','First World War','1914–1918','World War I','Global',1914],
 ['worldwartwo','Second World War','1939–1945','World War II','Global',1939],
 ['unitednations','United Nations founded','1945','History of the United Nations','Global',1945],
 ['decolonisation','Decolonisation after 1945','Mid–late 20th century','Decolonization','Africa, Asia, the Caribbean and the Pacific',1945],
 ['coldwar','Cold War','c. 1947–1991','Cold War','Global',1947],
 ['partition','Partition and independence of India and Pakistan','1947','Partition of India','South Asia',1947],
 ['yearofafrica','Year of Africa','1960','Year of Africa','Africa',1960],
 ['moonlanding','First crewed Moon landing','1969','Apollo 11','Earth and the Moon',1969],
 ['sovietend','Dissolution of the Soviet Union','1991','Dissolution of the Soviet Union','Eurasia',1991],
 ['southafrica','South Africa’s first universal-suffrage election','1994','1994 South African general election','Southern Africa',1994]
].map(([id,title,dates,wikiTitle,location,year])=>({id:'event-'+id,title,dates,wikiTitle,location,year,type:'Key event / development',status:'Contextual',note:'This is a selected event or development, not a complete account. The article provides context, debates and further references.'}));
milestones.push({id:'event-angloamerica',title:'Anglo-America · cultural region',dates:'Cultural region · no single founding date',wikiTitle:'Anglo-America',location:'Primarily English-speaking parts of the Americas',year:1607,type:'Cultural and geographic term',status:'Contextual',note:'A variable cultural-geographic label, not a state or a single people. It often groups the United States and English-speaking Canada, and may include other places. The timeline shows political histories separately; 1607 is only an ordering anchor for this contextual entry, not a founding date for Anglo-America.'});
for(const m of milestones)titles[m.id]=m.wikiTitle;
const related=JSON.parse(fs.readFileSync(path.join(root,'scripts/related-readings.json'),'utf8'));
const historyCount=Object.keys(titles).length-milestones.length;
for(const article of related)titles[article.id]=article.wikiTitle;
const connections=require('./connections-spec.cjs');
for(const node of connections.extras)titles[node.id]=node.wikiTitle;
const poster=JSON.parse(fs.readFileSync(path.join(root,'scripts/poster-spec.json'),'utf8'));
for(const entry of [...poster.histories,...poster.topics])titles[entry.id]=entry.wikiTitle;
const regional=vm.runInNewContext(fs.readFileSync(path.join(root,'dist/regional-data.js'),'utf8')+';REGIONAL_ENTRIES',{SOURCES:{}});
for(const entry of regional)titles[entry.id]=entry.wikiTitle;
fs.writeFileSync(path.join(root,'scripts/wiki-specs.json'),JSON.stringify({titles,milestones,related},null,2));
console.log(JSON.stringify({histories:historyCount,milestones:milestones.length,related:related.length}));

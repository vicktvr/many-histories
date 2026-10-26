// Rebuild from the shipped sources; existing validated Wikipedia articles are reused.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const nodeScripts=[
 'expand-coverage.cjs','modern-coverage.cjs','prepare-connections.cjs',
 'prepare-poster.cjs','build-connection-coverage.cjs','prepare-regional.cjs',
 'prepare-wikipedia.cjs'
];
const commands=nodeScripts.map(file=>[process.execPath,['scripts/'+file]]);
commands.push([process.platform==='win32'?'python':'python3',['scripts/fetch-wikipedia.py']]);
for(const file of ['prepare-regional.cjs','build-connections.cjs','build-chart.cjs'])commands.push([process.execPath,['scripts/'+file]]);
for(const [command,args] of commands){
 const result=spawnSync(command,args,{cwd:root,stdio:'inherit'});
 if(result.error){console.error(result.error.message);process.exit(1);}
 if(result.status!==0)process.exit(result.status||1);
}

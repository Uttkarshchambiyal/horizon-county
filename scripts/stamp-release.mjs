// Give the entire local ESM graph one release key, so stale modules cannot mix.
import fs from 'node:fs';
import path from 'node:path';
const release=process.argv[2];if(!release||!/^[a-z0-9-]+$/.test(release))throw Error('Supply a simple release ID');
const root=path.resolve(import.meta.dirname,'../dist'),seen=new Set();
function visit(name){
  if(seen.has(name))return;seen.add(name);const file=path.join(root,name);let source=fs.readFileSync(file,'utf8');
  source=source.replace(/from (['"])(\.\/[^'"?]+\.js)(?:\?[^'"]*)?\1/g,(all,quote,target)=>{if(target.includes('/vendor/'))return all;visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),target)));return 'from '+quote+target+'?v='+release+quote;});fs.writeFileSync(file,source);
}
visit('game.js');const html=path.join(root,'index.html');fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace(/src="game\.js(?:\?[^\"]*)?"/,'src="game.js?v='+release+'"'));console.log('Stamped '+seen.size+' game modules: '+release);

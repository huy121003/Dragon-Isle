const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),temp=path.join(root,'.tmp-e2e');
fs.rmSync(temp,{recursive:true,force:true});fs.mkdirSync(temp,{recursive:true});
for(const name of ['dragons.json','game.json'])fs.copyFileSync(path.join(root,'data',name),path.join(temp,name));
process.env.DRAGON_ISLE_DATA_DIR=temp;
process.argv.push('--host','127.0.0.1','--port','4173');
require('../server.cjs');

/* SERVER BOOTSTRAP: CLI config only; routing lives under server/. */
const path=require('node:path');
const {createApp,createHttpServer}=require('./server/app.cjs');

const root=__dirname;
const dataDir=path.resolve(process.env.DRAGON_ISLE_DATA_DIR||path.join(root,'data'));
const args=process.argv.slice(2);
function option(name,fallback){const at=args.indexOf(name);return at>=0?args[at+1]:fallback;}
const host=option('--host','127.0.0.1'),port=Number(option('--port','8080'));
const secureCookies=args.includes('--secure-cookies');

if(!Number.isInteger(port)||port<1||port>65535){
  console.error('Port không hợp lệ.');process.exit(1);
}
async function start(){
  const app=await createApp({root,dataDir,secureCookies});
  const server=createHttpServer(app);
  server.listen(port,host,()=>console.log('Dragon Isle: http://'+host+':'+port));
}
start().catch(error=>{console.error(error);process.exitCode=1;});

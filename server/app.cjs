const http=require('node:http');
const path=require('node:path');
const {createAuth}=require('./auth.cjs');
const {createArena}=require('./arena.cjs');
const {createChallenge}=require('./challenge.cjs');
const {sameOrigin,json,handleError}=require('./http.cjs');
const {createLoginRateLimit}=require('./rate-limit.cjs');
const {createArenaRoutes}=require('./routes/arena.cjs');
const {createChallengeRoutes}=require('./routes/challenge.cjs');
const {createAuthRoutes}=require('./routes/auth.cjs');
const {createSaveRoutes}=require('./routes/save.cjs');
const {createAdminRoutes}=require('./routes/admin.cjs');
const {createStaticHandler}=require('./static.cjs');

async function createApp({root,dataDir,contentDir=path.join(root,'data'),secureCookies=false}){
  const profilesDir=path.join(dataDir,'profiles');
  const auth=await createAuth(dataDir);
  const arena=createArena({profilesDir,dataDir,catalogDir:contentDir,auth});
  const challenge=createChallenge({auth,profilesDir,arena});
  const limited=createLoginRateLimit();
  const routes=[
    createArenaRoutes({auth,arena}),
    createChallengeRoutes({auth,challenge}),
    createAuthRoutes({auth,challenge,secureCookies,limited}),
    createAdminRoutes({auth,challenge,profilesDir}),
    createSaveRoutes({auth,profilesDir})
  ];
  const serveStatic=createStaticHandler({root,dataDir:contentDir});
  const handler=async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname.startsWith('/api/')){
        if(!sameOrigin(req)){json(res,403,{error:'Yêu cầu khác nguồn bị từ chối.'});return;}
        for(const route of routes)if(await route(req,res,pathname))return;
        json(res,404,{error:'Đường dẫn API không tồn tại.'});return;
      }
      await serveStatic(req,res,pathname);
    }catch(error){await handleError(res,error);}
  };
  return {handler,auth,arena,challenge,profilesDir};
}
function createHttpServer(app){return http.createServer(app.handler);}
module.exports={createApp,createHttpServer};

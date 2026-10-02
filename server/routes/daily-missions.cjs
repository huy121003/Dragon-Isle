const path=require('node:path');
const {json}=require('../http.cjs');
const {readJson,updateJson}=require('../store.cjs');
const missions=require('../daily-missions.cjs');

function createDailyMissionRoutes({auth,profilesDir}){
  return async function handle(req,res,pathname){
    if(!pathname.startsWith('/api/daily-missions'))return false;
    const user=auth.current(req);
    if(!user){json(res,401,{error:'Cần đăng nhập.'});return true;}
    const file=path.join(profilesDir,user.id+'.json');
    if(pathname==='/api/daily-missions'&&req.method==='GET'){
      const profile=await readJson(file,null);
      let daily=missions.ensureState(profile?.dailyMissions);
      if(profile)await updateJson(file,current=>{
        daily=missions.ensureState(current?.dailyMissions);
        return {...current,dailyMissions:daily};
      });
      json(res,200,{...daily,nextResetAt:missions.nextResetAt()});return true;
    }
    if(pathname==='/api/daily-missions/claim'&&req.method==='POST'){
      const body=await require('../http.cjs').readBody(req,2048);
      if(!body||typeof body.id!=='string'){json(res,400,{error:'Invalid mission ID.'});return true;}
      let result,revision=0;
      try{
        await updateJson(file,current=>{
          if(!current)throw Object.assign(new Error('Profile not found.'),{status:404});
          if(!auth.current(req))throw Object.assign(new Error('Session expired.'),{status:401});
          result=missions.claim(current,body.id);
          revision=Math.max(0,Math.floor(Number(current.serverRevision)||0))+1;
          return {...result.profile,serverRevision:revision,savedAt:Date.now()};
        });
      }catch(error){
        if(error.status){json(res,error.status,{error:error.message,code:error.code});return true;}
        throw error;
      }
      const profile={...result.profile,dailyMissions:{...result.profile.dailyMissions,nextResetAt:missions.nextResetAt()}};
      json(res,200,{ok:true,profile,reward:result.reward,serverRevision:revision},
        {'X-Dragon-Save-Revision':String(revision)});return true;
    }
    json(res,404,{error:'Daily mission endpoint not found.'});return true;
  };
}
module.exports={createDailyMissionRoutes};

const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {Readable}=require('node:stream');
const {createDailyMissionRoutes}=require('../server/routes/daily-missions.cjs');
const {createSaveRoutes}=require('../server/routes/save.cjs');
const {newProfile}=require('../server/profile.cjs');
const {readJson,writeJson}=require('../server/store.cjs');
const missions=require('../server/daily-missions.cjs');

async function main(){
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'dragon-daily-'));
  try{
    const profileDirectory=path.join(directory,'profiles'),id='daily-test-player';
    const profile=newProfile();profile.serverRevision=3;
    const cave={id:99,type:'cave',x:200,y:200,level:1,stored:false,
      breeding:{fatherId:2,motherId:2,fatherSpecies:'fire',motherSpecies:'fire',result:'fire',readyAt:1}};
    profile.buildings.push(cave);
    profile.dailyMissions=missions.emptyState();
    await writeJson(path.join(profileDirectory,id+'.json'),profile);
    const auth={current:()=>({id})};
    const dailyRoute=createDailyMissionRoutes({auth,profilesDir:profileDirectory});
    const saveRoute=createSaveRoutes({auth,profilesDir:profileDirectory});
    async function call(route,method,url,value){
      const req=Readable.from(value===undefined?[]:[Buffer.from(JSON.stringify(value))]);
      req.method=method;req.url=url;req.headers={'x-dragon-account':id,
        ...(value===undefined?{}:{'content-type':'application/json'})};
      let status,headers={},payload='';
      const res={writeHead(code,fields){status=code;headers=fields;},end(body){payload=body||'';}};
      await route(req,res,new URL(url,'http://localhost').pathname);
      return {status,headers,body:payload?JSON.parse(payload):null};
    }
    const transition=JSON.parse(JSON.stringify(profile));
    transition.buildings.find(b=>b.id===99).breeding=null;
    transition.eggs.push({id:100,species:'fire',source:'breed',caveId:99,hatcheryId:3,startedAt:1,readyAt:2});
    transition.dailyMissions={dayKey:'forged',progress:{hatch:100000,breed:100000,arena:100000},claimed:[]};
    transition.savedAt=Date.now();
    const saved=await call(saveRoute,'PUT','/api/save',transition);
    assert.equal(saved.status,200);
    assert.equal(saved.body.dailyMissions.progress.breed,1,'Server infers the bred egg from saved state');
    assert.equal(saved.body.dailyMissions.progress.hatch,0,'Client supplied mission values are ignored');
    const claim=await call(dailyRoute,'POST','/api/daily-missions/claim',{id:'breed'});
    assert.equal(claim.status,200);
    assert.equal(claim.body.profile.gold,profile.gold+500);
    assert.equal(claim.body.profile.food,profile.food+250);
    assert.equal(claim.body.profile.dailyMissions.claimed.includes('breed'),true);
    const duplicate=await call(dailyRoute,'POST','/api/daily-missions/claim',{id:'breed'});
    assert.equal(duplicate.status,409,'Server rejects a second claim');
    const stored=await readJson(path.join(profileDirectory,id+'.json'),null);
    assert.equal(stored.serverRevision,5,'Claim advances the server save revision');
    assert.equal(stored.player.xp,35,'Claimed XP is persisted by the server');
    console.log('PASS server-owned mission progress, reset state and one-time rewards');
  }finally{await fs.rm(directory,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

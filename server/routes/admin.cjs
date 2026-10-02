const path=require('node:path');
const {json,readBody}=require('../http.cjs');
const {readJson,updateJson,removeJson}=require('../store.cjs');
const {newProfile}=require('../profile.cjs');
const {validResourcePatch}=require('../validation.cjs');

function createAdminRoutes({auth,challenge,profilesDir}){
  return async function handle(req,res,pathname){
    if(!pathname.startsWith('/api/admin/'))return false;
    const operator=auth.current(req);
    if(!operator){json(res,401,{error:'Cần đăng nhập.'});return true;}
    if(operator.role!=='admin'){json(res,403,{error:'Cần quyền quản trị.'});return true;}
    if(pathname==='/api/admin/users'&&req.method==='GET'){
      const users=await Promise.all(auth.listUsers().map(async user=>{
        const profile=await readJson(path.join(profilesDir,user.id+'.json'),null);
        return {...user,progress:profile?{level:profile.player?.level||1,dragons:profile.dragons?.length||0,
          gold:profile.gold||0,food:profile.food||0,gems:profile.gems||0,
          discovered:profile.discovered?.length||0,savedAt:profile.savedAt||0}:null};
      }));
      json(res,200,{users});return true;
    }
    const resourceUser=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/resources$/);
    if((resourceUser||pathname==='/api/admin/resources')&&req.method==='PUT'){
      const patch=await readBody(req,4096);
      if(!validResourcePatch(patch)){json(res,400,{error:'Chỉ nhận gold, food, gems dạng số nguyên không âm trong giới hạn.'});return true;}
      const targets=resourceUser?auth.listUsers().filter(user=>user.id===resourceUser[1]):auth.listUsers();
      if(!targets.length){json(res,404,{error:'Không tìm thấy tài khoản.'});return true;}
      await auth.withRevokedUsers(targets.map(user=>user.id),()=>Promise.all(targets.map(user=>
        updateJson(path.join(profilesDir,user.id+'.json'),current=>({...current||newProfile(),...patch})))));
      json(res,200,{ok:true,updated:targets.length,relogin:targets.some(user=>user.id===operator.id)});return true;
    }
    const action=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/(reset|disable|enable)$/);
    if(action&&req.method==='POST'){
      const user=auth.listUsers().find(item=>item.id===action[1]);
      if(!user||user.role==='admin'){json(res,400,{error:'Không thể thao tác tài khoản quản trị.'});return true;}
      if(action[2]==='reset')await auth.withRevokedUsers([user.id],()=>removeJson(path.join(profilesDir,user.id+'.json')));
      else{
        await auth.setDisabled(user.id,action[2]==='disable');
        if(action[2]==='disable')await challenge.leave(user);
      }
      json(res,200,{ok:true});return true;
    }
    json(res,404,{error:'Chức năng quản trị không tồn tại.'});return true;
  };
}
module.exports={createAdminRoutes};

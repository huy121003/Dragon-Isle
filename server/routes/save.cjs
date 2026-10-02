const path=require('node:path');
const {json,readBody,unauthorized}=require('../http.cjs');
const {readJson,updateJson}=require('../store.cjs');
const {validSave}=require('../validation.cjs');
const systemConfig=require('../../js/config/system.js');
function createSaveRoutes({auth,profilesDir}){
  return async function handle(req,res,pathname){
    if(pathname!=='/api/save'||!['GET','PUT'].includes(req.method))return false;
    const user=auth.current(req);
    if(!user){json(res,401,{error:'Phiên đăng nhập đã hết hạn.'});return true;}
    if(req.headers['x-dragon-account']!==user.id){
      json(res,409,{error:'Tài khoản trong tab đã thay đổi. Hãy tải lại trang.'});return true;
    }
    const file=path.join(profilesDir,user.id+'.json');
    if(req.method==='GET'){
      const profile=await readJson(file,null),revision=Math.max(0,Math.floor(Number(profile?.serverRevision)||0));
      json(res,200,profile,{'X-Dragon-Save-Revision':String(revision)});return true;
    }
    const header=req.headers['x-dragon-save-revision'],expected=header==null?null:Number(header);
    if(expected!=null&&(!Number.isSafeInteger(expected)||expected<0)){
      json(res,400,{error:'Phiên bản bản lưu không hợp lệ.',code:'SAVE_REVISION_INVALID'});return true;
    }
    const value=await readBody(req,systemConfig.save.maxBytes);
    if(!validSave(value)){json(res,400,{error:'Bản lưu không hợp lệ.'});return true;}
    let nextRevision=0;
    try{
      await updateJson(file,current=>{
        if(!auth.current(req))unauthorized();
        const revision=Math.max(0,Math.floor(Number(current?.serverRevision)||0));
        if(expected!=null&&revision!==expected){
          const error=new Error('Tiến trình đã thay đổi trên thiết bị khác. Hãy tải lại để lấy bản mới nhất.');
          error.status=409;error.code='SAVE_CONFLICT';error.serverRevision=revision;throw error;
        }
        const bank=current?.arenaBank||{gold:0,food:0,gems:0},claimed=value.arenaClaimed||{gold:0,food:0,gems:0};
        nextRevision=revision+1;
        return {...value,...Object.fromEntries(['gold','food','gems'].map(key=>[
          key,Math.max(0,(Number(value[key])||0)+Math.max(0,(bank[key]||0)-(Number(claimed[key])||0)))])),
          arenaBank:bank,arenaClaimed:bank,serverRevision:nextRevision,savedAt:Date.now()};
      });
    }catch(error){
      if(error.code==='SAVE_CONFLICT'){
        json(res,409,{error:error.message,code:error.code,serverRevision:error.serverRevision});return true;
      }
      throw error;
    }
    json(res,200,{ok:true,serverRevision:nextRevision},{'X-Dragon-Save-Revision':String(nextRevision)});
    return true;
  };
}
module.exports={createSaveRoutes};

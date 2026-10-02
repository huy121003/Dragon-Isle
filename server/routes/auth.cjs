const {json,readBody}=require('../http.cjs');
const {CredentialsSchema,parse}=require('../validation.cjs');
function createAuthRoutes({auth,challenge,secureCookies,limited}){
  return async function handle(req,res,pathname){
    if(pathname==='/api/auth/me'&&req.method==='GET'){
      const user=auth.current(req);json(res,user?200:401,user?{user}:{error:'Chưa đăng nhập.'});return true;
    }
    if((pathname==='/api/auth/register'||pathname==='/api/auth/login')&&req.method==='POST'){
      if(limited(req)){json(res,429,{error:'Thử quá nhiều lần. Vui lòng chờ 15 phút.'});return true;}
      const data=parse(CredentialsSchema,await readBody(req,4096),'Dữ liệu đăng nhập không hợp lệ.');
      const result=pathname.endsWith('/register')?await auth.register(data.username,data.password):
        await auth.login(data.username,data.password);
      if(result.error)json(res,result.status,{error:result.error});
      else json(res,200,{user:result.user},{'Set-Cookie':auth.cookie(result.token,secureCookies)});
      return true;
    }
    if(pathname==='/api/auth/logout'&&req.method==='POST'){
      const user=auth.current(req);await auth.logout(req);
      if(user&&!auth.hasActiveSession(user.id))await challenge.leave(user);
      json(res,200,{ok:true},{'Set-Cookie':'dragon_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+
        (secureCookies?'; Secure':'')});return true;
    }
    return false;
  };
}
module.exports={createAuthRoutes};

const {json,readBody}=require('../http.cjs');
function createChallengeRoutes({auth,challenge}){
  return async function handle(req,res,pathname){
    if(!pathname.startsWith('/api/challenge/'))return false;
    const user=auth.current(req);
    if(!user){json(res,401,{error:'Cần đăng nhập.'});return true;}
    if(pathname==='/api/challenge/status'&&req.method==='GET')json(res,200,await challenge.status(user));
    else if(pathname==='/api/challenge/availability'&&req.method==='PUT'){
      const body=await readBody(req,256);
      if(typeof body?.enabled!=='boolean')json(res,400,{error:'Trạng thái không hợp lệ.'});
      else{
        await auth.setChallengeEnabled(user.id,body.enabled);
        if(!body.enabled)await challenge.leave(user);
        json(res,200,{enabled:body.enabled});
      }
    }else if(pathname==='/api/challenge/invite'&&req.method==='POST')
      json(res,200,await challenge.invite(user,(await readBody(req,256))?.opponentId));
    else if(pathname==='/api/challenge/respond'&&req.method==='POST'){
      const body=await readBody(req,256);
      if(typeof body?.accept!=='boolean')json(res,400,{error:'Phản hồi không hợp lệ.'});
      else json(res,200,await challenge.respond(user,body.accept));
    }else if(pathname==='/api/challenge/select'&&req.method==='POST')
      json(res,200,await challenge.select(user,(await readBody(req,256))?.ids));
    else if(pathname==='/api/challenge/turn'&&req.method==='POST')
      json(res,200,await challenge.turn(user,await readBody(req,512)));
    else if(pathname==='/api/challenge/leave'&&req.method==='POST')json(res,200,await challenge.leave(user));
    else json(res,404,{error:'Đường dẫn thách đấu không tồn tại.'});
    return true;
  };
}
module.exports={createChallengeRoutes};

const {json,readBody}=require('../http.cjs');
const {ChallengeAvailabilitySchema,ChallengeRespondSchema,ChallengeInviteSchema,ChallengeSelectSchema,parse}=require('../validation.cjs');
function createChallengeRoutes({auth,challenge}){
  return async function handle(req,res,pathname){
    if(!pathname.startsWith('/api/challenge/'))return false;
    const user=auth.current(req);
    if(!user){json(res,401,{error:'Cần đăng nhập.'});return true;}
    if(pathname==='/api/challenge/status'&&req.method==='GET')json(res,200,await challenge.status(user));
    else if(pathname==='/api/challenge/availability'&&req.method==='PUT'){
      const body=parse(ChallengeAvailabilitySchema,await readBody(req,256),'Trạng thái không hợp lệ.');
      await auth.setChallengeEnabled(user.id,body.enabled);
      if(!body.enabled)await challenge.leave(user);
      json(res,200,{enabled:body.enabled});
    }else if(pathname==='/api/challenge/invite'&&req.method==='POST'){
      const body=parse(ChallengeInviteSchema,await readBody(req,256),'Đối thủ không hợp lệ.');
      json(res,200,await challenge.invite(user,body.opponentId));
    }
    else if(pathname==='/api/challenge/respond'&&req.method==='POST'){
      const body=parse(ChallengeRespondSchema,await readBody(req,256),'Phản hồi không hợp lệ.');
      json(res,200,await challenge.respond(user,body.accept));
    }else if(pathname==='/api/challenge/select'&&req.method==='POST'){
      const body=parse(ChallengeSelectSchema,await readBody(req,256),'Đội hình không hợp lệ.');
      json(res,200,await challenge.select(user,body.ids));
    }
    else if(pathname==='/api/challenge/turn'&&req.method==='POST')
      json(res,200,await challenge.turn(user,await readBody(req,512)));
    else if(pathname==='/api/challenge/leave'&&req.method==='POST')json(res,200,await challenge.leave(user));
    else json(res,404,{error:'Đường dẫn thách đấu không tồn tại.'});
    return true;
  };
}
module.exports={createChallengeRoutes};

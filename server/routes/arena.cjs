const {json,readBody}=require('../http.cjs');
function createArenaRoutes({auth,arena}){
  return async function handle(req,res,pathname){
    if(!pathname.startsWith('/api/arena/'))return false;
    const user=auth.current(req);
    if(!user){json(res,401,{error:'Cần đăng nhập.'});return true;}
    if(pathname==='/api/arena/list'&&req.method==='GET')json(res,200,await arena.list(user));
    else if(pathname==='/api/arena/team'&&req.method==='PUT')json(res,200,await arena.team(user,await readBody(req,2048)));
    else if(pathname==='/api/arena/fight'&&req.method==='POST')json(res,200,await arena.challenge(user,await readBody(req,2048)));
    else if(pathname==='/api/arena/turn'&&req.method==='POST')json(res,200,await arena.turn(user,await readBody(req,2048)));
    else json(res,404,{error:'Đường dẫn đấu trường không tồn tại.'});
    return true;
  };
}
module.exports={createArenaRoutes};

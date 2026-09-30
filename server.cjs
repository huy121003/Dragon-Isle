/* SERVER: Tài khoản và bản lưu riêng; chỉ dữ liệu rồng/cấu hình được phục vụ công khai. */
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createAuth}=require('./server/auth.cjs');
const {readJson,updateJson,removeJson}=require('./server/store.cjs');
const {newProfile}=require('./server/profile.cjs');
const {createArena}=require('./server/arena.cjs');
const root=__dirname,dataDir=process.env.DRAGON_ISLE_DATA_DIR||path.join(root,'data');
const profilesDir=path.join(dataDir,'profiles');
const args=process.argv.slice(2);
function option(name,fallback){const at=args.indexOf(name);return at>=0?args[at+1]:fallback;}
const host=option('--host','127.0.0.1'),port=Number(option('--port','8080'));
const secureCookies=args.includes('--secure-cookies');
if(!Number.isInteger(port)||port<1||port>65535){console.error('Port không hợp lệ.');process.exit(1);}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
function reply(res,status,body,type,headers={}){
  res.writeHead(status,Object.assign({'Content-Type':type||'text/plain; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},headers));res.end(body);
}
function json(res,status,value,headers){reply(res,status,JSON.stringify(value),'application/json; charset=utf-8',headers);}
async function readBody(req,max){
  const chunks=[];let size=0;
  for await(const part of req){size+=part.length;if(size>max){const error=new Error('Dữ liệu quá lớn');error.status=413;throw error;}chunks.push(part);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function sameOrigin(req){
  const origin=req.headers.origin;
  if(!origin)return true;
  try{const from=new URL(origin);return ['http:','https:'].includes(from.protocol)&&from.host===req.headers.host;}
  catch(error){return false;}
}
function validSave(value){return value&&typeof value==='object'&&!Array.isArray(value)&&
  Number.isInteger(value.version)&&value.version>=1&&value.version<=11&&
  Array.isArray(value.dragons)&&Array.isArray(value.buildings)&&Array.isArray(value.land)&&
  Array.isArray(value.eggs)&&Number.isFinite(value.savedAt)&&value.savedAt>0;}
/* ADMIN: Cho phép đặt số dư chính xác, nhận 0 và từ chối số âm/số lẻ/giá trị quá lớn. */
const resourceLimits={gold:1_000_000_000_000,food:1_000_000_000,gems:1_000_000_000};
function validResourcePatch(value){
  return value&&typeof value==='object'&&!Array.isArray(value)&&
    Object.keys(value).length>0&&Object.keys(value).every(key=>
      Object.hasOwn(resourceLimits,key)&&Number.isSafeInteger(value[key])&&
      value[key]>=0&&value[key]<=resourceLimits[key]);
}
function unauthorized(){const error=new Error('Phiên đăng nhập đã hết hạn.');error.status=401;throw error;}
const attempts=new Map();
function limited(req){
  const ip=req.socket.remoteAddress||'local',now=Date.now();
  const prior=attempts.get(ip)||{count:0,until:now+15*60_000};
  if(prior.until<now){prior.count=0;prior.until=now+15*60_000;}
  prior.count++;attempts.set(ip,prior);
  if(attempts.size>2000)for(const [key,item] of attempts)if(item.until<now)attempts.delete(key);
  return prior.count>30;
}
async function start(){
  const auth=await createAuth(dataDir);
  const arena=createArena({profilesDir,dataDir,auth});
  const server=http.createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname.startsWith('/api/')){
        if(!sameOrigin(req)){json(res,403,{error:'Yêu cầu khác nguồn bị từ chối.'});return;}
        if(pathname.startsWith('/api/arena/')){
          const user=auth.current(req);
          if(!user){json(res,401,{error:'Cần đăng nhập.'});return;}
          if(pathname==='/api/arena/list'&&req.method==='GET'){
            json(res,200,await arena.list(user));return;
          }
          if(pathname==='/api/arena/team'&&req.method==='PUT'){
            json(res,200,await arena.team(user,await readBody(req,2048)));return;
          }
          if(pathname==='/api/arena/fight'&&req.method==='POST'){
            json(res,200,await arena.challenge(user,await readBody(req,2048)));return;
          }
          if(pathname==='/api/arena/turn'&&req.method==='POST'){
            json(res,200,await arena.turn(user,await readBody(req,2048)));return;
          }
          json(res,404,{error:'Đường dẫn đấu trường không tồn tại.'});return;
        }
        if(pathname==='/api/auth/me'&&req.method==='GET'){
          const user=auth.current(req);json(res,user?200:401,user?{user}:{error:'Chưa đăng nhập.'});return;
        }
        /* ADMIN: Chỉ tài khoản đầu tiên (role admin) xem/quản lý hồ sơ người chơi. */
        if(pathname.startsWith('/api/admin/')){
          const operator=auth.current(req);
          if(!operator){json(res,401,{error:'Cần đăng nhập.'});return;}
          if(operator.role!=='admin'){json(res,403,{error:'Cần quyền quản trị.'});return;}
          if(pathname==='/api/admin/users'&&req.method==='GET'){
            const users=await Promise.all(auth.listUsers().map(async user=>{
              const profile=await readJson(path.join(profilesDir,user.id+'.json'),null);
              return {...user,progress:profile?{level:profile.player?.level||1,
                dragons:profile.dragons?.length||0,gold:profile.gold||0,
                food:profile.food||0,gems:profile.gems||0,
                discovered:profile.discovered?.length||0,savedAt:profile.savedAt||0}:null};
            }));
            json(res,200,{users});return;
          }
          /* ADMIN: Thu hồi phiên rồi cập nhật từng hồ sơ trong cùng hàng đợi với autosave. */
          const resourceUser=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/resources$/);
          if((resourceUser||pathname==='/api/admin/resources')&&req.method==='PUT'){
            const patch=await readBody(req,4096);
            if(!validResourcePatch(patch)){
              json(res,400,{error:'Chỉ nhận gold, food, gems dạng số nguyên không âm trong giới hạn.'});return;
            }
            const targets=resourceUser?auth.listUsers().filter(user=>user.id===resourceUser[1]):auth.listUsers();
            if(!targets.length){json(res,404,{error:'Không tìm thấy tài khoản.'});return;}
            await auth.withRevokedUsers(targets.map(user=>user.id),()=>Promise.all(targets.map(user=>
              updateJson(path.join(profilesDir,user.id+'.json'),current=>{
                const profile=current||newProfile();
                return {...profile,...patch,savedAt:Date.now()};
              }))));
            json(res,200,{ok:true,updated:targets.length,relogin:targets.some(user=>user.id===operator.id)});return;
          }
          const action=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/(reset|disable|enable)$/);
          if(action&&req.method==='POST'){
            const user=auth.listUsers().find(item=>item.id===action[1]);
            if(!user||user.role==='admin'){json(res,400,{error:'Không thể thao tác tài khoản quản trị.'});return;}
            if(action[2]==='reset'){
              await auth.withRevokedUsers([user.id],()=>removeJson(path.join(profilesDir,user.id+'.json')));
            }else await auth.setDisabled(user.id,action[2]==='disable');
            json(res,200,{ok:true});return;
          }
          json(res,404,{error:'Chức năng quản trị không tồn tại.'});return;
        }
        if((pathname==='/api/auth/register'||pathname==='/api/auth/login')&&req.method==='POST'){
          if(limited(req)){json(res,429,{error:'Thử quá nhiều lần. Vui lòng chờ 15 phút.'});return;}
          const data=await readBody(req,4096);
          if(!data||typeof data!=='object'){json(res,400,{error:'Dữ liệu đăng nhập không hợp lệ.'});return;}
          const result=pathname.endsWith('/register')?await auth.register(data.username,data.password):
            await auth.login(data.username,data.password);
          if(result.error){json(res,result.status,{error:result.error});return;}
          json(res,200,{user:result.user},{'Set-Cookie':auth.cookie(result.token,secureCookies)});return;
        }
        if(pathname==='/api/auth/logout'&&req.method==='POST'){
          await auth.logout(req);
          json(res,200,{ok:true},{'Set-Cookie':'dragon_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(secureCookies?'; Secure':'')});return;
        }
        if(pathname==='/api/save'&&(req.method==='GET'||req.method==='PUT')){
          const user=auth.current(req);
          if(!user){json(res,401,{error:'Phiên đăng nhập đã hết hạn.'});return;}
          if(req.headers['x-dragon-account']!==user.id){
            json(res,409,{error:'Tài khoản trong tab đã thay đổi. Hãy tải lại trang.'});return;
          }
          const file=path.join(profilesDir,user.id+'.json');
          if(req.method==='GET'){json(res,200,await readJson(file,null));return;}
          const value=await readBody(req,12_000_000);
          if(!validSave(value)){json(res,400,{error:'Bản lưu không hợp lệ.'});return;}
          await updateJson(file,current=>{
            if(!auth.current(req))unauthorized();
            const bank=current?.arenaBank||{gold:0,food:0,gems:0};
            const claimed=value.arenaClaimed||{gold:0,food:0,gems:0};
            return {...value,...Object.fromEntries(['gold','food','gems'].map(key=>[
              key,Math.max(0,(Number(value[key])||0)+Math.max(0,(bank[key]||0)-(Number(claimed[key])||0)))])),
              arenaBank:bank,arenaClaimed:bank};
          });json(res,200,{ok:true});return;
        }
        json(res,404,{error:'Đường dẫn API không tồn tại.'});return;
      }
      if(req.method!=='GET'&&req.method!=='HEAD'){reply(res,405,'Phương thức không hỗ trợ.');return;}
      if(pathname==='/js/data/db-cache.js'){
        const [dragons,game]=await Promise.all(['dragons.json','game.json'].map(name=>
          fs.readFile(path.join(dataDir,name),'utf8').then(JSON.parse)));
        const source='/* DATA: Bản cập nhật trực tiếp từ JSON. */\nwindow.DragonDatabase='+
          JSON.stringify(dragons)+';\nwindow.GameDatabase='+JSON.stringify(game)+';\n';
        reply(res,200,source,'text/javascript; charset=utf-8');return;
      }
      if(pathname.startsWith('/data/')&&!['/data/dragons.json','/data/game.json','/data/economy.js'].includes(pathname)||
        pathname.startsWith('/tests/')||pathname.startsWith('/scripts/')||
        pathname.startsWith('/server/')||pathname==='/server.cjs'){
        reply(res,403,'Không được truy cập.');return;
      }
      /* STATIC: React build ở dist; Canvas engine và catalog JSON vẫn dùng đường dẫn công khai cũ. */
      const publicPath=pathname==='/'||pathname==='/index.html'?
        path.join(root,'dist','index.html'):
        pathname.startsWith('/assets/')?path.resolve(root,'dist','.'+pathname):
          path.resolve(root,'.'+pathname);
      const filename=publicPath;
      const dist=path.join(root,'dist');
      if(!filename.startsWith(root+path.sep)||
        (pathname.startsWith('/assets/')&&!filename.startsWith(dist+path.sep))||
        pathname.startsWith('/src/')||pathname.startsWith('/node_modules/')||
        pathname.startsWith('/dist/')||pathname==='/package.json'||pathname==='/package-lock.json'||
        pathname==='/vite.config.mjs'){
        reply(res,403,'Đường dẫn không hợp lệ.');return;
      }
      const body=await fs.readFile(filename);
      reply(res,200,req.method==='HEAD'?'':body,types[path.extname(filename)]||'application/octet-stream');
    }catch(error){
      if(error.code==='ENOENT')reply(res,404,'Không tìm thấy tệp.');
      else if(error instanceof SyntaxError)json(res,400,{error:'JSON không hợp lệ.'});
      else if(error.status)json(res,error.status,{error:error.message});
      else{console.error(error);json(res,500,{error:'Lỗi máy chủ.'});}
    }
  });
  server.listen(port,host,()=>console.log('Dragon Isle: http://'+host+':'+port));
}
start().catch(error=>{console.error(error);process.exitCode=1;});

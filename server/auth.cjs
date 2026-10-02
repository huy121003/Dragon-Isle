/* AUTH: Tài khoản băm scrypt, phiên đăng nhập lưu dạng SHA-256 và cookie HttpOnly. */
const path=require('node:path');
const {randomBytes,randomUUID,scrypt,timingSafeEqual,createHash}=require('node:crypto');
const {promisify}=require('node:util');
const {readJson,writeJson}=require('./store.cjs');
const systemConfig=require('../js/config/system.js');
const derive=promisify(scrypt);
const authConfig=systemConfig.auth;
/** Store only a one-way digest of session tokens on disk. */
function digest(token){return createHash('sha256').update(token).digest('hex');}
/** Validate username syntax and configured length bounds. */
function validUsername(value){return typeof value==='string'&&value.length>=authConfig.usernameMin&&
  value.length<=authConfig.usernameMax&&/^[A-Za-z0-9_]+$/.test(value);}
/** Validate configured password character and byte-length bounds. */
function validPassword(value){return typeof value==='string'&&value.length>=authConfig.passwordMin&&
  value.length<=authConfig.passwordMax&&Buffer.byteLength(value)<=authConfig.passwordMaxBytes;}
/** Build the HttpOnly session cookie using the shared session lifetime. */
function cookie(token,secure){return 'dragon_session='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+
  Math.floor(authConfig.sessionAgeMs/1000)+(secure?'; Secure':'');}
/**
 * Create the persistent authentication service.
 * User/session mutations are serialized to avoid lost updates between requests.
 */
async function createAuth(dataDir){
  const usersPath=path.join(dataDir,'users.json'),sessionsPath=path.join(dataDir,'sessions.json');
  let users=await readJson(usersPath,[]),sessions=await readJson(sessionsPath,[]);
  if(!Array.isArray(users)||!Array.isArray(sessions))throw new Error('Invalid account store');
  /* AUTH: Kho từ bản trước chưa has role; chỉ người used đầu tiên được cấp quản trị. */
  if(users.length&&!users.some(user=>user.role==='admin')){
    users[0].role='admin';await writeJson(usersPath,users);
  }
  let mutation=Promise.resolve();
  function locked(action){
    const next=mutation.catch(()=>{}).then(action);mutation=next;return next;
  }
  async function issue(user){
    const token=randomBytes(32).toString('base64url');
    sessions=sessions.filter(s=>s.expires>Date.now());
    sessions.push({digest:digest(token),userId:user.id,expires:Date.now()+authConfig.sessionAgeMs});
    await writeJson(sessionsPath,sessions);
    return {user:{id:user.id,username:user.username,role:user.role||'player'},token};
  }
  return {
    async register(username,password){
      if(!validUsername(username)||!validPassword(password))return {error:'Username must be '+authConfig.usernameMin+'–'+authConfig.usernameMax+
        ' letters, numbers or underscores; password must be '+authConfig.passwordMin+'–'+authConfig.passwordMax+' characters.',status:400};
      const salt=randomBytes(16).toString('hex');
      const hash=(await derive(password,salt,64)).toString('hex');
      return locked(async()=>{
        if(users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return {error:'Username is already taken.',status:409};
        const user={id:randomUUID(),username,salt,hash,role:users.length?'player':'admin',
          disabled:false,challengeEnabled:true,createdAt:Date.now()};
        const next=users.concat(user);
        await writeJson(usersPath,next);users=next;
        return issue(user);
      });
    },
    async login(username,password){
      if(!validUsername(username)||typeof password!=='string'||Buffer.byteLength(password)>authConfig.passwordMaxBytes)return {error:'Incorrect username or password.',status:401};
      const user=users.find(u=>u.username.toLowerCase()===username.toLowerCase());
      if(!user||user.disabled)return {error:'Incorrect username or password.',status:401};
      const candidate=await derive(password,user.salt,64),expected=Buffer.from(user.hash,'hex');
      if(expected.length!==candidate.length||!timingSafeEqual(candidate,expected))return {error:'Incorrect username or password.',status:401};
      return locked(()=>issue(user));
    },
    current(req){
      const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('dragon_session='));
      const token=raw&&raw.slice('dragon_session='.length);
      if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
      const session=sessions.find(s=>s.digest===digest(token)&&s.expires>Date.now());
      if(!session)return null;
      const user=users.find(u=>u.id===session.userId);
      return user&&!user.disabled?{id:user.id,username:user.username,role:user.role||'player',
        challengeEnabled:user.challengeEnabled!==false}:null;
    },
    async logout(req){
      const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('dragon_session='));
      const token=raw&&raw.slice('dragon_session='.length);
      if(!token)return;
      await locked(async()=>{
        sessions=sessions.filter(s=>s.digest!==digest(token));
        await writeJson(sessionsPath,sessions);
      });
    },
    listUsers(){return users.map(({id,username,role,disabled,challengeEnabled,createdAt})=>
      ({id,username,role:role||'player',disabled:!!disabled,
        challengeEnabled:challengeEnabled!==false,createdAt}));},
    hasActiveSession(userId){return sessions.some(s=>s.userId===userId&&s.expires>Date.now());},
    async setChallengeEnabled(userId,enabled){
      return locked(async()=>{
        const next=users.map(user=>user.id===userId?{...user,challengeEnabled:enabled}:user);
        await writeJson(usersPath,next);users=next;
        return next.find(user=>user.id===userId)?.challengeEnabled;
      });
    },
    async revokeUser(userId){
      await locked(async()=>{
        sessions=sessions.filter(s=>s.userId!==userId);
        await writeJson(sessionsPath,sessions);
      });
    },
    async withRevokedUsers(userIds,action){
      const targets=new Set(userIds);
      return locked(async()=>{
        sessions=sessions.filter(s=>!targets.has(s.userId));
        await writeJson(sessionsPath,sessions);
        return action();
      });
    },
    async setDisabled(userId,disabled){
      return locked(async()=>{
        const user=users.find(item=>item.id===userId);
        if(!user||user.role==='admin')return false;
        const next=users.map(item=>item.id===userId?{...item,disabled}:item);
        await writeJson(usersPath,next);users=next;
        if(disabled){sessions=sessions.filter(s=>s.userId!==userId);await writeJson(sessionsPath,sessions);}
        return true;
      });
    },
    cookie
  };
}
module.exports={createAuth};

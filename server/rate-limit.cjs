const rateLimitConfig=require('../js/config/system.js').loginRateLimit;
function createLoginRateLimit({limit=rateLimitConfig.limit,windowMs=rateLimitConfig.windowMs,
  maxEntries=rateLimitConfig.maxEntries}={}){
  const attempts=new Map();
  return function limited(req){
    const ip=req.socket.remoteAddress||'local',now=Date.now();
    const prior=attempts.get(ip)||{count:0,until:now+windowMs};
    if(prior.until<now){prior.count=0;prior.until=now+windowMs;}
    prior.count++;attempts.set(ip,prior);
    if(attempts.size>maxEntries)for(const [key,item] of attempts)if(item.until<now)attempts.delete(key);
    return prior.count>limit;
  };
}
module.exports={createLoginRateLimit};

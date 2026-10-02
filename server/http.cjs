const fs=require('node:fs/promises');
function reply(res,status,body,type,headers={}){
  res.writeHead(status,Object.assign({'Content-Type':type||'text/plain; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},headers));res.end(body);
}
function json(res,status,value,headers){reply(res,status,JSON.stringify(value),'application/json; charset=utf-8',headers);}
async function readBody(req,max){
  const chunks=[];let size=0;
  for await(const part of req){
    size+=part.length;
    if(size>max){const error=new Error('Dữ liệu quá lớn');error.status=413;throw error;}
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function sameOrigin(req){
  const origin=req.headers.origin;if(!origin)return true;
  try{const from=new URL(origin);return ['http:','https:'].includes(from.protocol)&&from.host===req.headers.host;}
  catch(error){return false;}
}
function unauthorized(){const error=new Error('Phiên đăng nhập đã hết hạn.');error.status=401;throw error;}
async function handleError(res,error){
  if(error.code==='ENOENT')reply(res,404,'Không tìm thấy tệp.');
  else if(error instanceof SyntaxError)json(res,400,{error:'JSON không hợp lệ.'});
  else if(error.status)json(res,error.status,{error:error.message,code:error.code,serverRevision:error.serverRevision});
  else{console.error(error);json(res,500,{error:'Lỗi máy chủ.'});}
}
module.exports={reply,json,readBody,sameOrigin,unauthorized,handleError};

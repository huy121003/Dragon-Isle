/* SAVE: Ghi JSON nguyên tử theo từng tệp, tránh ghi chồng khi nhiều người chơi cùng lưu. */
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const queues=new Map();
async function readJson(file,fallback){
  try{return JSON.parse(await fs.readFile(file,'utf8'));}
  catch(error){if(error.code==='ENOENT')return fallback;throw error;}
}
function enqueue(file,action){
  const previous=queues.get(file)||Promise.resolve();
  const work=previous.catch(()=>{}).then(action);
  queues.set(file,work);
  work.finally(()=>{if(queues.get(file)===work)queues.delete(file);}).catch(()=>{});
  return work;
}
async function atomicWrite(file,value){
  await fs.mkdir(path.dirname(file),{recursive:true});
  const temporary=file+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';
  try{
    await fs.writeFile(temporary,JSON.stringify(value,null,2)+'\n',{encoding:'utf8',mode:0o600});
    await fs.rename(temporary,file);
  }catch(error){await fs.rm(temporary,{force:true}).catch(()=>{});throw error;}
}
function writeJson(file,value){return enqueue(file,()=>atomicWrite(file,value));}
/* SAVE: Sửa hồ sơ trong cùng hàng đợi ghi, không ghi đè bản lưu vừa hoàn tất. */
function updateJson(file,updater){
  return enqueue(file,async()=>{
    const current=await readJson(file,null);
    const next=await updater(current);
    await atomicWrite(file,next);
    return next;
  });
}
/* SAVE: Xóa hồ sơ sau các bản ghi đang chờ, để lệnh reset quản trị has thứ tự. */
function removeJson(file){return enqueue(file,()=>fs.rm(file,{force:true}));}
module.exports={readJson,writeJson,updateJson,removeJson};

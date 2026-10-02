/* SAVE: Ghi JSON nguyên tử theo từng tệp, tránh ghi chồng khi nhiều người chơi cùng lưu. */
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const queues=new Map();
/** Read JSON from disk; return fallback only when the file does not exist. */
async function readJson(file,fallback){
  try{return JSON.parse(await fs.readFile(file,'utf8'));}
  catch(error){if(error.code==='ENOENT')return fallback;throw error;}
}
/** Serialize mutations per file so concurrent requests cannot overwrite newer state. */
function enqueue(file,action){
  const previous=queues.get(file)||Promise.resolve();
  const work=previous.catch(()=>{}).then(action);
  queues.set(file,work);
  work.finally(()=>{if(queues.get(file)===work)queues.delete(file);}).catch(()=>{});
  return work;
}
/** Persist JSON through a private temporary file and atomic rename. */
async function atomicWrite(file,value){
  await fs.mkdir(path.dirname(file),{recursive:true});
  const temporary=file+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';
  try{
    await fs.writeFile(temporary,JSON.stringify(value,null,2)+'\n',{encoding:'utf8',mode:0o600});
    await fs.rename(temporary,file);
  }catch(error){await fs.rm(temporary,{force:true}).catch(()=>{});throw error;}
}
/** Queue an atomic full replacement for one JSON file. */
function writeJson(file,value){return enqueue(file,()=>atomicWrite(file,value));}
/** Queue a read-modify-write transaction on one JSON file. */
function updateJson(file,updater){
  return enqueue(file,async()=>{
    const current=await readJson(file,null);
    const next=await updater(current);
    await atomicWrite(file,next);
    return next;
  });
}
/** Queue deletion after earlier writes so admin reset preserves operation ordering. */
function removeJson(file){return enqueue(file,()=>fs.rm(file,{force:true}));}
module.exports={readJson,writeJson,updateJson,removeJson};

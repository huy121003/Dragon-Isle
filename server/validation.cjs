function validSave(value){
  return value&&typeof value==='object'&&!Array.isArray(value)&&
    Number.isInteger(value.version)&&value.version>=1&&value.version<=12&&
    Array.isArray(value.dragons)&&Array.isArray(value.buildings)&&Array.isArray(value.land)&&
    Array.isArray(value.eggs)&&Number.isFinite(value.savedAt)&&value.savedAt>0;
}
const resourceLimits={gold:1_000_000_000_000,food:1_000_000_000,gems:1_000_000_000};
function validResourcePatch(value){
  return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length>0&&
    Object.keys(value).every(key=>Object.hasOwn(resourceLimits,key)&&Number.isSafeInteger(value[key])&&
      value[key]>=0&&value[key]<=resourceLimits[key]);
}
module.exports={validSave,validResourcePatch,resourceLimits};

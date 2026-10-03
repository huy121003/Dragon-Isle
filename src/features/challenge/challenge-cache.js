/** Apply authoritative action responses without an immediate second status request. */
export function applyChallengeMutationResult(client,key,route,result){
  if(route!=='turn'||(!result?.match&&!result?.finished))return false;
  client.setQueryData(key,current=>current?{...current,match:result.match||null}:current);
  return true;
}

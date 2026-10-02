/**
 * Shared application/platform configuration.
 *
 * Keep operational timings, persistence limits and authentication limits here.
 * Gameplay balance belongs in the other domain config files.
 */
(function(root,factory){
  const config=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=config;
  if(root){root.DragonConfig=root.DragonConfig||{};root.DragonConfig.system=config;}
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  return Object.freeze({
    save:Object.freeze({
      /** Current browser/server save schema version. */
      version:12,
      /** Maximum imported/API save payload size in bytes. */
      maxBytes:12_000_000,
      /** Browser keepalive requests are only used for small snapshots. */
      keepaliveMaxBytes:50_000
    }),
    runtime:Object.freeze({
      /** Main world/UI heartbeat. */
      worldTickMs:1000,
      /** Periodic server save cadence while the page is active. */
      autosaveMs:10_000,
      /** Minimum away time before the welcome/offline-progress panel appears. */
      offlineWelcomeMs:60_000,
      /** Expensive Habitat sheet refresh cadence while that sheet is open. */
      habitatRefreshMs:5_000
    }),
    connection:Object.freeze({
      /** Delay between automatic reconnect attempts. */
      retryMs:5_000,
      /** Outage age after which the UI marks the connection as prolonged. */
      prolongedMs:120_000,
      /** Short delay before reload after the server confirms session expiry. */
      sessionExpiredReloadMs:700
    }),
    auth:Object.freeze({
      /** Login session lifetime in milliseconds. */
      sessionAgeMs:7*24*60*60*1000,
      usernameMin:3,usernameMax:24,
      passwordMin:8,passwordMax:128,passwordMaxBytes:256
    }),
    loginRateLimit:Object.freeze({
      /** Per-IP login/register attempts allowed inside one rate-limit window. */
      limit:30,windowMs:15*60*1000,maxEntries:2000
    })
  });
});

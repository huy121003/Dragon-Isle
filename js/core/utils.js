"use strict";

/**
 * Generic formatting/math helpers used across legacy gameplay modules.
 * These helpers contain no game balance parameters.
 */
const fmt = new Intl.NumberFormat("en-US");
const fmtShort = new Intl.NumberFormat("en-US",{maximumFractionDigits:1});
const fmtGold = new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
function money(n){return fmt.format(Math.floor(Math.max(0,n)));}
function goldDecimal(n){return fmtGold.format(Math.max(0,n));}
function goldPerMinute(n){return fmtShort.format(Math.max(0,n));}
function headerGold(n){
  if(n>=1000000)return fmtShort.format(n/1000000)+"m";
  if(n>=10000)return fmtShort.format(n/1000)+"k";
  return goldDecimal(n);
}
function clamp(n,min,max){return Math.min(max,Math.max(min,n));}

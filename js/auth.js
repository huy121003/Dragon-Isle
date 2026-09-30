"use strict";

/* AUTH: Mọi tài khoản đi qua server; trình duyệt chỉ giữ cookie HttpOnly, không lưu mật khẩu. */
let currentAccount=null;
let authMode="login";
const authScreen=document.getElementById("authScreen");
const authMessage=document.getElementById("authMessage");
function showAuthMessage(message){authMessage.textContent=message;}
function setAuthMode(mode){
  authMode=mode;
  document.getElementById("loginTab").className="btn"+(mode==="login"?" primary":"");
  document.getElementById("registerTab").className="btn"+(mode==="register"?" primary":"");
  document.getElementById("authSubmit").textContent=mode==="login"?"Enter island":"Create account and enter";
  document.getElementById("authPassword").autocomplete=mode==="login"?"current-password":"new-password";
  showAuthMessage("");
}
document.querySelectorAll("[data-auth-mode]").forEach(function(button){
  button.addEventListener("click",function(){setAuthMode(button.dataset.authMode);});
});
document.getElementById("authForm").addEventListener("submit",async function(event){
  event.preventDefault();
  const button=document.getElementById("authSubmit");
  button.disabled=true;showAuthMessage("Processing…");
  try{
    const response=await fetch('/api/auth/'+authMode,{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:document.getElementById("authUsername").value.trim(),
        password:document.getElementById("authPassword").value}),cache:'no-store'});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"Unable to sign in.");
    window.location.reload();
  }catch(error){showAuthMessage(error.message);button.disabled=false;}
});
async function authenticate(){
  if(!serverSaveAvailable){showAuthMessage("Start node server.cjs and open the HTTP address to sign in.");return null;}
  try{
    const response=await fetch('/api/auth/me',{cache:'no-store'});
    if(response.status===401){showAuthMessage("Sign in or create an account to start.");return null;}
    if(!response.ok)throw new Error("Cannot connect to the account server.");
    const result=await response.json();
    currentAccount=result.user;
    document.getElementById("accountName").textContent=currentAccount.username;
    return currentAccount;
  }catch(error){showAuthMessage(error.message);return null;}
}
async function logoutAccount(){
  const button=document.querySelector('[data-action="logout"]');
  if(button)button.disabled=true;
  try{
    advanceWorld(Date.now());if(!await saveGame())throw new Error("Unable to save progress. Try again later.");
    const response=await fetch('/api/auth/logout',{method:'POST',cache:'no-store'});
    if(!response.ok)throw new Error("Unable to sign out. Try again.");
    window.location.reload();
  }catch(error){toast(error.message);if(button)button.disabled=false;}
}

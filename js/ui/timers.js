"use strict";

/* UI: Thanh tiến độ chung ở đầu đảo, luôn has lối nhận kết quả hoặc hoàn tất bằng gem. */
function updateTimerBar(){
  const tasks=activeTimers(),now=Date.now(),previousScroll=dom.timers.scrollLeft;
  dom.timers.classList.toggle("visible",tasks.length>0);
  dom.stage.classList.toggle("has-timers",tasks.length>0);
  dom.timers.innerHTML=tasks.map(function(task){
    const ready=task.end<=now,percent=timerProgress(task,now),remaining=gemSkipCost(task.end,now);
    let action="";
    if(ready){
      if(task.kind==="egg"){
        action='<button class="btn good" data-action="view-ready-egg" data-id="'+task.id+'">View dragon</button>';
      }else if(task.kind==="crop")action='<button class="btn good" data-action="harvest" data-id="'+task.id+'">Harvest</button>';
      else if(task.kind==="breed")action='<button class="btn good" data-action="collect-breeding" data-id="'+task.id+'">Collect egg</button>';
    }else action='<button class="btn resource-action" data-action="skip-timer" data-kind="'+task.kind+
      '" data-id="'+task.id+'">Skip · '+resourceAmount('gems',remaining)+'</button>';
    return '<div class="timer-card"><div class="timer-top"><b>'+esc(task.label)+'</b><small>'+
      Math.floor(percent)+'%</small></div><div class="timer-track"><span style="width:'+percent+
      '%"></span></div><div class="timer-bottom"><small>'+(ready?'Ready':duration(secondsLeft(task.end)))+
      '</small>'+action+'</div></div>';
  }).join("");
  dom.timers.scrollLeft=previousScroll;
}
function inlineTimer(start,end){
  const task={startedAt:start,end:end};
  return '<div class="inline-timer"><small>'+(end<=Date.now()?'Finished':
    'Remaining: '+countdown(end))+'</small><div class="timer-track"><span style="width:'+
    timerProgress(task,Date.now())+'%"></span></div></div>';
}

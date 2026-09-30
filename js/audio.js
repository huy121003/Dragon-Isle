"use strict";

/* AUDIO: Âm ngắn tạo bằng Web Audio sau lần chạm đầu, không tải tài nguyên ngoài. */
const AUDIO = {
  context:null,
  init:function(){
    if(this.context)return;
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return;
    try{this.context=new AudioContextClass();}catch(error){this.context=null;}
  },
  play:function(name){
    if(!this.context)return;
    if(this.context.state==="suspended")this.context.resume().catch(function(){});
    const notes={click:[440,.035],place:[560,.11],coin:[880,.1],feed:[660,.08],egg:[980,.18]};
    const note=notes[name]||notes.click;
    const osc=this.context.createOscillator(),gain=this.context.createGain(),t=this.context.currentTime;
    osc.type="sine";osc.frequency.setValueAtTime(note[0],t);
    if(name==="coin")osc.frequency.exponentialRampToValueAtTime(1200,t+note[1]);
    gain.gain.setValueAtTime(.025,t);
    gain.gain.exponentialRampToValueAtTime(.001,t+note[1]);
    osc.connect(gain);gain.connect(this.context.destination);
    osc.start(t);osc.stop(t+note[1]+.01);
  }
};

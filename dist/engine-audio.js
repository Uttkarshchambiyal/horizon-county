import {clamp} from './world-data.js';

export function engineTelemetry(state,input={}){
  const speed=Math.abs(state.speed),gear=state.speed<-.1?-1:speed<.2?0:Math.min(6,1+[15,26,37,49,61].filter(v=>speed>v).length);
  const ratios=[3.1,2.18,1.63,1.28,1.03,.84],ratio=ratios[Math.max(0,gear-1)]||3.1;
  const radius=state.vehicleId==='trail'?.51:state.vehicleId==='touring'?.46:.36;
  const wheelRpm=speed/radius*60/(Math.PI*2),load=input.throttle&&!input.brake?1:.12;
  const rpm=clamp(900+wheelRpm*ratio*3.7+(input.throttle?1050:0)+(input.boost?350:0),850,8600);
  return {gear,rpm,load};
}
export function createEngineAudio(){
  const audio={ctx:null,master:null,telemetry:{gear:0,rpm:900,load:0},status:'idle'};
  let engineGain,filter,sample,sub,subGain,wind,windGain,tireGain,shiftUntil=0,lastGear=0;
  audio.start=async()=>{
    try{
      if(audio.ctx){await audio.ctx.resume();return;}
      const ctx=new(window.AudioContext||window.webkitAudioContext)();audio.ctx=ctx;
      const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=5;compressor.connect(ctx.destination);
      const master=ctx.createGain();master.gain.value=0;master.connect(compressor);audio.master=master;
      filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;filter.Q.value=.6;engineGain=ctx.createGain();engineGain.gain.value=.2;engineGain.connect(filter);filter.connect(master);
      sub=ctx.createOscillator();sub.type='triangle';subGain=ctx.createGain();subGain.gain.value=.045;sub.connect(subGain);subGain.connect(master);sub.start();
      const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=noise.getChannelData(0);let previous=0;
      for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.12)/1.12;data[i]=previous*2.6;}
      wind=ctx.createBufferSource();wind.buffer=noise;wind.loop=true;const windFilter=ctx.createBiquadFilter();windFilter.type='bandpass';windFilter.frequency.value=1000;windFilter.Q.value=.4;windGain=ctx.createGain();windGain.gain.value=0;wind.connect(windFilter);windFilter.connect(windGain);windGain.connect(master);wind.start();
      const tireFilter=ctx.createBiquadFilter();tireFilter.type='bandpass';tireFilter.frequency.value=1900;tireFilter.Q.value=2;tireGain=ctx.createGain();tireGain.gain.value=0;wind.connect(tireFilter);tireFilter.connect(tireGain);tireGain.connect(master);
      audio.status='loading';
      const response=await fetch('./assets/audio/engine-loop.wav');if(!response.ok)throw Error('Engine sample');
      const buffer=await ctx.decodeAudioData(await response.arrayBuffer());sample=ctx.createBufferSource();sample.buffer=buffer;sample.loop=true;sample.connect(engineGain);sample.start();audio.status='sample';
    }catch{audio.status='fallback';}
  };
  audio.silence=()=>{if(audio.ctx&&audio.master)audio.master.gain.setTargetAtTime(0,audio.ctx.currentTime,.025);};
  audio.update=(state,input,active,muted,dt)=>{
    const telemetry=engineTelemetry(state,input);audio.telemetry=telemetry;
    const ctx=audio.ctx;if(!ctx||!audio.master)return;
    const t=ctx.currentTime;
    if(telemetry.gear>0&&lastGear>0&&telemetry.gear!==lastGear)shiftUntil=t+.13;lastGear=telemetry.gear;
    const shifting=t<shiftUntil,targetRpm=telemetry.rpm*(shifting?.79:1),voice=state.vehicleId==='trail'?.73:state.vehicleId==='touring'?.84:1,pitch=clamp(targetRpm/2300*voice,.48,3.1);
    audio.master.gain.setTargetAtTime(active&&!muted?.24:0,t,.04);
    if(sample)sample.playbackRate.setTargetAtTime(pitch,t,.085);
    if(sub){sub.frequency.setTargetAtTime(targetRpm/60*2,t,.07);subGain.gain.setTargetAtTime(.035+telemetry.load*.04,t,.07);}
    filter?.frequency.setTargetAtTime(600+telemetry.load*1200+targetRpm*.19,t,.10);
    engineGain?.gain.setTargetAtTime((.32+telemetry.load*.34)*(shifting?.3:1),t,.05);
    windGain?.gain.setTargetAtTime(Math.min(.19,Math.abs(state.speed)**2*.000045),t,.15);
    const skid=Math.abs(state.lateralAcceleration||0)>8||input.drift;
    tireGain?.gain.setTargetAtTime(skid&&Math.abs(state.speed)>6?.22:0,t,.045);
  };
  return audio;
}

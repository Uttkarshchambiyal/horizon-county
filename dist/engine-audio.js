import {vehicleSpec} from './vehicle-data.js?v=high-speed-steering-12';
import {clamp} from './world-data.js?v=high-speed-steering-12';

export function engineTelemetry(state,input={}){
  const speed=Math.abs(state.speed),gear=state.speed<-.1?-1:speed<.2?0:Math.min(6,1+[15,26,37,49,61].filter(v=>speed>v).length);
  const ratios=[3.1,2.18,1.63,1.28,1.03,.84],ratio=ratios[Math.max(0,gear-1)]||3.1;
  const radius=vehicleSpec(state.vehicleId).radius;
  const wheelRpm=speed/radius*60/(Math.PI*2),load=input.throttle&&!input.brake?1:.12;
  const rpm=clamp(900+wheelRpm*ratio*3.7+(input.throttle?1050:0)+(input.boost?350:0),850,8600);
  return {gear,rpm,load};
}
export function createEngineAudio(){
  const audio={ctx:null,master:null,telemetry:{gear:0,rpm:900,load:0},status:'idle'};
  let engineGain,filter,sample,sub,subGain,wind,windGain,tireGain,gravelGain,shoreGain,noise,shiftUntil=0,lastGear=0,lastThrottle=false,lastBoost=false,lastActive=false;
  const effects=new Set(),cooldowns=new Map(),passing=[];
  // Short, bounded voices share the engine's limiter and master mute bus.
  audio.effect=(name,intensity=1)=>{
    const ctx=audio.ctx;if(!ctx||!audio.active||effects.size>=6)return false;
    const now=ctx.currentTime;if(now<(cooldowns.get(name)||0))return false;
    const cue={tick:[440,440],go:[880,1175],checkpoint:[659,880],reward:[523,1046],accept:[392,659],failed:[220,110]}[name];
    const duration={horn:.32,impact:.24,boost:.48,shift:.09,overrun:.12,ignition:.5,tick:.09,go:.26,checkpoint:.22,reward:.7,accept:.17,failed:.35}[name];if(!duration)return false;
    cooldowns.set(name,now+(name==='impact'?.65:name==='horn'?.4:name==='overrun'?.8:.15));
    const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),voice=name==='boost'||name==='shift'||name==='overrun'?ctx.createBufferSource():ctx.createOscillator();
    const level=Math.min(1,Math.max(.1,intensity))*({horn:.5,impact:.65,boost:.46,shift:.16,overrun:.2,ignition:.18,tick:.14,go:.18,checkpoint:.14,reward:.2,accept:.13,failed:.14}[name]);
    gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(level,now+.015);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    filter.type='lowpass';filter.frequency.setValueAtTime(cue?2400:name==='boost'?2800:name==='shift'?1600:name==='overrun'?650:1100,now);filter.frequency.exponentialRampToValueAtTime(cue?1800:180,now+duration);
    if('buffer' in voice){voice.buffer=noise;voice.loop=true;}else{voice.type=cue?'sine':name==='horn'?'sawtooth':'triangle';voice.frequency.setValueAtTime(cue?cue[0]:name==='horn'?410:name==='impact'?110:65,now);voice.frequency.exponentialRampToValueAtTime(cue?cue[1]:name==='horn'?390:name==='impact'?38:145,now+duration);}
    voice.connect(filter);filter.connect(gain);gain.connect(audio.master);effects.add(voice);voice.onended=()=>{effects.delete(voice);voice.disconnect();filter.disconnect();gain.disconnect();};voice.start(now);voice.stop(now+duration+.02);return true;
  };
  audio.start=async()=>{
    try{
      if(audio.ctx){await audio.ctx.resume();return;}
      const ctx=new(window.AudioContext||window.webkitAudioContext)();audio.ctx=ctx;
      const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=5;compressor.connect(ctx.destination);
      const master=ctx.createGain();master.gain.value=0;master.connect(compressor);audio.master=master;
      filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;filter.Q.value=.6;engineGain=ctx.createGain();engineGain.gain.value=.2;engineGain.connect(filter);filter.connect(master);
      sub=ctx.createOscillator();sub.type='triangle';subGain=ctx.createGain();subGain.gain.value=.045;sub.connect(subGain);subGain.connect(master);sub.start();
      noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noise.getChannelData(0);let previous=0;
      for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.12)/1.12;data[i]=previous*2.6;}
      wind=ctx.createBufferSource();wind.buffer=noise;wind.loop=true;const windFilter=ctx.createBiquadFilter();windFilter.type='bandpass';windFilter.frequency.value=1000;windFilter.Q.value=.4;windGain=ctx.createGain();windGain.gain.value=0;wind.connect(windFilter);windFilter.connect(windGain);windGain.connect(master);wind.start();
      const tireFilter=ctx.createBiquadFilter();tireFilter.type='bandpass';tireFilter.frequency.value=1900;tireFilter.Q.value=2;tireGain=ctx.createGain();tireGain.gain.value=0;wind.connect(tireFilter);tireFilter.connect(tireGain);tireGain.connect(master);
      const gravel=ctx.createBiquadFilter();gravel.type='lowpass';gravel.frequency.value=950;gravelGain=ctx.createGain();gravelGain.gain.value=0;wind.connect(gravel);gravel.connect(gravelGain);gravelGain.connect(master);
      const shore=ctx.createBiquadFilter();shore.type='lowpass';shore.frequency.value=480;shoreGain=ctx.createGain();shoreGain.gain.value=0;wind.connect(shore);shore.connect(shoreGain);shoreGain.connect(master);

      audio.status='loading';
      const response=await fetch('./assets/audio/engine-loop.wav');if(!response.ok)throw Error('Engine sample');
      const buffer=await ctx.decodeAudioData(await response.arrayBuffer());sample=ctx.createBufferSource();sample.buffer=buffer;sample.loop=true;sample.connect(engineGain);sample.start();
      for(let i=0;i<2;i++){const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner?.()||ctx.createGain(),low=ctx.createBiquadFilter();source.buffer=buffer;source.loop=true;low.type='lowpass';low.frequency.value=850;gain.gain.value=0;source.connect(low);low.connect(gain);gain.connect(pan);pan.connect(master);source.start();passing.push({source,gain,pan});}
      audio.status='sample';
    }catch{audio.status='fallback';}
  };
  audio.silence=()=>{audio.active=false;for(const voice of effects)try{voice.stop();}catch{}if(audio.ctx&&audio.master)audio.master.gain.setTargetAtTime(0,audio.ctx.currentTime,.025);};
  audio.update=(state,input,active,muted,dt,environment={})=>{
    const telemetry=engineTelemetry(state,input);audio.telemetry=telemetry;
    const ctx=audio.ctx;if(!ctx||!audio.master)return;
    const t=ctx.currentTime;audio.active=active&&!muted;
    if(audio.active&&!lastActive)audio.effect('ignition');lastActive=audio.active;
    if(audio.active&&input.boost&&input.throttle&&!lastBoost&&state.speed>6&&state.boost>1)audio.effect('boost');lastBoost=!!input.boost;
    if(audio.active&&lastThrottle&&!input.throttle&&telemetry.rpm>3800)audio.effect('overrun');lastThrottle=!!input.throttle;
    if(telemetry.gear>0&&lastGear>0&&telemetry.gear!==lastGear){shiftUntil=t+.13;audio.effect('shift');}lastGear=telemetry.gear;
    const shifting=t<shiftUntil,targetRpm=telemetry.rpm*(shifting?.79:1),voice=vehicleSpec(state.vehicleId).voice,pitch=clamp(targetRpm/2300*voice,.48,3.1);
    audio.master.gain.setTargetAtTime(active&&!muted?.24:0,t,.04);
    if(sample)sample.playbackRate.setTargetAtTime(pitch,t,.085);
    if(sub){sub.frequency.setTargetAtTime(targetRpm/60*2,t,.07);subGain.gain.setTargetAtTime(.035+telemetry.load*.04,t,.07);}
    filter?.frequency.setTargetAtTime(600+telemetry.load*1200+targetRpm*.19,t,.10);
    engineGain?.gain.setTargetAtTime((.32+telemetry.load*.34)*(shifting?.3:1),t,.05);
    windGain?.gain.setTargetAtTime(Math.min(.19,Math.abs(state.speed)**2*.000045),t,.15);
    const skid=Math.abs(state.lateralAcceleration||0)>8||input.drift;
    tireGain?.gain.setTargetAtTime(skid&&Math.abs(state.speed)>6?.22:0,t,.045);
    gravelGain?.gain.setTargetAtTime(environment.offRoad?Math.min(.3,Math.abs(state.speed)*.012):0,t,.1);
    shoreGain?.gain.setTargetAtTime(environment.nearShore?.035*(.7+Math.sin(t*.55)*.3):0,t,.5);
    const nearby=audio.active?(environment.traffic||[]).map(c=>({car:c,d:Math.hypot(c.x-state.x,c.z-state.z)})).filter(c=>c.d<42).sort((a,b)=>a.d-b.d).slice(0,2):[];
    passing.forEach((voice,i)=>{const item=nearby[i];voice.gain.gain.setTargetAtTime(item?(1-item.d/42)**2*.28:0,t,.12);if(!item)return;const c=item.car,dx=c.x-state.x,dz=c.z-state.z,pan=clamp((dx*Math.cos(state.heading)-dz*Math.sin(state.heading))/Math.max(1,item.d),-1,1);voice.pan.pan?.setTargetAtTime(pan,t,.08);const radial=(dx*(-Math.sin(c.heading)*c.speed+Math.sin(state.heading)*state.speed)+dz*(-Math.cos(c.heading)*c.speed+Math.cos(state.heading)*state.speed))/Math.max(1,item.d);voice.source.playbackRate.setTargetAtTime(clamp((.65+c.speed*.04)*(343/(343+radial)),.5,2.1),t,.12);});
  };
  return audio;
}

const percentile=(sorted,p)=>sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]||0;
const rounded=n=>Math.round(n*100)/100;
export function summarizeCapture(samples,metadata={}){
  if(!samples.length)return null;
  const frames=samples.map(s=>s.frameMs).sort((a,b)=>a-b),elapsed=frames.reduce((a,b)=>a+b,0),worst=frames.slice(Math.floor(frames.length*.99));
  const mean=key=>samples.reduce((sum,s)=>sum+(s[key]||0),0)/samples.length;
  const configurations=[...new Set(samples.map(s=>`${s.quality||'unknown'} / TIER ${s.tier??0} / DPR ${rounded(s.pixelRatio||1)}`))],byDistrict={};
  for(const district of new Set(samples.map(s=>s.district).filter(Boolean))){const times=samples.filter(s=>s.district===district).map(s=>s.frameMs).sort((a,b)=>a-b);byDistrict[district]={frames:times.length,fps:rounded(times.length*1000/times.reduce((a,b)=>a+b,0)),p95:rounded(percentile(times,.95))};}
  return {version:1,source:'Foreground requestAnimationFrame intervals; CPU wall time, not GPU timer queries',metadata,configurations,byDistrict,frames:frames.length,durationSeconds:rounded(elapsed/1000),fps:rounded(frames.length*1000/elapsed),frameMs:rounded(elapsed/frames.length),p50:rounded(percentile(frames,.5)),p95:rounded(percentile(frames,.95)),p99:rounded(percentile(frames,.99)),max:rounded(frames.at(-1)),onePercentLow:rounded(1000/(worst.reduce((a,b)=>a+b,0)/worst.length)),overBudget:frames.filter(ms=>ms>17.5).length,hitches:frames.filter(ms=>ms>33.34).length,stalls:frames.filter(ms=>ms>50).length,cpuMs:rounded(mean('cpuMs')),renderSubmitMs:rounded(mean('renderMs')),calls:Math.round(mean('calls')),triangles:Math.round(mean('triangles')),targetMet:frames.length*1000/elapsed>=59&&percentile(frames,.95)<=17.5};
}
export function createPerformanceCapture(duration=60){
  let samples=[],metadata={},elapsed=0,running=false,skip=true,report=null;
  const history=new Float32Array(180);let historyCount=0,historyCursor=0;
  return {get running(){return running;},get report(){return report;},get elapsed(){return elapsed/1000;},duration,history,
    get historyCount(){return Math.min(historyCount,history.length);},get historyCursor(){return historyCursor;},
    start(details){samples=[];elapsed=0;metadata={...details,startedAt:new Date().toISOString()};running=true;skip=true;report=null;},
    interrupt(){skip=true;},
    sample(sample){
      if(!Number.isFinite(sample.frameMs)||sample.frameMs<=0)return null;
      if(skip){skip=false;return null;}
      history[historyCursor]=sample.frameMs;historyCursor=(historyCursor+1)%history.length;historyCount++;
      if(!running)return null;
      samples.push({...sample});elapsed+=sample.frameMs;
      if(elapsed>=duration*1000){running=false;report=summarizeCapture(samples,{...metadata,finishedAt:new Date().toISOString(),pausesExcluded:true,firstResumeIntervalExcluded:true});samples=[];return report;}
      return null;
    },
    cancel(){running=false;samples=[];elapsed=0;},
    toJSON(){return report?JSON.stringify(report,null,2):null;}
  };
}

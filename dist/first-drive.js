const KEY='horizon-first-drive-v1';
export function createFirstDrive(storage){
  let step=0,done=false,heading=null,brakeSpeed=0;
  try{done=storage?.getItem(KEY)==='done';}catch{}
  function finish(){done=true;try{storage?.setItem(KEY,'done');}catch{}}
  return {
    get step(){return step;},get done(){return done;},
    dismiss:finish,
    restart(){step=0;done=false;heading=null;brakeSpeed=0;try{storage?.removeItem(KEY);}catch{}},
    update(state,input){
      if(done)return;
      if(step===0&&input.throttle&&state.speed>=6){step=1;heading=state.heading;}
      else if(step===1&&Math.abs(state.speed)>3&&input.steer&&Math.abs(state.heading-heading)>.16){step=2;brakeSpeed=0;}
      else if(step===2){if(input.brake)brakeSpeed=Math.max(brakeSpeed,Math.abs(state.speed));if(input.brake&&brakeSpeed>=5&&Math.abs(state.speed)<2)finish();}
    }
  };
}
export function runShareText(result,vehicle){
  if(!result?.success)return '';
  const seconds=result.elapsed.toFixed(1),medal=result.medal?result.medal.toUpperCase()+' · ':'';
  return `Horizon County — ${result.name}\n${medal}${seconds}s · ${vehicle}\nBeat your own best in this browser driving game.\nhttps://horizon-drive-coast.uttkarshchambiyal.chatgpt.site`;
}
export function trapDialogTab(event,dialog,activeElement){
  if(event.key!=='Tab'||!dialog)return false;
  const items=[...dialog.querySelectorAll('button:not([disabled]),a[href],textarea:not([disabled]),[tabindex="0"]')].filter(el=>el.getClientRects().length);
  if(!items.length)return false;
  const first=items[0],last=items[items.length-1],outside=!items.includes(activeElement);
  if(outside||event.shiftKey&&activeElement===first||!event.shiftKey&&activeElement===last){event.preventDefault();(event.shiftKey?last:first).focus();return true;}
  return false;
}
export async function waitForStartup(tasks,timeoutMs=15000){
  let timer;
  try{return await Promise.race([Promise.allSettled(tasks).then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);})]);}
  finally{clearTimeout(timer);}
}

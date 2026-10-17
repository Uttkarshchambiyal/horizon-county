import {UPGRADES} from './career.js?v=real-fleet-10';
const $=id=>document.getElementById(id);
export const money=value=>'$'+Math.floor(value).toLocaleString('en-US');
export const clock=value=>{const n=Math.max(0,value);return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0')+'.'+Math.floor(n%1*10);};
const distanceLabel=d=>d>999?(d/1000).toFixed(2)+' KM':Math.round(d)+' M';
export function createCareerUI({career,activities,planner,getState,getVehicle,startActivity,purchase,notify}){
  let route={points:[],distance:0},targetKey='',routeTime=-Infinity,routeX=Infinity,routeZ=Infinity,goUntil=0;
  const card=a=>`<button class="activity-card" id="activity-${a.id}" data-activity="${a.id}"><span>${a.district} / ${a.kind==='delivery'?'DELIVERY':'CHECKPOINT RACE'}</span><strong>${a.name}</strong><p>${a.description}</p><div><b>${money(a.reward)} BASE</b><span>${Math.round(a.limit/60*10)/10} MIN LIMIT</span></div><small>No completed run yet</small><em>${a.kind==='delivery'?'TAKE JOB':'ENTER RACE'} <span>↗</span></em></button>`;
  $('job-cards').innerHTML=activities.filter(a=>a.kind==='delivery').map(card).join('');$('race-cards').innerHTML=activities.filter(a=>a.kind==='race').map(card).join('');
  const buttons=[...document.querySelectorAll('[data-activity]')];for(const button of buttons)button.addEventListener('click',()=>startActivity(button.dataset.activity));
  $('upgrade-options').innerHTML=UPGRADES.map(u=>`<button class="upgrade-card" data-upgrade="${u.id}"></button>`).join('');
  const upgradeButtons=[...document.querySelectorAll('[data-upgrade]')];for(const button of upgradeButtons)button.addEventListener('click',()=>purchase(button.dataset.upgrade));
  function renderGarage(){
    const vehicle=getVehicle(),levels=career.levels(vehicle);$('garage-credits').textContent=money(career.profile.credits);
    for(const button of upgradeButtons){const u=UPGRADES.find(u=>u.id===button.dataset.upgrade),level=levels[u.id]||0,cost=u.costs[level],max=level===3;button.disabled=max||career.profile.credits<cost;button.innerHTML=`<span>${u.name} <b>LV ${level} / 3</b></span><small>${u.description}</small><i>${[0,1,2].map(i=>`<em class="${level>i?'installed':''}"></em>`).join('')}</i><strong>${max?'FULLY UPGRADED':money(cost)+' / INSTALL ↗'}</strong>`;button.setAttribute('aria-label',u.name+', level '+level+' of 3'+(max?', fully upgraded':', costs '+money(cost)));}
  }
  function renderBoard(){
    $('career-credits').textContent=money(career.profile.credits);$('career-completed').textContent=career.profile.completed.length+' / '+activities.length+' EVENTS COMPLETED';
    $('career-save-status').textContent=career.saveAvailable?'REWARDS & UPGRADES SAVED IN THIS BROWSER':'BROWSER STORAGE UNAVAILABLE / THIS SESSION ONLY';
    for(const button of buttons){const id=button.dataset.activity;button.disabled=!!career.active;button.querySelector('small').textContent=career.profile.bests[id]?'PERSONAL BEST / '+clock(career.profile.bests[id]):'NO COMPLETED RUN YET';}
    $('active-contract').classList.toggle('hidden',!career.active);$('active-contract-name').textContent=career.active?.definition.name||'';
    const result=career.result;$('activity-summary').classList.toggle('hidden',!result);
    if(result){$('activity-result-title').textContent=result.success?'DELIVERED. EARNED.':'ANOTHER TRY.';$('activity-result-name').textContent=result.name;$('activity-result-reward').textContent=result.success?'+'+money(result.reward):result.reason;$('activity-result-detail').textContent=result.success?clock(result.elapsed)+(result.newBest?' / PERSONAL BEST':'')+' · CLEAN BONUS '+money(result.cleanBonus)+' · TIME BONUS '+money(result.timeBonus):'No credits lost. Choose an event when you’re ready.';}
    renderGarage();
  }
  function update(force=false){
    const state=getState(),now=state.elapsed||0;
    for(const event of career.drainEvents()){
      if(event.type==='accepted')notify('JOB ACCEPTED',event.name+' / FOLLOW THE MARKED ROUTE','accept');
      else if(event.type==='collected')notify('PARCEL COLLECTED','DELIVER BEFORE THE TIMER RUNS OUT','checkpoint');
      else if(event.type==='go'){goUntil=now+1;notify(null,null,'go');}
      else if(event.type==='countdown'||event.type==='countdown-tick')notify(null,null,'tick');
      else if(event.type==='checkpoint')notify('CHECKPOINT '+event.gate+' / '+event.total,'','checkpoint');
      else if(event.type==='complete')notify('+'+money(event.reward),event.name.toUpperCase()+(event.newBest?' / PERSONAL BEST':''),'reward');
      else if(event.type==='failed')notify(event.reason.toUpperCase(),'J / CHOOSE A NEW JOB OR RACE','failed');
      else if(event.type==='recovery-penalty')notify('RETURNED TO SAFE ROAD','ACTIVE RUN / +10 SECOND PENALTY');
      else if(event.type==='restart-countdown')notify('HOLD AT THE START','STOP INSIDE THE RING FOR THE COUNTDOWN');
      renderBoard();
    }
    const active=career.active,target=career.target(),key=target?`${target.x},${target.z},${active.phase}`:'';
    if(target&&(force||key!==targetKey||now<routeTime||now-routeTime>1.2&&Math.hypot(state.x-routeX,state.z-routeZ)>15)){
      route=planner.route(state,target);routeTime=now;routeX=state.x;routeZ=state.z;targetKey=key;
    }else if(!target){route={points:[],distance:0};targetKey='';}
    $('wallet-value').textContent=money(career.profile.credits);$('objective-card').classList.toggle('is-active',!!active);$('objective-card').classList.toggle('is-result',!active&&!!career.result);
    $('objective-name').textContent=active?active.definition.name:career.result?.success?'+'+money(career.result.reward)+' / RUN COMPLETE':'JOBS & RACES';
    $('objective-instruction').textContent=active?(active.phase==='approach'?(active.definition.kind==='delivery'?'STOP IN THE PICKUP RING':'STOP AT THE START'):active.phase==='delivery'?'DELIVER / STOP IN THE RING':active.phase==='countdown'?'HOLD STILL / GET READY':'CHECKPOINT '+(active.gate+1)+' OF '+active.definition.gates.length):career.result?'OPEN THE BOARD FOR YOUR NEXT RUN':'J / EARN CREDITS. BUILD YOUR CAR.';
    $('objective-timer').textContent=active&&['delivery','race'].includes(active.phase)?clock(active.definition.limit-active.elapsed):'';
    $('objective-distance').textContent=target?distanceLabel(Number.isFinite(route.distance)?route.distance:Math.hypot(target.x-state.x,target.z-state.z)):'';
    let turn='';if(target){const next=route.points.find(p=>Math.hypot(p.x-state.x,p.z-state.z)>28)||target,bearing=Math.atan2(-(next.x-state.x),-(next.z-state.z)),delta=Math.atan2(Math.sin(bearing-state.heading),Math.cos(bearing-state.heading));turn=Math.abs(delta)<.5?'↑ CONTINUE':Math.abs(delta)>2.5?'↶ TURN AROUND':delta>0?'↰ LEFT':'↱ RIGHT';}
    $('objective-direction').textContent=turn;$('objective-progress').style.width=(active?active.phase==='race'?active.gate/active.definition.gates.length*100:active.hold/1.25*100:0)+'%';
    $('race-countdown').classList.toggle('hidden',active?.phase!=='countdown'&&now>=goUntil);$('race-countdown').textContent=active?.phase==='countdown'?String(Math.ceil(active.countdown)):'GO';
    $('mode-label').textContent=active?(active.definition.kind==='delivery'?'DELIVERY JOB':'CHECKPOINT RACE')+' / J FOR DETAILS':'FREE ROAM / J FOR JOBS';
    $('exit-button').textContent=active?'ABANDON RUN & CHOOSE A DISTRICT':'CHOOSE A STARTING DISTRICT';
    for(const button of document.querySelectorAll('[data-travel]')){button.disabled=!!active;button.title=active?'Finish or abandon the activity before fast travel':'';}
  }
  function drawRoute(ctx,mapPoint){
    if(!career.active)return;ctx.save();ctx.strokeStyle=career.active.definition.kind==='race'?'#76d8ff':'#c8ff4a';ctx.lineWidth=5;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();route.points.forEach((p,i)=>{const point=mapPoint(p.x,p.z);i?ctx.lineTo(...point):ctx.moveTo(...point);});ctx.stroke();
    const target=career.target(),p=mapPoint(target.x,target.z);ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(p[0],p[1],9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#172427';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  renderBoard();return {update,renderBoard,renderGarage,drawRoute,get route(){return route;}};
}

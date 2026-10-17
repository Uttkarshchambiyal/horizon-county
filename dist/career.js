import {VEHICLES} from './vehicle-data.js?v=axle-steering-11';
const SAVE_KEY='horizon-career-v1';
const VEHICLE_IDS=VEHICLES.map(v=>v.id);
export const UPGRADES=[
  {id:'engine',name:'Engine tune',description:'+6% acceleration per level',costs:[450,950,1700]},
  {id:'brakes',name:'Brake kit',description:'+10% stopping force per level',costs:[350,750,1350]},
  {id:'tires',name:'Sport tires',description:'+6% cornering grip per level',costs:[400,850,1500]},
  {id:'nitro',name:'Nitro system',description:'+12% recharge and +3% boost speed per level',costs:[500,1050,1850]}
];
const integer=(v,max=10000000)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export function upgradeEffects(levels={}){
  const level=id=>integer(levels[id],3);
  return {acceleration:1+level('engine')*.06,braking:1+level('brakes')*.1,grip:1+level('tires')*.06,recharge:1+level('nitro')*.12,boostSpeed:1+level('nitro')*.03};
}
export function createActivities(world){
  const point=(x,z,heading=0)=>({x,z,heading});
  const lane=(road,s)=>{const f=road.frame(s);return {x:f.x+f.nx*3.4,z:f.z+f.nz*3.4,heading:f.angle};};
  const coast=world.roads.find(r=>r.id==='coast'),ridge=world.roads.find(r=>r.id==='ridge'),beach=world.nearestRoad(world.spawns[1].x,world.spawns[1].z).s;
  return [
    {id:'downtown-dispatch',kind:'delivery',name:'Downtown dispatch',district:'DOWNTOWN',description:'Collect a coffee order on Horizon Avenue. Deliver it to the Market Street office.',pickup:point(6,450),drop:point(246,125),limit:150,reward:600},
    {id:'coast-courier',kind:'delivery',name:'Coast courier',district:'PACIFIC BEACH',description:'Pick up a surf-shop parcel on Pacific Boulevard and take it to the pier approach.',pickup:point(-714,445),drop:point(-985,326,-Math.PI/2),limit:170,reward:850},
    {id:'east-gate-express',kind:'delivery',name:'East Gate express',district:'EAST GATE',description:'Bring a workshop part from the warehouse district to East Gate Airfield.',pickup:point(486,675),drop:point(1086,-70,-Math.PI/2),limit:210,reward:1100},
    {id:'avenue-circuit',kind:'race',name:'Avenue circuit',district:'DOWNTOWN',description:'A city loop with four corners. Pass every checkpoint in order; traffic stays live.',start:point(6,485),gates:[point(6,345),point(6,95),point(6,-135),point(210,-154),point(234,80),point(234,290),point(35,314),point(6,460)],limit:130,reward:900},
    {id:'pacific-sprint',kind:'race',name:'Pacific sprint',district:'PACIFIC BEACH',description:'Follow the coast toward the north shore through ten flowing checkpoints.',start:lane(coast,beach),gates:Array.from({length:10},(_,i)=>lane(coast,beach+(i+1)*180)),limit:150,reward:1250},
    {id:'crestline-climb',kind:'race',name:'Crestline climb',district:'CRESTLINE HILLS',description:'Climb the mountain pass. Brake early for the switchbacks and keep all four wheels planted.',start:lane(ridge,130),gates:Array.from({length:10},(_,i)=>lane(ridge,130+(i+1)*175)),limit:180,reward:1500}
  ];
}
function segmentDistance(p,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);
}
export function createCareer(activities,storage){
  const profile={version:1,credits:0,earned:0,deliveries:0,races:0,bests:{},completed:[],upgrades:{}};
  let active=null,result=null,events=[],lastPosition=null,saveAvailable=!!storage;
  try{
    const raw=JSON.parse(storage?.getItem(SAVE_KEY)||'null');
    if(raw?.version===1){
      for(const k of['credits','earned','deliveries','races'])profile[k]=integer(raw[k]);
      profile.completed=activities.filter(a=>raw.completed?.includes(a.id)).map(a=>a.id);
      for(const a of activities)if(Number.isFinite(raw.bests?.[a.id])&&raw.bests[a.id]>0)profile.bests[a.id]=Math.min(86400,raw.bests[a.id]);
      for(const id of VEHICLE_IDS){profile.upgrades[id]={};for(const u of UPGRADES)profile.upgrades[id][u.id]=integer(raw.upgrades?.[id]?.[u.id],3);}
    }
  }catch{saveAvailable=false;}
  function save(){try{storage?.setItem(SAVE_KEY,JSON.stringify(profile));saveAvailable=!!storage;}catch{saveAvailable=false;}}
  function finish(success,reason=''){
    if(!active)return;
    const a=active,definition=a.definition,previous=profile.bests[definition.id],cleanBonus=success&&definition.kind==='delivery'&&a.incidents===0?100:0;
    const timeBonus=success?Math.min(150,Math.floor(Math.max(0,definition.limit-a.elapsed)/3)*5):0;
    const reward=success?definition.reward+cleanBonus+timeBonus:0;
    result={id:definition.id,name:definition.name,kind:definition.kind,success,reason,elapsed:a.elapsed,reward,base:success?definition.reward:0,cleanBonus,timeBonus,newBest:success&&(!previous||a.elapsed<previous),incidents:a.incidents};
    if(success){profile.credits+=reward;profile.earned+=reward;profile[definition.kind==='delivery'?'deliveries':'races']++;if(!profile.completed.includes(definition.id))profile.completed.push(definition.id);if(result.newBest)profile.bests[definition.id]=a.elapsed;save();}
    active=null;lastPosition=null;events.push({type:success?'complete':'failed',...result});return result;
  }
  const api={profile,get active(){return active;},get result(){return result;},get saveAvailable(){return saveAvailable;},
    start(id){
      const definition=activities.find(a=>a.id===id);if(!definition||active)return false;
      active={definition,phase:'approach',elapsed:0,hold:0,countdown:3,gate:0,incidents:0};result=null;lastPosition=null;events.push({type:'accepted',name:definition.name});return true;
    },
    target(){if(!active)return null;const a=active,d=a.definition;return d.kind==='delivery'?(a.phase==='delivery'?d.drop:d.pickup):(a.phase==='race'?d.gates[a.gate]:d.start);},
    update(dt,player){
      if(!active||!Number.isFinite(dt)||dt<=0)return;
      const a=active,d=a.definition,target=api.target(),distance=Math.hypot(player.x-target.x,player.z-target.z),stopped=Math.abs(player.speed)<1.5&&player.grounded!==false;
      if(a.phase==='approach'){
        a.hold=distance<(d.kind==='delivery'?9:12)&&stopped?a.hold+dt:0;
        if(a.hold>=1.25){a.hold=0;a.phase=d.kind==='delivery'?'delivery':'countdown';events.push({type:d.kind==='delivery'?'collected':'countdown',name:d.name});}
      }else if(a.phase==='countdown'){
        if(distance>16||!stopped){a.phase='approach';a.countdown=3;events.push({type:'restart-countdown'});}
        else{const before=Math.ceil(a.countdown);a.countdown-=dt;if(a.countdown<=0){a.phase='race';a.elapsed=0;events.push({type:'go'});}else if(Math.ceil(a.countdown)!==before)events.push({type:'countdown-tick'});}
      }else{
        a.elapsed+=dt;
        if(a.elapsed>d.limit){finish(false,'Time ran out');return;}
        if(d.kind==='delivery'){
          a.hold=distance<9&&stopped?a.hold+dt:0;if(a.hold>=1.25){finish(true);return;}
        }else{
          const radius=d.id==='avenue-circuit'?17:20,previous=lastPosition||player,moved=Math.hypot(player.x-previous.x,player.z-previous.z);
          if(player.grounded!==false&&moved<80&&segmentDistance(target,previous,player)<radius){
            a.gate++;events.push({type:'checkpoint',gate:a.gate,total:d.gates.length});
            if(a.gate===d.gates.length){finish(true);return;}
          }
        }
      }
      lastPosition={x:player.x,z:player.z};
    },
    incident(){if(active&&['delivery','race'].includes(active.phase))active.incidents++;},
    recover(){if(active){active.incidents++;if(['delivery','race'].includes(active.phase))active.elapsed+=10;else{active.hold=0;active.countdown=3;active.phase='approach';}lastPosition=null;events.push({type:'recovery-penalty'});}},
    abandon(){return finish(false,'Activity abandoned');},
    drainEvents(){const pending=events;events=[];return pending;},
    levels(vehicle){return profile.upgrades[vehicle]||{};},
    effects(vehicle){return upgradeEffects(api.levels(vehicle));},
    purchase(vehicle,upgrade){
      const item=UPGRADES.find(u=>u.id===upgrade);if(!item||!VEHICLE_IDS.includes(vehicle))return {ok:false,reason:'Unknown upgrade'};
      const levels=profile.upgrades[vehicle]||(profile.upgrades[vehicle]={}),level=integer(levels[upgrade],3),cost=item.costs[level];
      if(level>=3)return {ok:false,reason:'Already fully upgraded'};
      if(profile.credits<cost)return {ok:false,reason:'Complete jobs or races to earn more credits'};
      profile.credits-=cost;levels[upgrade]=level+1;save();return {ok:true,name:item.name,level:level+1,cost};
    }
  };return api;
}

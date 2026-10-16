import * as THREE from './vendor/three.module.min.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
export const BOUNDS={minX:-1500,maxX:1850,minZ:-2250,maxZ:1450};
export function seeded(seed=1947){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function coast(z){return -1110+65*Math.sin(z*.002)+28*Math.sin(z*.006);}
export function terrainHeight(x,z){
  const north=smooth(380,1350,-z),east=smooth(700,1500,x);
  let y=4+north*(28+125*Math.exp(-(((x-100)/620)**2+((z+1470)/580)**2))+55*Math.exp(-(((x-1150)/480)**2+((z+1450)/500)**2)));
  y+=east*(12+22*Math.sin(z*.0014)**2)+north*(8*Math.sin(x*.006)*Math.sin(z*.005));
  y*=smooth(coast(z)-40,coast(z)+160,x);
  y-=7*(1-smooth(coast(z)-90,coast(z)+30,x));
  y-=12*smooth(1120,1400,z);
  return y;
}
function makeRoad(id,name,points,width=22,kind='street',closed=false){
  const vectors=points.map(([x,z])=>new THREE.Vector3(x,0,z));
  const curve=vectors.length===2?new THREE.LineCurve3(vectors[0],vectors[1]):new THREE.CatmullRomCurve3(vectors,closed,'catmullrom',.12);
  const length=curve.getLength(),count=Math.ceil(length/5),samples=[];
  for(let i=0;i<=count;i++){
    const p=curve.getPointAt(i/count),t=curve.getTangentAt(i/count),n=Math.hypot(t.x,t.z);
    samples.push({x:p.x,z:p.z,y:terrainHeight(p.x,p.z)+.08,tx:t.x/n,tz:t.z/n,nx:-t.z/n,nz:t.x/n,s:i/count*length});
  }
  function frame(distance){
    const s=closed?((distance%length)+length)%length:clamp(distance,0,length);
    const f=s/length*count,i=Math.min(count-1,Math.floor(f)),t=f-i,a=samples[i],b=samples[i+1];
    const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,tx=a.tx+(b.tx-a.tx)*t,tz=a.tz+(b.tz-a.tz)*t;
    return {x,z,y:terrainHeight(x,z)+.08,tx,tz,nx:-tz,nz:tx,angle:Math.atan2(-tx,-tz),s};
  }
  return {id,name,width,kind,closed,length,samples,frame};
}
export function makeOpenWorld(){
  const roads=[],buildings=[],colliders=[],parkedCars=[],random=seeded();
  const xs=[-720,-480,-240,0,240,480,720],zs=[-400,-160,80,320,560,800];
  for(const x of xs)roads.push(makeRoad('avenue'+x,x===-720?'Pacific Boulevard':x===0?'Horizon Avenue':'Central Avenue',[ [x,1030],[x,-400]],x===0?30:22));
  for(const z of zs)roads.push(makeRoad('street'+z,z===320?'Marina Drive':z===-400?'Northgate Road':'Market Street',[[-980,z],[970,z]],z===320?28:22));
  roads.push(makeRoad('coast','Pacific Coast Highway',[[-760,1020],[-900,700],[-920,60],[-955,-560],[-920,-1060],[-620,-1690],[50,-1950],[870,-1890],[1480,-1410],[1520,-650],[1260,100],[1120,650],[700,1040],[0,1110]],32,'highway',true));
  roads.push(makeRoad('ridge','Crestline Pass',[[-480,-400],[-480,-620],[-230,-800],[100,-1030],[390,-1260],[780,-1350],[1080,-1110],[900,-820],[480,-650],[240,-400]],19,'mountain'));
  roads.push(makeRoad('airfield','Airfield Road',[[720,-160],[1080,-160],[1270,-360]],22));
  roads.push(makeRoad('runway','East Gate Airfield',[[1080,-355],[1080,35]],80,'airfield'));
  roads.push(makeRoad('harbor','Harbor Road',[[480,800],[480,1080],[900,1090],[1120,650]],24,'industrial'));
  roads.push(makeRoad('pier','Pier Approach',[[-720,320],[-1000,320]],20));
  const buckets=new Map(),key=(x,z)=>`${Math.floor(x/80)},${Math.floor(z/80)}`;
  function insert(map,item,minX,maxX,minZ,maxZ){for(let x=Math.floor(minX/80);x<=Math.floor(maxX/80);x++)for(let z=Math.floor(minZ/80);z<=Math.floor(maxZ/80);z++){const k=`${x},${z}`;if(!map.has(k))map.set(k,[]);map.get(k).push(item);}}
  for(const road of roads)for(let i=0;i<road.samples.length-1;i++){
    const a=road.samples[i],b=road.samples[i+1],pad=road.width/2+18;
    insert(buckets,{road,a,b},Math.min(a.x,b.x)-pad,Math.max(a.x,b.x)+pad,Math.min(a.z,b.z)-pad,Math.max(a.z,b.z)+pad);
  }
  function nearestRoad(x,z){
    let best=null,d2=Infinity;
    for(const seg of buckets.get(key(x,z))||[]){const {a,b}=seg,dx=b.x-a.x,dz=b.z-a.z;
      const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1),px=a.x+dx*t,pz=a.z+dz*t,d=(x-px)**2+(z-pz)**2;
      if(d<d2){d2=d;best={road:seg.road,x:px,z:pz,distance:Math.sqrt(d),s:a.s+(b.s-a.s)*t,angle:Math.atan2(-dx,-dz)};}
    }return best;
  }
  function addBuilding(x,z,w,d,h,type){
    const road=nearestRoad(x,z);if(road&&road.distance<road.road.width/2+Math.hypot(w,d)/2+7)return;
    if(terrainHeight(x,z)<2||x<coast(z)+160)return;
    const b={x,z,w,d,h,y:terrainHeight(x,z),type,style:Math.floor(random()*5)};
    buildings.push(b);colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
  }
  for(let ix=0;ix<xs.length-1;ix++)for(let iz=0;iz<zs.length-1;iz++){
    const cx=(xs[ix]+xs[ix+1])/2,cz=(zs[iz]+zs[iz+1])/2;
    const downtown=Math.abs(cx)<390&&cz<450;
    for(const dx of[-54,0,54])for(const dz of[-48,25]){
      if(random()<.1)continue;
      const h=downtown?30+random()**1.4*115:7+random()*22;
      addBuilding(cx+dx,cz+dz,30+random()*14,28+random()*15,h,downtown?'tower':'shop');
    }
  }
  // Low-rise beachfront and eastern residential blocks.
  for(let z=-340;z<880;z+=76){addBuilding(-830,z,44,43,7+random()*13,'hotel');addBuilding(840,z,48,43,6+random()*12,'house');}
  for(let x=-600;x<800;x+=120)addBuilding(x,940,65,55,7+random()*12,'warehouse');
  for(let z=-260;z<30;z+=90)addBuilding(1190,z,48,62,14,'warehouse');
  for(const building of buildings){
    if(random()>.28)continue;
    const x=building.x+building.w/2+5,z=building.z,road=nearestRoad(x,z);
    if(road&&road.distance<road.road.width/2+5)continue;
    parkedCars.push({x,z,y:terrainHeight(x,z),color:Math.floor(random()*5)});
    colliders.push({minX:x-1.1,maxX:x+1.1,minZ:z-2.4,maxZ:z+2.4});
  }
  const collisionBuckets=new Map();
  colliders.forEach(c=>insert(collisionBuckets,c,c.minX-5,c.maxX+5,c.minZ-5,c.maxZ+5));
  const spawns=[{id:'downtown',name:'Downtown',tag:'CITY STREETS',description:'Wide avenues, glass towers and downtown intersections.',x:6,z:485,heading:0},
    {id:'beach',name:'Pacific Beach',tag:'COASTAL HIGHWAY',description:'Palm-lined boulevards, ocean views and an open coast road.',x:-714,z:460,heading:0},
    {id:'hills',name:'Crestline Hills',tag:'MOUNTAIN ROADS',description:'Climb the pass and take the long way back to the city.',...roads.find(r=>r.id==='ridge').frame(1100)}];
  spawns[2].heading=spawns[2].angle;
  const landmarks=[{name:'Horizon Plaza',x:6,z:80},{name:'Pacific Pier',x:-1000,z:320},{name:'Crestline Lookout',x:390,z:-1260},{name:'North Coast',x:50,z:-1950},{name:'Portside',x:700,z:1090},{name:'Airfield',x:1120,z:-160}];
  function district(x,z){return z<-1450?'NORTH COAST':z<-550?'CRESTLINE HILLS':x<-650?'PACIFIC BEACH':z>880?'PORTSIDE':x>800?'EAST GATE':'DOWNTOWN';}
  function surface(x,z){const road=nearestRoad(x,z),ground=terrainHeight(x,z);return {height:ground+(road&&road.distance<road.road.width/2?.08:0),water:ground<.1,onRoad:!!road&&road.distance<road.road.width/2,road:road?.road.name||'Off road',district:district(x,z)};}
  function resolve(x,z,heading){
    let hit=false;
    for(let pass=0;pass<3;pass++)for(const along of[-1.2,0,1.2]){
      const px=x-Math.sin(heading)*along,pz=z-Math.cos(heading)*along;
      for(const c of collisionBuckets.get(key(px,pz))||[]){
        const qx=clamp(px,c.minX,c.maxX),qz=clamp(pz,c.minZ,c.maxZ),dx=px-qx,dz=pz-qz,dist=Math.hypot(dx,dz),radius=1.12;
        if(dist>=radius)continue;
        hit=true;
        if(dist>.0001){x+=dx/dist*(radius-dist);z+=dz/dist*(radius-dist);}
        else {const edges=[{d:px-c.minX,x:c.minX-radius,z:pz},{d:c.maxX-px,x:c.maxX+radius,z:pz},{d:pz-c.minZ,x:px,z:c.minZ-radius},{d:c.maxZ-pz,x:px,z:c.maxZ+radius}].sort((a,b)=>a.d-b.d);x+=edges[0].x-px;z+=edges[0].z-pz;}
      }
    }
    const bx=clamp(x,BOUNDS.minX+10,BOUNDS.maxX-10),bz=clamp(z,BOUNDS.minZ+10,BOUNDS.maxZ-10);
    return {x:bx,z:bz,hit:hit||bx!==x||bz!==z};
  }
  return {roads,buildings,colliders,parkedCars,spawns,landmarks,xs,zs,nearestRoad,surface,resolve,district,bounds:BOUNDS,terrainHeight};
}

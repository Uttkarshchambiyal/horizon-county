import * as THREE from './vendor/three.module.min.js';
import {createRegionLayout} from './region-data.js?v=high-speed-steering-12';
import {createStreetDetails} from './street-details.js?v=high-speed-steering-12';
import {createDistrictLife,deckSurface} from './district-life.js?v=high-speed-steering-12';
export const ROAD_SURFACE=.095;
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
    samples.push({x:p.x,z:p.z,y:terrainHeight(p.x,p.z)+ROAD_SURFACE,tx:t.x/n,tz:t.z/n,nx:-t.z/n,nz:t.x/n,s:i/count*length});
  }
  function frame(distance){
    const s=closed?((distance%length)+length)%length:clamp(distance,0,length);
    const f=s/length*count,i=Math.min(count-1,Math.floor(f)),t=f-i,a=samples[i],b=samples[i+1];
    const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,tx=a.tx+(b.tx-a.tx)*t,tz=a.tz+(b.tz-a.tz)*t;
    return {x,z,y:terrainHeight(x,z)+ROAD_SURFACE,tx,tz,nx:-tz,nz:tx,angle:Math.atan2(-tx,-tz),s};
  }
  return {id,name,width,kind,closed,length,samples,frame};
}
export function makeOpenWorld(){
  const roads=[],buildings=[],colliders=[],parkedCars=[],blocks=[],random=seeded();
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
  function isJunction(f,road,extra=4){
    for(const {road:other,a,b} of buckets.get(key(f.x,f.z))||[]){
      if(other===road)continue;const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(Math.abs((f.tx*dx+f.tz*dz)/length)>.92)continue;
      const t=clamp(((f.x-a.x)*dx+(f.z-a.z)*dz)/(length*length),0,1);if(Math.hypot(f.x-a.x-dx*t,f.z-a.z-dz*t)<other.width/2+extra)return true;
    }return false;
  }
  function addBuilding(x,z,w,d,h,type,facing=0){
    if(terrainHeight(x,z)<2||x<coast(z)+125)return false;
    // Test the complete footprint, including nearby crossing roads. The old
    // circular clearance left huge unused setbacks around every city block.
    for(const [dx,dz] of[[0,0],[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2],[0,-d/2],[0,d/2],[-w/2,0],[w/2,0]]){
      const road=nearestRoad(x+dx,z+dz);if(road&&road.distance<road.road.width/2+6)return false;
    }
    if(buildings.some(b=>Math.abs(b.x-x)<(b.w+w)/2+2&&Math.abs(b.z-z)<(b.d+d)/2+2))return false;
    const b={id:buildings.length,x,z,w,d,h,y:terrainHeight(x,z),type,facing,style:Math.floor(random()*8)};
    buildings.push(b);colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});return true;
  }
  function streetType(ix,iz,i){
    const cx=(xs[ix]+xs[ix+1])/2,cz=(zs[iz]+zs[iz+1])/2;
    const choices=cz>650?['warehouse','retail','loft','garage']:cx>450?['house','apartment','retail','house']:cx<-450?['apartment','motel','retail','loft']:['loft','apartment','artdeco','retail','setback','garage'];
    return choices[(i+ix*3+iz*2)%choices.length];
  }
  const heights={house:6,apartment:17,retail:5,loft:22,motel:10,warehouse:10,garage:13,artdeco:40,setback:45,glass:70,round:90,civic:23,villa:8};
  for(let ix=0;ix<xs.length-1;ix++)for(let iz=0;iz<zs.length-1;iz++){
    const xa=xs[ix],xb=xs[ix+1],za=zs[iz],zb=zs[iz+1],cx=(xa+xb)/2,cz=(za+zb)/2,id=blocks.length;
    const use=ix===3&&iz===3?'plaza':id===26?'service':id%7===0?'park':id%4===0?'parking':'courtyard';
    blocks.push({id,x:cx,z:cz,w:126,d:112,use,y:terrainHeight(cx,cz)});
    // Buildings now line the pavement instead of floating in the block centre.
    for(let i=0;i<4;i++)for(const side of[-1,1]){
      const type=streetType(ix,iz,i+(side>0?1:0)),x=xa+44+i*50,z=side<0?za+40:zb-40;
      const w=type==='house'?32:42,d=type==='motel'?34:28+random()*5,h=heights[type]*(.83+random()*.32);
      addBuilding(x,z,w,d,h,type,side<0?Math.PI:0);
    }
    for(let i=0;i<2;i++)for(const side of[-1,1]){
      const type=streetType(ix,iz,i+4+(side>0?1:0)),x=side<0?xa+40:xb-40,z=za+94+i*52;
      addBuilding(x,z,30,42,heights[type]*(.85+random()*.3),type,side<0?-Math.PI/2:Math.PI/2);
    }
    if(use==='courtyard'){
      const core=Math.abs(cx)<400&&cz<500,type=core?(id===10?'civic':['glass','round','setback','artdeco'][(ix*3+iz*5+Math.floor(random()*4))%4]):cx>450?'villa':'apartment';
      addBuilding(cx,cz,core?65:54,core?64:48,heights[type]*(.9+random()*.7),type);
    }
  }
  // The beachfront has hotels, diners and low-rise apartments; the eastern
  // edge has homes. Suburban villas also occupy the previously empty coast.
  for(let z=-350,i=0;z<1000;z+=64,i++){
    addBuilding(-824,z,48,49,11+random()*14,['motel','apartment','retail','loft'][i%4],Math.PI/2);
    addBuilding(839,z,48,43,6+random()*6,i%4===0?'retail':'house',-Math.PI/2);
  }
  for(let x=-600,i=0;x<850;x+=86,i++)addBuilding(x,945,63,56,8+random()*8,i%4===0?'garage':'warehouse');
  for(let z=-270;z<80;z+=82)addBuilding(1190,z,51,60,13,'warehouse',-Math.PI/2);
  const coastRoad=roads.find(r=>r.id==='coast');
  for(let distance=380;distance<coastRoad.length;distance+=155){
    const f=coastRoad.frame(distance);if(f.z>-500&&f.x<950)continue;
    for(const side of[-1,1]){const x=f.x+f.nx*side*62,z=f.z+f.nz*side*62;if(x<-1100||x>1700||z>1200)continue;addBuilding(x,z,30+random()*15,26+random()*12,6+random()*7,f.z>650?'warehouse':'villa',f.angle+Math.PI/2);}
  }
  for(const building of buildings){
    if(parkedCars.length>=78||random()>.18)continue;
    const x=building.x+building.w/2+5,z=building.z,road=nearestRoad(x,z);
    if(road&&road.distance<road.road.width/2+5)continue;
    if(buildings.some(b=>Math.abs(b.x-x)<b.w/2+1.5&&Math.abs(b.z-z)<b.d/2+3))continue;
    parkedCars.push({x,z,y:terrainHeight(x,z),color:Math.floor(random()*5)});
    colliders.push({minX:x-1.1,maxX:x+1.1,minZ:z-2.7,maxZ:z+2.7});
  }
  for(const block of blocks){
    const {x,z,use}=block;
    if(use==='park'||use==='plaza')colliders.push({minX:x-9,maxX:x+9,minZ:z-9,maxZ:z+9,cx:x,cz:z,radius:9});
    if(use==='service')for(const sx of[-1,1])for(const sz of[-1,1]){
      colliders.push({minX:x+sx*18-.3,maxX:x+sx*18+.3,minZ:z+sz*10-.3,maxZ:z+sz*10+.3});
      colliders.push({minX:x+sx*11-.6,maxX:x+sx*11+.6,minZ:z+sz*6-.5,maxZ:z+sz*6+.5});
    }
  }
  const regionItems=createRegionLayout({roads,buildings,nearestRoad},terrainHeight,coast,seeded(8031));
  for(const item of regionItems)if(item.solid||item.type==='rock'||item.type==='pine'||item.type==='birch'){
    const {x:cx,z:cz,type,angle}=item,footprints={lookout:[6,4.5],cabin:[3.5,3.6],kiosk:[3.5,3.6],lifeguard:[2.5,2]},footprint=footprints[type];
    if(footprint){const [halfX,halfZ]=footprint,dx=Math.abs(Math.cos(angle))*halfX+Math.abs(Math.sin(angle))*halfZ,dz=Math.abs(Math.sin(angle))*halfX+Math.abs(Math.cos(angle))*halfZ;colliders.push({cx,cz,angle,halfX,halfZ,minX:cx-dx,maxX:cx+dx,minZ:cz-dz,maxZ:cz+dz,type});}
    else {const radius=type==='pine'||type==='birch'?.23:type==='tent'?3.35:item.r*.88;colliders.push({cx,cz,radius,minX:cx-radius,maxX:cx+radius,minZ:cz-radius,maxZ:cz+radius,type});}
  }
  const streetDetails=createStreetDetails({buildings,nearestRoad},terrainHeight);for(const i of streetDetails)if(i.solid)colliders.push({cx:i.x,cz:i.z,radius:i.r,minX:i.x-i.r,maxX:i.x+i.r,minZ:i.z-i.r,maxZ:i.z+i.r,type:i.type});
  const life=createDistrictLife({roads,buildings,blocks,nearestRoad,xs,zs},terrainHeight,coast,seeded(9124));parkedCars.push(...life.parking);colliders.push(...life.footprints);
  const collisionBuckets=new Map();
  colliders.forEach(c=>insert(collisionBuckets,c,c.minX-5,c.maxX+5,c.minZ-5,c.maxZ+5));
  const registered=new Set();
  function addSceneryCollider(x,z,radius,type='tree'){
    const id=type+':'+x.toFixed(2)+','+z.toFixed(2);if(registered.has(id))return;registered.add(id);const c={cx:x,cz:z,radius,type,minX:x-radius,maxX:x+radius,minZ:z-radius,maxZ:z+radius};colliders.push(c);insert(collisionBuckets,c,c.minX-5,c.maxX+5,c.minZ-5,c.maxZ+5);
  }
  const spawns=[{id:'downtown',name:'Downtown',tag:'CITY STREETS',description:'Wide avenues, glass towers and downtown intersections.',x:6,z:485,heading:0},
    {id:'beach',name:'Pacific Beach',tag:'COASTAL HIGHWAY',description:'Palm-lined boulevards, ocean views and an open coast road.',x:-714,z:460,heading:0},
    {id:'hills',name:'Crestline Hills',tag:'MOUNTAIN ROADS',description:'Climb the pass and take the long way back to the city.',...roads.find(r=>r.id==='ridge').frame(1100)}];
  let beachFrame=null,beachDistance=Infinity;
  for(let s=0;s<1500;s+=3){const f=coastRoad.frame(s),d=Math.abs(f.z-460);if(d<beachDistance){beachDistance=d;beachFrame=f;}}
  Object.assign(spawns[1],{x:beachFrame.x+beachFrame.nx*4,z:beachFrame.z+beachFrame.nz*4,heading:beachFrame.angle});
  spawns[2].heading=spawns[2].angle;
  const landmarks=[{name:'Horizon Plaza',x:120,z:440},{name:'Pacific Pier',x:coast(320)-35,z:320},{name:'Crestline Lookout',x:390,z:-1260},{name:'North Coast',x:50,z:-1950},{name:'Portside',x:692,z:1320},{name:'Airfield',x:1120,z:-160}];
  const lookout=regionItems.filter(i=>i.type==='lookout').sort((a,b)=>Math.hypot(a.x-390,a.z+1260)-Math.hypot(b.x-390,b.z+1260))[0];if(lookout)Object.assign(landmarks[2],{x:lookout.x,z:lookout.z});
  function district(x,z){return z<-1450?'NORTH COAST':z<-550?'CRESTLINE HILLS':x<-650?'PACIFIC BEACH':z>880?'PORTSIDE':x>800?'EAST GATE':'DOWNTOWN';}
  function surface(x,z){
    const road=nearestRoad(x,z),ground=terrainHeight(x,z),onRoad=!!road&&road.distance<road.road.width/2;let height=ground;
    if(onRoad)height+=ROAD_SURFACE;
    else if(road&&(road.road.kind==='street'||road.road.kind==='highway'&&x<-700&&z>-500&&z<1030)&&road.distance<road.road.width/2+(road.road.kind==='street'?7:5))height+=.16;
    else for(const b of blocks)if(Math.abs(x-b.x)<b.w/2+2&&Math.abs(z-b.z)<b.d/2+2){const dx=Math.abs(x-b.x),dz=Math.abs(z-b.z),edge=dx>b.w/2-.5||dz>b.d/2-.5;height=Math.max(height,b.y+(edge?.23:(b.use==='park'||b.use==='plaza')&&(dx<2||dz<2)?.26:.19));break;}
    if(!onRoad)for(const p of life.surfaces){const dx=x-p.x,dz=z-p.z,c=Math.cos(p.angle),s=Math.sin(p.angle);if(Math.abs(dx*c-dz*s)<p.w/2&&Math.abs(dx*s+dz*c)<p.d/2)height=Math.max(height,p.height);}
    const deck=deckSurface(life.decks,x,z,terrainHeight,coast);if(deck!==null)height=Math.max(height,deck);
    return {height,water:ground<.1&&deck===null,onRoad,road:road?.road.name||(deck!==null?'Waterfront promenade':'Off road'),district:district(x,z)};
  }
  function resolve(x,z,heading,bodyRadius=1.12,halfLength=1.2){
    let hit=false;
    for(let pass=0;pass<3;pass++)for(const along of (halfLength?[-halfLength,0,halfLength]:[0])){
      const px=x-Math.sin(heading)*along,pz=z-Math.cos(heading)*along;
      for(const c of collisionBuckets.get(key(px,pz))||[]){
        const radius=bodyRadius;
        if(c.radius){const dx=px-c.cx,dz=pz-c.cz,dist=Math.hypot(dx,dz),overlap=c.radius+radius-dist;if(overlap>0){hit=true;x+=(dist?dx/dist:1)*overlap;z+=(dist?dz/dist:0)*overlap;}continue;}
        if(c.halfX){const co=Math.cos(c.angle),si=Math.sin(c.angle),lx=(px-c.cx)*co-(pz-c.cz)*si,lz=(px-c.cx)*si+(pz-c.cz)*co,qx=clamp(lx,-c.halfX,c.halfX),qz=clamp(lz,-c.halfZ,c.halfZ),dx=lx-qx,dz=lz-qz,dist=Math.hypot(dx,dz);if(dist<radius){hit=true;let ox,oz;if(dist>.0001){ox=dx/dist*(radius-dist);oz=dz/dist*(radius-dist);}else if(c.halfX-Math.abs(lx)<c.halfZ-Math.abs(lz)){ox=(lx<0?-1:1)*(c.halfX-Math.abs(lx)+radius);oz=0;}else{ox=0;oz=(lz<0?-1:1)*(c.halfZ-Math.abs(lz)+radius);}x+=ox*co+oz*si;z+=-ox*si+oz*co;}continue;}
        const qx=clamp(px,c.minX,c.maxX),qz=clamp(pz,c.minZ,c.maxZ),dx=px-qx,dz=pz-qz,dist=Math.hypot(dx,dz);
        if(dist>=radius)continue;
        hit=true;
        if(dist>.0001){x+=dx/dist*(radius-dist);z+=dz/dist*(radius-dist);}
        else {const edges=[{d:px-c.minX,x:c.minX-radius,z:pz},{d:c.maxX-px,x:c.maxX+radius,z:pz},{d:pz-c.minZ,x:px,z:c.minZ-radius},{d:c.maxZ-pz,x:px,z:c.maxZ+radius}].sort((a,b)=>a.d-b.d);x+=edges[0].x-px;z+=edges[0].z-pz;}
      }
    }
    const bx=clamp(x,BOUNDS.minX+10,BOUNDS.maxX-10),bz=clamp(z,BOUNDS.minZ+10,BOUNDS.maxZ-10);
    return {x:bx,z:bz,hit:hit||bx!==x||bz!==z};
  }
  return {roads,buildings,colliders,parkedCars,blocks,regionItems,streetDetails,life,spawns,landmarks,xs,zs,nearestRoad,isJunction,surface,resolve,addSceneryCollider,district,bounds:BOUNDS,terrainHeight};
}

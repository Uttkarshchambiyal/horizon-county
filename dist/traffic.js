import {clamp,terrainHeight,seeded,ROAD_SURFACE} from './world-data.js?v=populated-8';
import {FLEET_TYPES,FLEET_FOOTPRINTS} from './fleet-data.js?v=populated-8';
import {vehicleSpec} from './vehicles.js?v=populated-8';

// A small, deterministic fleet follows continuous right-hand lanes. It runs on
// the same fixed clock as the player, so pausing freezes cars and signals.
export function signalState(time,axis){
  const phase=((time%32)+32)%32,offset=axis==='ns'?phase:(phase+16)%32;
  return offset<12?'green':offset<14?'yellow':'red';
}
function cityRoute(corners){
  const points=[],radius=12;
  for(let i=0;i<corners.length;i++){
    const prev=corners[(i+corners.length-1)%corners.length],c=corners[i],next=corners[(i+1)%corners.length];
    const inLen=Math.hypot(c[0]-prev[0],c[1]-prev[1]),outLen=Math.hypot(next[0]-c[0],next[1]-c[1]);
    const a=[c[0]-(c[0]-prev[0])/inLen*radius,c[1]-(c[1]-prev[1])/inLen*radius];
    const b=[c[0]+(next[0]-c[0])/outLen*radius,c[1]+(next[1]-c[1])/outLen*radius];
    if(points.length){const start=points.at(-1),n=Math.ceil(Math.hypot(a[0]-start[0],a[1]-start[1])/2);for(let j=1;j<n;j++)points.push([start[0]+(a[0]-start[0])*j/n,start[1]+(a[1]-start[1])*j/n]);}
    for(let j=0;j<=16;j++){const t=j/16;points.push([(1-t)**2*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)**2*a[1]+2*(1-t)*t*c[1]+t*t*b[1]]);}
  }
  const start=points.at(-1),end=points[0],n=Math.ceil(Math.hypot(end[0]-start[0],end[1]-start[1])/2);
  for(let j=1;j<n;j++)points.push([start[0]+(end[0]-start[0])*j/n,start[1]+(end[1]-start[1])*j/n]);
  const lane=points.map((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);return {x:p[0]-(b[1]-a[1])/len*3.4,z:p[1]+(b[0]-a[0])/len*3.4};});
  const segments=[];let length=0;
  lane.forEach((a,i)=>{const b=lane[(i+1)%lane.length],d=Math.hypot(b.x-a.x,b.z-a.z);segments.push({a,b,s:length,d});length+=d;});
  return {length,city:true,frame(distance){
    const s=((distance%length)+length)%length;let lo=0,hi=segments.length-1;
    while(lo<hi){const mid=(lo+hi+1)>>1;if(segments[mid].s<=s)lo=mid;else hi=mid-1;}
    const {a,b,s:start,d}=segments[lo],t=(s-start)/d,tx=(b.x-a.x)/d,tz=(b.z-a.z)/d;
    return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,tx,tz,heading:Math.atan2(-tx,-tz)};
  }};
}
export function makeTraffic(world){
  const blocks=[[[0,800],[0,-400],[480,-400],[480,800]],[[-720,800],[-720,-400],[-240,-400],[-240,800]],[[-480,560],[-480,-160],[720,-160],[720,560]]];
  const routes=[...blocks,...blocks.map(b=>[...b].reverse())].map(cityRoute);
  const coast=world.roads.find(r=>r.id==='coast');
  for(const direction of[1,-1])routes.push({length:coast.length,city:false,frame(distance){const f=coast.frame(direction*distance),tx=f.tx*direction,tz=f.tz*direction;return {x:f.x-tz*4,z:f.z+tx*4,tx,tz,heading:Math.atan2(-tx,-tz)};}});
  const random=seeded(704),cars=[];
  routes.forEach((route,ri)=>{const count=route.city?2:3;for(let i=0;i<count;i++){const s=route.length*(i+.17+ri*.11)/count;cars.push({id:cars.length,route:ri,s,speed:0,desiredSpeed:route.city?12+random()*3:20+random()*4,type:FLEET_TYPES[cars.length%FLEET_TYPES.length],paint:[0xe2e1d7,0x475d6e,0x8d4540,0x92948c,0x29333d,0x8b978b][cars.length%6],blocked:0,braking:false,...route.frame(s)});}});
  // Two cars are visible from the downtown start, in opposite lanes. All other
  // cars remain distributed over the city and the long coastal loop.
  for(const [id,x,z] of[[0,3.4,410],[6,-3.4,350]]){
    const c=cars[id],route=routes[c.route];let best=Infinity;
    for(let s=0;s<route.length;s+=2){const f=route.frame(s),d=Math.hypot(f.x-x,f.z-z);if(d<best){best=d;c.s=s;}}
    Object.assign(c,route.frame(c.s));
  }
  // Keep the coastal start alive too, without increasing the simulated fleet.
  const beach=world.spawns[1];for(const [routeIndex,ahead] of[[6,100],[7,160]]){
    const c=cars.find(c=>c.route===routeIndex),route=routes[routeIndex],x=beach.x-Math.sin(beach.heading)*ahead,z=beach.z-Math.cos(beach.heading)*ahead;let best=Infinity;
    for(let s=0;s<route.length;s+=2){const f=route.frame(s),d=Math.hypot(f.x-x,f.z-z);if(d<best){best=d;c.s=s;}}Object.assign(c,route.frame(c.s));
  }
  const traffic={routes,cars,time:0,enabled:true};
  cars.forEach(c=>{c.y=terrainHeight(c.x,c.z)+ROAD_SURFACE+.55;});
  return traffic;
}
function forwardGap(car,other){
  const dx=other.x-car.x,dz=other.z-car.z,along=dx*car.tx+dz*car.tz,lateral=Math.abs(-dx*car.tz+dz*car.tx);
  // Include crossing vehicles in the near field as well as cars in this lane.
  if(along<=0||lateral>2.7)return Infinity;
  return along-5.8;
}
export function stepTraffic(traffic,world,player,dt){
  if(!traffic.enabled)return;
  traffic.time+=dt;
  const targets=traffic.targets||(traffic.targets=new Float64Array(traffic.cars.length));
  traffic.cars.forEach((car,index)=>{
    const route=traffic.routes[car.route];let target=car.desiredSpeed;
    // Ease down before corners, rather than snapping a fast car around them.
    const ahead=route.frame(car.s+18),bend=Math.abs(Math.atan2(Math.sin(ahead.heading-car.heading),Math.cos(ahead.heading-car.heading)));
    target=Math.min(target,route.city&&bend>.18?6:target);
    if(route.city){
      const axis=Math.abs(car.tz)>.96?'ns':Math.abs(car.tx)>.96?'ew':null;
      if(axis){
        for(const cross of axis==='ns'?world.zs:world.xs){
          const distance=axis==='ns'?(cross-car.z)/car.tz:(cross-car.x)/car.tx;
          if(distance<18||distance>90)continue;
          const signal=signalState(traffic.time,axis),canStop=distance>24+car.speed*car.speed/(2*5);
          if(signal==='red'||signal==='yellow'&&canStop)target=Math.min(target,Math.sqrt(2*4*Math.max(0,distance-24)));
        }
      }
    }
    for(const other of traffic.cars){if(!other||other===car)continue;const gap=forwardGap(car,other);if(gap<70)target=Math.min(target,Math.sqrt(2*4*Math.max(0,gap-2)),Math.max(0,((other.speed||0)+gap-5-car.speed*.65)));}
    if(player){const gap=forwardGap(car,player);if(gap<70)target=Math.min(target,Math.sqrt(8*Math.max(0,gap-2)),Math.max(0,(player.speed||0)+gap-5-car.speed*.65));}
    if(car.blocked>0)target=0;
    targets[index]=Math.max(0,target);
  });
  traffic.cars.forEach((car,i)=>{
    const previous=car.previous||(car.previous={});previous.x=car.x;previous.y=car.y;previous.z=car.z;previous.heading=car.heading;
    car.blocked=Math.max(0,car.blocked-dt);car.braking=targets[i]<car.speed-.4;
    car.speed+=clamp(targets[i]-car.speed,-6*dt,2.2*dt);
    car.s=(car.s+car.speed*dt)%traffic.routes[car.route].length;
    Object.assign(car,traffic.routes[car.route].frame(car.s));car.y=terrainHeight(car.x,car.z)+ROAD_SURFACE+.55;
  });
}
export function collideTraffic(state,traffic){
  if(!traffic.enabled)return false;
  const spec=vehicleSpec(state.vehicleId);let hit=false;
  for(const car of traffic.cars){
    if(Math.hypot(state.x-car.x,state.z-car.z)>7||Math.abs((state.y??car.y)-(car.y??state.y))>2.3)continue;
    const af={x:-Math.sin(state.heading),z:-Math.cos(state.heading)},ar={x:Math.cos(state.heading),z:-Math.sin(state.heading)},bf={x:car.tx??-Math.sin(car.heading),z:car.tz??-Math.cos(car.heading)},br={x:-bf.z,z:bf.x},[length,width]=FLEET_FOOTPRINTS[car.type]||FLEET_FOOTPRINTS.sedan;
    const dx=state.x-car.x,dz=state.z-car.z;let overlap=Infinity,normal=null;
    for(const axis of[af,ar,bf,br]){
      const ra=(spec.length/2+.04)*Math.abs(af.x*axis.x+af.z*axis.z)+(spec.width/2+.04)*Math.abs(ar.x*axis.x+ar.z*axis.z),rb=(length/2+.04)*Math.abs(bf.x*axis.x+bf.z*axis.z)+(width/2+.04)*Math.abs(br.x*axis.x+br.z*axis.z),projection=dx*axis.x+dz*axis.z,depth=ra+rb-Math.abs(projection);
      if(depth<=0){normal=null;break;}if(depth<overlap){overlap=depth;const sign=projection<0?-1:1;normal={x:axis.x*sign,z:axis.z*sign};}
    }
    if(!normal)continue;
    state.x+=normal.x*(overlap+.005);state.z+=normal.z*(overlap+.005);hit=true;
    const direction=Math.sign(state.speed),heading=state.motionHeading??state.heading,vx=-Math.sin(heading)*state.speed,vz=-Math.cos(heading)*state.speed,inward=Math.min(0,vx*normal.x+vz*normal.z),sx=vx-normal.x*inward,sz=vz-normal.z*inward;
    state.speed=overlap>1.2?0:Math.hypot(sx,sz)*direction;if(Math.abs(state.speed)>.1)state.motionHeading=Math.atan2(-sx*direction,-sz*direction);
    state.yawRate=(state.yawRate||0)*.8;car.blocked=1;car.speed=0;car.braking=true;state.hitCooldown=.2;
  }
  return hit;
}

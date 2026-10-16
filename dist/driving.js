import {clamp} from './world-data.js';
import {vehicleSpec} from './vehicles.js';
export function newDriveState(world,spawn=world.spawns[0],vehicleId='clubsport'){
  return {x:spawn.x,z:spawn.z,y:world.surface(spawn.x,spawn.z).height+.55,heading:spawn.heading||0,motionHeading:spawn.heading||0,
    vehicleId,speed:0,steering:0,boost:100,elapsed:0,distance:0,maxSpeed:0,grounded:true,waterTime:0,hitCooldown:0,
    lastSafe:{x:spawn.x,z:spawn.z,heading:spawn.heading||0}};
}
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function recoverCar(state,world,spawn){
  const fresh=newDriveState(world,spawn||state.lastSafe,state.vehicleId);
  Object.assign(state,fresh,{elapsed:state.elapsed,distance:state.distance,maxSpeed:state.maxSpeed});
}
export function stepDrive(state,world,input,dt){
  const events=[],spec=vehicleSpec(state.vehicleId);state.elapsed+=dt;state.hitCooldown=Math.max(0,state.hitCooldown-dt);
  const start=world.surface(state.x,state.z),gas=!!input.throttle,brake=!!input.brake;
  const boost=gas&&!brake&&input.boost&&state.boost>1&&state.speed>6&&!start.water;
  state.boost=clamp(state.boost+(boost?-26:9)*dt,0,100);
  const top=start.water?3:start.onRoad?(boost?spec.boostTop:spec.top):spec.offRoad;
  if(gas&&!brake)state.speed+=(state.speed<0?spec.brake:spec.accel*(boost?1.55:1))*dt;
  else if(brake&&!gas){if(state.speed>0)state.speed=Math.max(0,state.speed-spec.brake*dt);else state.speed=Math.max(-12,state.speed-8*dt);}
  else state.speed=Math.sign(state.speed)*Math.max(0,Math.abs(state.speed)-(4+Math.abs(state.speed)*.06)*dt);
  if(input.drift)state.speed=Math.sign(state.speed)*Math.max(0,Math.abs(state.speed)-9*dt);
  if(state.speed>top)state.speed=Math.max(top,state.speed-28*dt);
  state.speed=clamp(state.speed,-12,spec.boostTop);state.maxSpeed=Math.max(state.maxSpeed,Math.abs(state.speed));
  state.steering+=((input.steer||0)-state.steering)*(1-Math.exp(-11*dt));
  // Keyboard steering has a bounded turn rate, so a short A/D press produces a
  // controllable arc at highway speed rather than spinning the car around.
  const yaw=Math.min(Math.abs(state.speed)*.085,spec.turn)*(input.drift?1.45:1);
  state.heading-=state.steering*yaw*Math.sign(state.speed)*dt;
  state.motionHeading+=angle(state.heading,state.motionHeading)*(1-Math.exp(-(input.drift?3.5:spec.grip)*dt));
  const oldX=state.x,oldZ=state.z;
  const movement=world.resolve(state.x-Math.sin(state.motionHeading)*state.speed*dt,state.z-Math.cos(state.motionHeading)*state.speed*dt,state.heading);
  state.x=movement.x;state.z=movement.z;
  if(movement.hit){if(Math.abs(state.speed)>4&&state.hitCooldown===0){events.push('collision');state.hitCooldown=.8;}state.speed*=.35;}
  state.distance+=Math.hypot(state.x-oldX,state.z-oldZ);
  const surface=world.surface(state.x,state.z);state.y=surface.height+.55;
  if(surface.water){state.waterTime+=dt;state.speed*=Math.exp(-3*dt);if(state.waterTime>2.5){recoverCar(state,world);events.push('recover');}}
  else {state.waterTime=0;if(surface.onRoad&&!movement.hit)state.lastSafe={x:state.x,z:state.z,heading:state.heading};}
  return events;
}

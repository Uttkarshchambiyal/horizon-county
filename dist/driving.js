import {clamp} from './world-data.js?v=clarity-5';
import {vehicleSpec} from './vehicles.js?v=clarity-5';
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
export function newDriveState(world,spawn=world.spawns[0],vehicleId='clubsport'){
  return {x:spawn.x,z:spawn.z,y:world.surface(spawn.x,spawn.z).height+.55,heading:spawn.heading||0,motionHeading:spawn.heading||0,
    vehicleId,speed:0,steering:0,steerAngle:0,yawRate:0,lateralAcceleration:0,longitudinalAcceleration:0,verticalSpeed:0,reverseHold:0,wheelTravel:0,boost:100,elapsed:0,distance:0,maxSpeed:0,grounded:true,waterTime:0,hitCooldown:0,
    lastSafe:{x:spawn.x,z:spawn.z,heading:spawn.heading||0}};
}
export function recoverCar(state,world,spawn){
  const fresh=newDriveState(world,spawn||state.lastSafe,state.vehicleId);
  Object.assign(state,fresh,{elapsed:state.elapsed,distance:state.distance,maxSpeed:state.maxSpeed});
}
export function stepDrive(state,world,input,dt){
  const events=[],spec=vehicleSpec(state.vehicleId),oldSpeed=state.speed;state.elapsed+=dt;state.hitCooldown=Math.max(0,state.hitCooldown-dt);
  const start=world.surface(state.x,state.z),gas=!!input.throttle,brake=!!input.brake,speed=Math.abs(state.speed);
  const boost=gas&&!brake&&input.boost&&state.boost>1&&state.speed>6&&!start.water&&state.grounded;
  state.boost=clamp(state.boost+(boost?-26:9)*dt,0,100);
  const top=start.water?3:start.onRoad?(boost?spec.boostTop:spec.top):spec.offRoad;
  const rolling=(start.onRoad?.72:1.7)+speed*speed*.00065,braking=start.onRoad?12.8:8.5;
  if(brake){
    if(state.speed>.08||gas){state.speed=approach(state.speed,0,braking*dt);state.reverseHold=0;}
    else {state.speed=Math.min(0,state.speed);state.reverseHold+=dt;if(state.reverseHold>.28)state.speed=Math.max(-9,state.speed-6.5*dt);}
  }else if(gas){
    state.reverseHold=0;
    if(state.speed<-.08)state.speed=approach(state.speed,0,braking*dt);
    else {state.speed=Math.max(0,state.speed);const power=spec.accel*(1-.5*clamp(state.speed/top,0,1))*(boost?1.5:1);state.speed+=Math.max(0,power-rolling)*dt;}
  }else {state.reverseHold=0;state.speed=approach(state.speed,0,rolling*dt);}
  if(input.drift)state.speed=approach(state.speed,0,7.5*dt);
  if(state.grounded&&(gas&&!brake||Math.abs(state.speed)>.15||brake&&state.reverseHold>.28)){
    const hx=-Math.sin(state.heading),hz=-Math.cos(state.heading),front=world.surface(state.x+hx*1.4,state.z+hz*1.4).height,back=world.surface(state.x-hx*1.4,state.z-hz*1.4).height;
    state.speed-=9.81*clamp((front-back)/2.8,-.6,.6)*dt;
  }
  if(state.speed>top)state.speed=approach(state.speed,top,18*dt);
  state.speed=clamp(state.speed,-9,spec.boostTop);if(!gas&&!brake&&Math.abs(state.speed)<.08)state.speed=0;
  state.maxSpeed=Math.max(state.maxSpeed,Math.abs(state.speed));
  // Predictable keyboard response, with visible steering kept separate from tire grip.
  const steer=clamp(input.steer||0,-1,1),steeringRate=steer===0?5.5:steer*state.steering<0?5:3.8;
  state.steering=approach(state.steering,steer,steeringRate*dt);
  const maxAngle=.56/(1+Math.abs(state.speed)/24);state.steerAngle=-state.steering*maxAngle;
  const grip=start.onRoad?(state.vehicleId==='trail'?10.5:state.vehicleId==='touring'?13:15):state.vehicleId==='trail'?9:7;
  const targetYaw=clamp(state.speed/spec.wheelbase*Math.tan(state.steerAngle)*(input.drift?1.1:1),-grip/Math.max(2,Math.abs(state.speed)),grip/Math.max(2,Math.abs(state.speed)));
  state.yawRate+=(targetYaw-state.yawRate)*(1-Math.exp(-(state.grounded?10:1.5)*dt));state.yawRate=clamp(state.yawRate,-grip/Math.max(2,Math.abs(state.speed)),grip/Math.max(2,Math.abs(state.speed)));
  if(Math.abs(state.speed)<.04)state.yawRate=0;
  const oldHeading=state.heading;state.heading+=state.yawRate*dt;state.lateralAcceleration=state.speed*state.yawRate;
  const slip=Math.atan(.5*Math.tan(state.steerAngle))*(input.drift?1.7:1),desiredMotion=(oldHeading+state.heading)/2+slip;
  state.motionHeading+=angle(desiredMotion,state.motionHeading)*(1-Math.exp(-(input.drift?3:start.onRoad?20:9)*dt));
  const oldX=state.x,oldZ=state.z,vx=-Math.sin(state.motionHeading)*state.speed,vz=-Math.cos(state.motionHeading)*state.speed,proposedX=state.x+vx*dt,proposedZ=state.z+vz*dt;
  const movement=world.resolve(proposedX,proposedZ,state.heading);state.x=movement.x;state.z=movement.z;
  if(movement.hit){
    const dx=movement.x-proposedX,dz=movement.z-proposedZ,length=Math.hypot(dx,dz),nx=length?dx/length:0,nz=length?dz/length:0,inward=vx*nx+vz*nz;
    if(Math.abs(inward)>4&&state.hitCooldown===0){events.push('collision');state.hitCooldown=.7;}
    // Remove the velocity into the obstacle and retain tangential motion.
    if(inward<0){const sx=vx-nx*inward,sz=vz-nz*inward;state.speed=Math.hypot(sx,sz)*Math.sign(state.speed);if(Math.abs(state.speed)>.1)state.motionHeading=Math.atan2(-sx*Math.sign(state.speed),-sz*Math.sign(state.speed));state.yawRate*=.85;}
    if(length<.000001)state.speed=0;
  }
  const travelled=Math.hypot(state.x-oldX,state.z-oldZ);state.distance+=travelled;state.wheelTravel+=travelled*Math.sign(oldSpeed||state.speed);
  const surface=world.surface(state.x,state.z),ground=surface.height+.55,previousGround=start.height+.55,groundVelocity=(ground-previousGround)/dt;
  if(state.grounded){
    if(Math.abs(state.speed)>12&&state.verticalSpeed-groundVelocity>1.5&&ground<state.y+state.verticalSpeed*dt-9.81*dt*dt){state.grounded=false;state.verticalSpeed-=9.81*dt;state.y+=state.verticalSpeed*dt;}
    else {state.y=ground;state.verticalSpeed=groundVelocity;}
  }else{state.verticalSpeed-=9.81*dt;state.y+=state.verticalSpeed*dt;if(state.y<=ground){if(state.verticalSpeed<-4)events.push('land');state.y=ground;state.verticalSpeed=groundVelocity;state.grounded=true;}}
  state.longitudinalAcceleration+=(clamp((state.speed-oldSpeed)/dt,-18,12)-state.longitudinalAcceleration)*(1-Math.exp(-10*dt));
  if(surface.water){state.waterTime+=dt;state.speed*=Math.exp(-3*dt);if(state.waterTime>2.5){recoverCar(state,world);events.push('recover');}}
  else {state.waterTime=0;if(surface.onRoad&&!movement.hit&&state.grounded)state.lastSafe={x:state.x,z:state.z,heading:state.heading};}
  return events;
}

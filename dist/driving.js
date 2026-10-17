import {advanceAxles,steeringLimit,accumulateWheelTravel,roadCorneringGrip} from './steering.js?v=high-speed-steering-12';
import {clamp} from './world-data.js?v=high-speed-steering-12';
import {vehicleSpec} from './vehicle-data.js?v=high-speed-steering-12';
const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
export function newDriveState(world,spawn=world.spawns[0],vehicleId='clubsport'){
  return {x:spawn.x,z:spawn.z,y:world.surface(spawn.x,spawn.z).height+.55,heading:spawn.heading||0,motionHeading:spawn.heading||0,
    vehicleId,speed:0,steering:0,steerAngle:0,yawRate:0,lateralAcceleration:0,longitudinalAcceleration:0,verticalSpeed:0,reverseHold:0,wheelTravel:0,wheelDistances:[0,0,0,0],boost:100,elapsed:0,distance:0,maxSpeed:0,grounded:true,waterTime:0,hitCooldown:0,
    lastSafe:{x:spawn.x,z:spawn.z,heading:spawn.heading||0}};
}
export function recoverCar(state,world,spawn){
  const fresh=newDriveState(world,spawn||state.lastSafe,state.vehicleId);
  Object.assign(state,fresh,{elapsed:state.elapsed,distance:state.distance,maxSpeed:state.maxSpeed,tuning:state.tuning});
}
export function stepDrive(state,world,input,dt){
  const events=[],spec=vehicleSpec(state.vehicleId),tune=state.tuning||{},oldSpeed=state.speed;state.elapsed+=dt;state.hitCooldown=Math.max(0,state.hitCooldown-dt);
  const start=world.surface(state.x,state.z),gas=!!input.throttle,brake=!!input.brake,speed=Math.abs(state.speed);let supportGrade=0;
  const boost=gas&&!brake&&input.boost&&state.boost>1&&state.speed>6&&!start.water&&state.grounded;
  state.boost=clamp(state.boost+(boost?-26:9*(tune.recharge??1))*dt,0,100);
  const boostTop=spec.boostTop*(tune.boostSpeed??1),top=start.water?3:start.onRoad?(boost?boostTop:spec.top):spec.offRoad;
  const rolling=(start.onRoad?.72:1.7)+speed*speed*.00065,braking=(start.onRoad?12.8:8.5)*(tune.braking??1);
  if(brake){
    if(state.speed>.08||gas){state.speed=approach(state.speed,0,braking*dt);state.reverseHold=0;}
    else {state.speed=Math.min(0,state.speed);state.reverseHold+=dt;if(state.reverseHold>.28)state.speed=Math.max(-9,state.speed-6.5*dt);}
  }else if(gas){
    state.reverseHold=0;
    if(state.speed<-.08)state.speed=approach(state.speed,0,braking*dt);
    else {state.speed=Math.max(0,state.speed);const power=spec.accel*(tune.acceleration??1)*(1-.5*clamp(state.speed/top,0,1))*(boost?1.5:1);state.speed+=Math.max(0,power-rolling)*dt;}
  }else {state.reverseHold=0;state.speed=approach(state.speed,0,rolling*dt);}
  if(input.drift)state.speed=approach(state.speed,0,7.5*dt);
  if(state.grounded&&(gas&&!brake||Math.abs(state.speed)>.15||brake&&state.reverseHold>.28)){
    const hx=-Math.sin(state.heading),hz=-Math.cos(state.heading),fz=-(spec.wheels[0][2]+spec.wheels[1][2])/2,rz=(spec.wheels[2][2]+spec.wheels[3][2])/2,front=world.surface(state.x+hx*fz,state.z+hz*fz).height,back=world.surface(state.x-hx*rz,state.z-hz*rz).height;
    supportGrade=clamp((front-back)/spec.wheelbase,-.6,.6);state.speed-=9.81*supportGrade*dt;
  }
  if(state.speed>top)state.speed=approach(state.speed,top,18*dt);
  state.speed=clamp(state.speed,-9,boostTop);if(!gas&&!brake&&Math.abs(state.speed)<.08)state.speed=0;
  state.maxSpeed=Math.max(state.maxSpeed,Math.abs(state.speed));
  // The rack angle drives the rear-axle path. There is no separate heading
  // filter that can make the body slide away from its visible wheel direction.
  const steer=clamp(input.steer||0,-1,1),fastResponse=clamp((speed-20)/25,0,1),steeringRate=steer===0?5.5+4.5*fastResponse:steer*state.steering<0?5+7*fastResponse:3.8+3.2*fastResponse;
  state.steering=approach(state.steering,steer,steeringRate*dt);
  const turnSpeed=Math.max(Math.abs(oldSpeed),Math.abs(state.speed));
  const grip=(start.onRoad?roadCorneringGrip(turnSpeed,spec.grip):spec.suv?9:7)*(tune.grip??1)*(input.drift?.72:1);
  const limit=steeringLimit(turnSpeed,spec.wheelbase,grip);
  state.steerAngle=clamp(approach(state.steerAngle,-state.steering*limit,(2.9/(1+Math.abs(state.speed)/30))*dt),-limit,limit);
  const oldX=state.x,oldZ=state.z,oldHeading=state.heading,distance=(oldSpeed+state.speed)*.5*dt;
  let proposedX,proposedZ;
  if(state.grounded){
    const next=advanceAxles(state.x,state.z,state.heading,spec,distance,state.steerAngle);
    proposedX=next.x;proposedZ=next.z;state.heading=next.heading;state.yawRate=(state.heading-oldHeading)/dt;
  }else{
    // Steering airborne tires cannot create a new ground-contact turning force.
    state.yawRate*=Math.exp(-.6*dt);state.heading+=state.yawRate*dt;
    proposedX=state.x-Math.sin(state.motionHeading)*distance;proposedZ=state.z-Math.cos(state.motionHeading)*distance;
  }
  state.lateralAcceleration=state.grounded?state.speed*state.yawRate:0;
  const vx=(proposedX-oldX)/dt,vz=(proposedZ-oldZ)/dt;
  if(Math.hypot(vx,vz)>.001)state.motionHeading=Math.atan2(-vx*Math.sign(state.speed||oldSpeed||1),-vz*Math.sign(state.speed||oldSpeed||1));
  const movement=world.resolve(proposedX,proposedZ,state.heading);state.x=movement.x;state.z=movement.z;
  if(movement.hit){
    const dx=movement.x-proposedX,dz=movement.z-proposedZ,length=Math.hypot(dx,dz),nx=length?dx/length:0,nz=length?dz/length:0,inward=vx*nx+vz*nz;
    if(Math.abs(inward)>4&&state.hitCooldown===0){events.push('collision');state.hitCooldown=.7;}
    // Remove the velocity into the obstacle and retain tangential motion.
    if(inward<0){const sx=vx-nx*inward,sz=vz-nz*inward;state.speed=Math.hypot(sx,sz)*Math.sign(state.speed);if(Math.abs(state.speed)>.1)state.motionHeading=Math.atan2(-sx*Math.sign(state.speed),-sz*Math.sign(state.speed));state.yawRate*=.85;}
    if(length<.000001)state.speed=0;
  }
  const travelled=Math.hypot(state.x-oldX,state.z-oldZ);state.distance+=travelled;state.wheelTravel+=travelled*Math.sign(oldSpeed||state.speed);
  if(state.grounded)accumulateWheelTravel(state,spec,oldX,oldZ,oldHeading);
  else for(let i=0;i<4;i++)state.wheelDistances[i]+=distance;
  const surface=world.surface(state.x,state.z),ground=surface.height+.55,previousGround=start.height+.55,supportVelocity=Math.abs(state.speed*supportGrade)+.1,groundVelocity=clamp((ground-previousGround)/dt,-supportVelocity,supportVelocity);
  if(state.grounded){
    if(Math.abs(state.speed)>12&&state.verticalSpeed-groundVelocity>1.5&&ground<state.y+state.verticalSpeed*dt-9.81*dt*dt){state.grounded=false;state.verticalSpeed-=9.81*dt;state.y+=state.verticalSpeed*dt;}
    else {state.y=ground;state.verticalSpeed=groundVelocity;}
  }else{state.verticalSpeed-=9.81*dt;state.y+=state.verticalSpeed*dt;if(state.y<=ground){if(state.verticalSpeed<-4)events.push('land');state.y=ground;state.verticalSpeed=groundVelocity;state.grounded=true;}}
  state.longitudinalAcceleration+=(clamp((state.speed-oldSpeed)/dt,-18,12)-state.longitudinalAcceleration)*(1-Math.exp(-10*dt));
  if(surface.water){state.waterTime+=dt;state.speed*=Math.exp(-3*dt);if(state.waterTime>2.5){recoverCar(state,world);events.push('recover');}}
  else {state.waterTime=0;if(surface.onRoad&&!movement.hit&&state.grounded)state.lastSafe={x:state.x,z:state.z,heading:state.heading};}
  return events;
}

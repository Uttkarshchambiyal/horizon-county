// Coordinates: local -Z is forward, +X is right, positive yaw/steer is left.
// Rear-axle bicycle kinematics; Ackermann angles share its turning centre.
export function wheelAngles(steer,wheelbase,track){
  if(Math.abs(steer)<1e-7)return {left:0,right:0};
  const k=Math.tan(steer)/wheelbase;
  return {left:Math.atan(wheelbase*k/(1-k*track/2)),right:Math.atan(wheelbase*k/(1+k*track/2))};
}
export const rearAxle=spec=>(spec.wheels[2][2]+spec.wheels[3][2])/2;
// Responsive arcade road tuning, not measured manufacturer tire data.
export function roadCorneringGrip(speed,grip){
  const t=Math.max(0,Math.min(1,(Math.abs(speed)-20)/20));
  return grip*(1+1.5*t*t*(3-2*t));
}
// Keep useful physical rack travel at speed. Tire slip limits the path rather
// than hiding the driver's steering by clamping the visible wheels to ~1°.
export function rackLimit(speed,gripAngle){
  const t=Math.max(0,Math.min(1,(Math.abs(speed)-20)/20));
  return Math.max(gripAngle,.14*t*t*(3-2*t));
}
export function steeringLimit(speed,wheelbase,grip){
  return Math.min(.56,Math.atan(grip*wheelbase/Math.max(1,speed*speed)));
}
export function advanceAxles(x,z,heading,spec,distance,steer){
  const k=Math.tan(steer)/spec.wheelbase,turn=distance*k,mid=heading+turn/2;
  const sinc=Math.abs(turn)<1e-5?1-turn*turn/24:Math.sin(turn/2)/(turn/2),rear=rearAxle(spec),next=heading+turn;
  // Advance the rear axle along its exact arc, then recover the body origin.
  return {x:x-distance*sinc*Math.sin(mid)+rear*(Math.sin(heading)-Math.sin(next)),
    z:z-distance*sinc*Math.cos(mid)+rear*(Math.cos(heading)-Math.cos(next)),heading:next};
}
export function accumulateWheelTravel(state,spec,oldX,oldZ,oldHeading){
  const distances=state.wheelDistances||(state.wheelDistances=[0,0,0,0]),angles=wheelAngles(state.steerAngle,spec.wheelbase,spec.track),mid=(oldHeading+state.heading)/2;
  const dc=Math.cos(state.heading)-Math.cos(oldHeading),ds=Math.sin(state.heading)-Math.sin(oldHeading);
  for(let i=0;i<4;i++){
    const [x,,z]=spec.wheels[i],dx=state.x-oldX+x*dc+z*ds,dz=state.z-oldZ-x*ds+z*dc;
    const direction=mid+(i<2?(i===0?angles.left:angles.right):0);
    distances[i]+=-dx*Math.sin(direction)-dz*Math.cos(direction);
  }
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function createPedestrianMotion(world){
  const paths=[...world.life.walkers];
  // Cross at the marked stop-line side of junctions. Walkers enter only at
  // the start of a long red phase, and cars yield if one is still crossing.
  for(const [x,z,width] of[[0,320,30],[-240,320,22],[240,80,22],[480,560,22]])for(const direction of[-1,1])paths.push({x1:x-direction*(width/2+2.4),z1:z+19+direction*.55,x2:x+direction*(width/2+2.4),z2:z+19+direction*.55,speed:2.4,seed:0,crossing:true});
  const people=paths.map((p,i)=>({...p,id:i,phase:p.seed||0,progress:0,direction:1,wait:0,crossingNow:false,heading:0,headTurn:0,offsetX:0,offsetZ:0,alert:0,gesture:0,x:p.x1,z:p.z1,colour:[0x416778,0xb66b48,0x79836b,0xc6bfa5,0x4e5761,0x8e6470][i%6],skin:[0xe0b997,0xb8845f,0x865c43,0xd2a17d][i%4]}));
  const nearby=[],stats={alert:0,crossing:0};let lastTime=-1,lastX=Infinity,lastZ=Infinity,lastHorn=-1;
  function update(time,focus,context={}){
    const horn=context.hornUntil||0;if(time===lastTime&&focus.x===lastX&&focus.z===lastZ&&horn===lastHorn)return false;
    const dt=lastTime<0?0:Math.min(.1,Math.max(0,time-lastTime));lastTime=time;lastX=focus.x;lastZ=focus.z;lastHorn=horn;nearby.length=0;stats.alert=0;stats.crossing=0;
    const speed=focus.speed||0,heading=focus.motionHeading??focus.heading??0,vx=-Math.sin(heading)*speed,vz=-Math.cos(heading)*speed,v2=vx*vx+vz*vz,signalTime=context.trafficTime??time,phase=((signalTime%32)+32)%32;
    for(const p of people){
      const dx=p.x2-p.x1,dz=p.z2-p.z1,length=Math.hypot(dx,dz),midX=(p.x1+p.x2)/2,midZ=(p.z1+p.z2)/2;
      if(Math.hypot(midX-focus.x,midZ-focus.z)>150+length/2){if(!p.crossing)p.phase=time*p.speed*2/length+p.seed;p.alert=0;p.offsetX=p.offsetZ=0;continue;}
      if(p.crossing){
        p.wait=Math.max(0,p.wait-dt);
        if(!p.crossingNow&&p.wait===0&&(context.signalsEnabled===false||phase>=14.1&&phase<32-length/p.speed-1))p.crossingNow=true;
        if(p.crossingNow){p.progress=clamp(p.progress+p.direction*dt*p.speed/length,0,1);if(p.progress===0||p.progress===1){p.crossingNow=false;p.direction*=-1;p.wait=8;}}
      }else if(p.alert<=0)p.phase+=dt*p.speed*2/length;
      const t=p.crossing?p.progress:.5-.5*Math.cos(p.phase),baseX=p.x1+dx*t,baseZ=p.z1+dz*t;
      let x=baseX+p.offsetX,z=baseZ+p.offsetZ,px=x-focus.x,pz=z-focus.z,distance=Math.hypot(px,pz),ahead=v2>1?clamp((px*vx+pz*vz)/v2,0,1.7):0,predicted=Math.hypot(px-vx*ahead,pz-vz*ahead);
      const danger=distance<3.5||Math.abs(speed)>3&&distance<32&&ahead>.01&&predicted<3.2,heard=horn>time&&distance<28;
      p.alert=Math.max(0,p.alert-dt);if(danger)p.alert=1.6;else if(heard)p.alert=Math.max(p.alert,.7);
      let targetX=0,targetZ=0;
      if(danger&&distance>.01){if(v2>9){const v=Math.sqrt(v2),nx=-vz/v,nz=vx/v,side=px*nx+pz*nz<0?-1:1;targetX=nx*side*2.1;targetZ=nz*side*2.1;}else{targetX=px/distance*1.65;targetZ=pz/distance*1.65;}}
      if(p.alert>0&&!danger){targetX=p.offsetX;targetZ=p.offsetZ;}
      const blend=1-Math.exp(-(danger?7:2.5)*dt),ox=p.offsetX+(targetX-p.offsetX)*blend,oz=p.offsetZ+(targetZ-p.offsetZ)*blend;
      const candidateX=baseX+ox,candidateZ=baseZ+oz,surface=world.surface(candidateX,candidateZ);
      if(!surface.water&&Math.abs(surface.height-world.surface(baseX,baseZ).height)<.55&&!world.resolve(candidateX,candidateZ,0,.32,0).hit){p.offsetX=ox;p.offsetZ=oz;}
      x=baseX+p.offsetX;z=baseZ+p.offsetZ;distance=Math.hypot(x-focus.x,z-focus.z);p.x=x;p.z=z;if(distance>115)continue;
      const direction=p.crossing?p.direction:Math.sin(p.phase)>=0?1:-1,targetHeading=Math.atan2(-dx*direction,-dz*direction);p.heading+=angle(targetHeading,p.heading)*(1-Math.exp(-9*dt));
      const look=p.alert>0?clamp(angle(Math.atan2(focus.x-x,focus.z-z)+Math.PI,p.heading),-.95,.95):0;p.headTurn+=angle(look,p.headTurn)*(1-Math.exp(-8*dt));
      p.gesture+=((p.alert>0?(danger?.7:.25):0)-p.gesture)*(1-Math.exp(-8*dt));
      p.stride=p.alert>0&&!p.crossingNow?0:Math.sin(time*p.speed*7+p.seed)*.32*(p.crossing?(p.crossingNow?1:0):Math.abs(Math.sin(p.phase)));
      if(p.alert>0)stats.alert++;if(p.crossingNow)stats.crossing++;nearby.push(p);
    }
    return true;
  }
  return {people,nearby,stats,update};
}

export function createRegionLayout(world,height,coast,random){
  const items=[],roadSamples=world.roads.flatMap(road=>road.samples.map(p=>({...p,half:road.width/2})));
  const clearRoad=(x,z,r,buffer)=>!roadSamples.some(p=>Math.hypot(p.x-x,p.z-z)<p.half+r+buffer);
  function add(type,x,z,r=2,angle=0,solid=false,site='landscape',buffer=10){
    const y=height(x,z);
    if(y<.4||!clearRoad(x,z,r,buffer))return null;
    if(world.buildings.some(b=>Math.abs(b.x-x)<b.w/2+r+3&&Math.abs(b.z-z)<b.d/2+r+3))return null;
    if(items.some(i=>i.site===site&&i.solid&&Math.hypot(i.x-x,i.z-z)<i.r+r+1))return null;
    const item={type,x,z,y,r,angle,solid,site,seed:Math.floor(random()*10000)};items.push(item);return item;
  }
  // Furniture belongs to five beach clubs, with clear access along the shore.
  for(const [index,z] of[-265,-20,460,740,940].entries()){
    const site='beach-'+index,shore=coast(z),tower=add('lifeguard',shore+101,z,3,Math.PI/2,true,site);
    if(!tower)continue;
    for(const row of[-1,1])for(const col of[-2,-1,0,1,2]){
      const uz=z+col*11,ux=coast(uz)+63+row*13;
      const umbrella=add('umbrella',ux,uz,2.5,Math.PI/2,false,site);
      if(umbrella){add('lounger',ux+2.7,uz-1.2,1.2,Math.PI/2,false,site);add('towel',ux-2,uz+1,1,Math.PI/2,false,site);}
    }
    add('surfboards',shore+107,z-11,2,Math.PI/2,false,site);add('shower',shore+114,z-13,1,0,false,site);
    add('kiosk',coast(z+31)+106,z+31,4,Math.PI/2,true,site);add('picnic',coast(z+40)+113,z+40,3,0,false,site);
    add('volleyball',coast(z-43)+76,z-43,9,0,false,site);
  }
  const ridge=world.roads.find(r=>r.id==='ridge');
  // Each mountain stop has a signed turnout, a footpath and an observation deck.
  for(const [index,distance] of[420,1050,1830,2720].entries()){
    const f=ridge.frame(distance),side=index===1?-1:1,site='ridge-'+index,angle=f.angle;
    const at=(along,off)=>({x:f.x+f.tx*along+f.nx*side*off,z:f.z+f.tz*along+f.nz*side*off});
    const p=at(0,42),deck=add('lookout',p.x,p.z,7,angle,true,site);
    if(!deck)continue;
    const pad=at(-12,26);add('turnout',pad.x,pad.z,8,angle,false,site,3);
    const sign=at(-23,24);add('trail-sign',sign.x,sign.z,1,angle,false,site,5);
    const table=at(15,42);add('picnic',table.x,table.z,3,angle,false,site);
    if(index===0||index===2){
      const t=at(22,64),camp=add('tent',t.x,t.z,4,angle,true,site);
      if(camp){const fire=at(12,64);add('campfire',fire.x,fire.z,2,angle,false,site);}
      const c=at(-21,67);add('cabin',c.x,c.z,5,angle,true,site);
    }
    // Short gravel paths lead from the parking bay to the lookout.
    for(let off=29;off<38;off+=3){const q=at(0,off);add('path',q.x,q.z,1.5,angle,false,site,3);}
  }
  // Forests and rock outcrops stay well beyond road shoulders and recreation sites.
  for(let i=0;i<480;i++){
    const x=-780+random()*2400,z=-650-random()*1400;if(height(x,z)<25)continue;
    if(items.some(p=>p.site!=='landscape'&&Math.hypot(p.x-x,p.z-z)<p.r+20))continue;
    const rock=i%4===0;add(rock?'rock':'pine',x,z,rock?3+random()*3:2.8,random()*6.28,false,'landscape',rock?28:16);
  }
  // Denser groves frame the pass while keeping open shoulders and viewpoints.
  for(const distance of[520,980,1550,2240,2800]){
    const f=ridge.frame(distance);for(const side of[-1,1])for(let n=0;n<30;n++){
      const along=(random()-.5)*110,off=65+random()*85,x=f.x+f.tx*along+f.nx*side*off,z=f.z+f.tz*along+f.nz*side*off;
      if(height(x,z)<25||items.some(i=>i.site!=='landscape'&&Math.hypot(i.x-x,i.z-z)<i.r+25)||items.some(i=>Math.hypot(i.x-x,i.z-z)<5))continue;
      add('pine',x,z,2.8,random()*6.28,false,'landscape',18);
    }
  }
  // Continuous woodland edges replace long bare stretches between viewpoints.
  for(let distance=60;distance<ridge.length-40;distance+=36){const f=ridge.frame(distance);
    for(const side of[-1,1])for(const off of[24,37,53,72]){
      const along=(random()-.5)*26,x=f.x+f.tx*along+f.nx*side*(off+random()*7),z=f.z+f.tz*along+f.nz*side*(off+random()*7);
      if(height(x,z)<15||items.some(p=>p.site!=='landscape'&&Math.hypot(p.x-x,p.z-z)<p.r+18)||items.some(p=>Math.hypot(p.x-x,p.z-z)<4.2))continue;
      add(random()>.73?'birch':'pine',x,z,2.8,random()*6.28,false,'landscape',9);
    }
  }
  return items;
}

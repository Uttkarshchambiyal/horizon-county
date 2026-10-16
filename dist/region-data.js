export function createRegionLayout(world,height,coast,random){
  const items=[];
  function add(type,x,z,r=2,angle=0,solid=false){
    const y=height(x,z),road=world.nearestRoad(x,z);
    if(y<.35||road&&road.distance<road.road.width/2+r+5)return;
    if(world.buildings.some(b=>Math.abs(b.x-x)<b.w/2+r+2&&Math.abs(b.z-z)<b.d/2+r+2))return;
    items.push({type,x,z,y,r,angle,solid,seed:Math.floor(random()*10000)});
  }
  for(let z=-340;z<1000;z+=45){
    const shore=coast(z);
    add('umbrella',shore+58+random()*24,z,2.5,random()*6.28);
    add('lounger',shore+79,z+7,1.2,1.55);add('towel',shore+50,z+12,1,random()*6.28);
    if(Math.round(z/45)%3===0)add('surfboards',shore+111,z,2,1.5);
  }
  for(const z of[-260,180,650,920])add('lifeguard',coast(z)+95,z,5,Math.PI/2,true);
  for(const z of[-80,420,820]){add('kiosk',coast(z)+134,z,5,Math.PI/2,true);add('volleyball',coast(z)+83,z+28,9);}
  for(let z=-200;z<1000;z+=85){add('shower',coast(z)+127,z,1);add('picnic',coast(z)+143,z+12,3);}
  const ridge=world.roads.find(r=>r.id==='ridge');
  for(const distance of[420,1050,1830,2720]){
    const f=ridge.frame(distance),side=distance===1050?-1:1,x=f.x+f.nx*side*38,z=f.z+f.nz*side*38;
    add('lookout',x,z,7,f.angle,true);add('trail-sign',f.x+f.nx*side*16,f.z+f.nz*side*16,1,f.angle);
    add('tent',x+15,z+10,4,f.angle,true);add('picnic',x-12,z+9,3,f.angle);add('campfire',x+11,z-1,2);
    add('cabin',x+24,z-15,6,f.angle,true);
  }
  for(let i=0;i<480;i++){
    const x=-780+random()*2400,z=-600-random()*1450,y=height(x,z);if(y<25)continue;
    add(i%4===0?'rock':'pine',x,z,i%4===0?3+random()*3:2.8,random()*6.28);
  }
  return items;
}

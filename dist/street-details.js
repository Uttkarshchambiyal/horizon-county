// Small, intentional scenes at shop entrances and front gardens.
export function createStreetDetails(world,height){
  const items=[];
  for(const b of world.buildings){
    if(!['retail','motel','apartment','loft','house','villa'].includes(b.type))continue;
    const angle=b.facing||0,swap=Math.abs(Math.sin(angle))>.7,w=swap?b.d:b.w,d=swap?b.w:b.d;
    const add=(type,localX,localZ,r)=>{
      const x=b.x+localX*Math.cos(angle)+localZ*Math.sin(angle),z=b.z-localX*Math.sin(angle)+localZ*Math.cos(angle),road=world.nearestRoad(x,z);
      if(road&&road.distance<road.road.width/2+r+3)return;
      if(world.buildings.some(p=>Math.abs(p.x-x)<p.w/2+r+.5&&Math.abs(p.z-z)<p.d/2+r+.5))return;
      items.push({type,x,z,y:height(x,z),angle,building:b.id,r,solid:type==='planter'||type==='terrace'});
    };
    if(b.type==='retail')for(const side of[-1,1])add('terrace',side*w*.26,d/2+4.4,.8);
    if(b.id%2===0)for(const side of[-1,1])add('planter',side*w*.38,d/2+3,.65);
    if(b.type==='loft'&&b.id%3===0)add('bike-rack',-w*.3,d/2+4,1.1);
  }
  return items;
}

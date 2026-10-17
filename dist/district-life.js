import * as THREE from './vendor/three.module.min.js';
// Authored scenes use the same road/building footprints as driving. Small
// details are rendered through the city's existing shared material batches.
export function createDistrictLife(world,height,coast,random){
  const props=[],parking=[],walkers=[],decks=[],footprints=[];
  const clear=(x,z,w,d,angle=0,margin=3)=>{
    const c=Math.cos(angle),s=Math.sin(angle);
    for(const [lx,lz] of[[0,0],[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]]){
      const px=x+lx*c+lz*s,pz=z-lx*s+lz*c,r=world.nearestRoad(px,pz);
      if(r&&r.distance<r.road.width/2+margin)return false;
      if(world.buildings.some(b=>Math.abs(b.x-px)<b.w/2+1&&Math.abs(b.z-pz)<b.d/2+1))return false;
    }return true;
  };
  function footprint(x,z,w,d,angle,type){
    const halfX=w/2,halfZ=d/2,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle)),dx=c*halfX+s*halfZ,dz=s*halfX+c*halfZ;
    footprints.push({cx:x,cz:z,halfX,halfZ,angle,type,minX:x-dx,maxX:x+dx,minZ:z-dz,maxZ:z+dz});
  }
  function add(kind,x,z,w,d,site,variant=0,solid=false,angle=0,y=height(x,z)){
    if(!clear(x,z,w,d,angle)||height(x,z)<.3)return null;
    const item={kind,x,z,w,d,site,variant,angle,y};props.push(item);
    const at=(lx,lz,bw,bd,type=kind)=>footprint(x+lx*Math.cos(angle)+lz*Math.sin(angle),z-lx*Math.sin(angle)+lz*Math.cos(angle),bw,bd,angle,type);
    if(kind==='plane'){at(0,0,1.25,9.5);for(const side of[-1,1])at(side*1.3,.7,.4,.6);}
    else if(kind==='recycling')for(const side of[-1,0,1])at(side*1.6,0,1.3,1.3);
    else if(kind==='market')at(0,0,6.2,3.3);
    else if(kind==='pergola'||kind==='bike-shelter')for(const sx of[-1,1])for(const sz of[-1,1])at(sx*(w/2-.3),sz*(d/2-.3),.16,.16);
    else if(kind==='carwash'){for(const side of[-1,1]){at(side*5,0,.4,8);at(side*3.6,0,1,1);}}
    else if(kind==='gantry')for(const side of[-1,1])at(side*11,0,4,5);
    else if(kind==='court')for(const side of[-1,1])at(side*(w/2-1),0,.1,.1);
    else if(kind==='promenade'){at(0,0,3,.6);at(2,0,.64,.64);at(-2,0,.14,.14);}
    else if(kind==='playground'){for(const side of[-1,1])for(const end of[-1,1])at(side*4,end*2,.17,.17);at(8,2,3,3);}
    else if(kind==='tower')at(0,0,7,7);
    else if(solid||kind==='garden')footprint(x,z,w,d,angle,kind);
    return item;
  }
  function park(x,z,heading=0,site='curb',y=height(x,z)+.04){
    const road=world.nearestRoad(x,z);if(site==='curb'&&(!road||road.distance<6.5||Math.abs(Math.sin(road.angle-heading))>.15))return;
    const w=Math.abs(Math.cos(heading))*2.3+Math.abs(Math.sin(heading))*5.7,d=Math.abs(Math.sin(heading))*2.3+Math.abs(Math.cos(heading))*5.7;
    if(world.buildings.some(b=>Math.abs(b.x-x)<(b.w+w)/2+.5&&Math.abs(b.z-z)<(b.d+d)/2+.5)||parking.some(p=>Math.hypot(p.x-x,p.z-z)<7))return;
    parking.push({x,z,heading,y,color:Math.floor(random()*6),site});footprint(x,z,2.2,5.5,heading,'parked-car');
  }
  for(const b of world.blocks){
    const {x,z,id,use,y}=b,site='block-'+id;
    if(use==='parking'){
      for(const dx of[-40,-25,-10,10,25,40])for(const side of[-1,1])if((id+dx+side)%3!==0)park(x+dx,z+side*37,side>0?0:Math.PI,site,y+.14);
      add('bike-shelter',x+42,z+5,7,4,site,0,true,0,y+.19);
      add('garden',x-42,z+5,9,6,site,1,false,0,y+.19);
    }else if(use==='park'){
      add(id%2?'playground':'court',x-31,z,26,17,site,id%3,false,0,y+.19);
      add('garden',x+26,z-17,15,9,site,id%3,false,0,y+.19);
      add('pergola',x+25,z+17,11,7,site,0,false,0,y+.19);
    }else if(use==='plaza'){
      for(const sx of[-1,1])for(const sz of[-1,1])add('market',x+sx*26,z+sz*22,7,4,site,(sx+sz+4)%3,true,sz>0?0:Math.PI,y+.19);
      add('sculpture',x,z-37,5,5,site,0,true,0,y+.19);
    }else if(use==='service'){
      add('carwash',x+43,z+22,13,9,site,0,false,0,y+.19);
      add('recycling',x-43,z-25,6,3,site,0,true,0,y+.19);
    }else{
      for(const side of[-1,1]){
        add('garden',x+side*46,z-8,8,19,site,id%3,false,0,y+.19);
        add(id%3?'pergola':'bike-shelter',x+side*42,z+44,9,5,site,id%3,false,0,y+.19);
      }
      if(id%4===1)add('recycling',x-42,z-43,5,2.5,site,0,true,0,y+.19);
    }
  }
  // Curb bays occupy the unused outer lane and stay clear of every junction.
  for(const road of world.roads.filter(r=>r.kind==='street'&&r.length>1000))for(let s=112;s<road.length-90;s+=240){
    const f=road.frame(s);
    if(world.xs.some(x=>Math.abs(f.x-x)<42)&&world.zs.some(z=>Math.abs(f.z-z)<42))continue;
    const side=Math.floor(s/240)%2?1:-1,off=road.width/2-2.1;
    park(f.x+f.nx*off*side,f.z+f.nz*off*side,f.angle+(side>0?Math.PI:0),'curb');
  }
  // A quay, freight yard and airport apron occupy their own service areas.
  for(const z of[1000,1040,1128,1175])for(const x of[330,390,570,630,840,900]){
    if(add('container',x,z,12.2,2.6,'port',Math.floor(random()*4),true)){
      if(random()>.4)add('container-stack',x,z+5,12.2,2.6,'port',Math.floor(random()*4),true);
    }
  }
  for(const x of[360,575,830])add('gantry',x,1168,26,17,'port',0,false);
  for(const x of[1128,1150,1300])for(const z of[-310,-230,-70,10]){
    add('plane',x,z,18,18,'airfield',Math.floor(random()*2),true,Math.PI/2);
  }
  for(const z of[-315,-235,-75,5])add('equipment',1228,z,7,5,'airfield',0,true);
  add('tower',1370,60,10,10,'airfield',0,true);
  // Continuous shoreline-aligned decking replaces the buried fixed-height slab.
  decks.push({kind:'boardwalk',minZ:-350,maxZ:1050,width:7.5,offset:92,minimum:-10});
  const shore=coast(320);decks.push({kind:'pier',minX:shore-100,maxX:shore+96,minZ:314,maxZ:326,minimum:1.5});
  const coastRoad=world.roads.find(r=>r.id==='coast');
  for(const z of[-265,-20,460,740,940]){const f=coastRoad.samples.filter(p=>p.x<-700).reduce((a,b)=>Math.abs(a.z-z)<Math.abs(b.z-z)?a:b);const start=coast(z)+92,end=f.x-coastRoad.width/2-2;if(end>start)decks.push({kind:'access',minX:start-1,maxX:end,minZ:z-1.9,maxZ:z+1.9,minimum:-10});}
  for(let s=40;s<coastRoad.length;s+=55){const f=coastRoad.frame(s);if(f.x<-700&&f.z>-500&&f.z<1030)add('garden',f.x+f.nx*33,f.z+f.nz*33,4,12,'coast-frontage',Math.floor(random()*3),false,f.angle);}
  decks.push({kind:'marina',minX:688,maxX:696,minZ:1185,maxZ:1390,minimum:1.4});
  for(const z of[1280,1320,1360])decks.push({kind:'marina',minX:644,maxX:740,minZ:z-2.3,maxZ:z+2.3,minimum:1.4});
  // Promenade benches, lamps and planted dunes form clusters by beach access.
  for(let z=-320;z<1040;z+=70){
    const x=coast(z)+92;add('promenade',x+7,z,4,3,'beach-access',Math.floor(z/70)%3,false);
  }
  for(let z=-300;z<1050;z+=31)for(const side of[-1,1]){
    const x=coast(z)+43+side*9;add('dune',x,z,5,5,'dunes',Math.floor(random()*3),false);
  }
  for(const z of[1266,1306,1346,1380])for(const x of[660,722]){
    props.push({kind:'boat',x,z,y:.05,w:4,d:9,angle:0,variant:Math.floor(random()*3),site:'marina'});
  }
  // Trail-edge plants/logs frame the mountain route without blocking shoulders.
  const ridge=world.roads.find(r=>r.id==='ridge');
  for(let s=80;s<ridge.length-60;s+=42){const f=ridge.frame(s);for(const side of[-1,1]){
    const off=ridge.width/2+13+random()*8,x=f.x+f.nx*side*off,z=f.z+f.nz*side*off;
    add(s%126<42?'log':'scrub',x,z,5,4,'ridge-verge',Math.floor(random()*3),false,f.angle);
  }}
  // People stay on sidewalks and paths; none of these paths crosses traffic.
  for(const road of world.roads.filter(r=>r.kind==='street'||r.kind==='highway'))for(let s=64;s<road.length-54;s+=75){
    for(const side of[-1,1]){
      const a=road.frame(s-9),b=road.frame(s+9);if(road.kind==='highway'&&[a,b].some(f=>f.x>=-700||f.z<=-500||f.z>=1030))continue;
      const off=road.width/2+(road.kind==='highway'?3.6:5.2),x1=a.x+a.nx*off*side,z1=a.z+a.nz*off*side,x2=b.x+b.nx*off*side,z2=b.z+b.nz*off*side;
      if([a,b].some(f=>world.xs.some(x=>Math.abs(f.x-x)<30)&&world.zs.some(z=>Math.abs(f.z-z)<30)))continue;
      if(!clear((x1+x2)/2,(z1+z2)/2,Math.abs(x2-x1)+1,Math.abs(z2-z1)+1,0,3))continue;
      const person={x1,z1,x2,z2,rise:.16,seed:random()*100,speed:.9+random()*.35,site:'sidewalk'};walkers.push(person);
      if(random()>.6)walkers.push({...person,x1:x1+a.nx*.8,z1:z1+a.nz*.8,x2:x2+b.nx*.8,z2:z2+b.nz*.8,seed:person.seed+.02});
    }
  }
  for(let z=-290;z<1000;z+=65)walkers.push({x1:coast(z)+92,z1:z,x2:coast(z+22)+92,z2:z+22,rise:.095,seed:random()*100,speed:.8+random()*.4,site:'boardwalk'});
  for(const p of props.filter(p=>p.kind==='market'||p.kind==='pergola')){
    const off=p.kind==='market'?-2.8:0,c=Math.cos(p.angle),s=Math.sin(p.angle);walkers.push({x1:p.x-1.5*c+off*s,z1:p.z+1.5*s+off*c,x2:p.x+1.5*c+off*s,z2:p.z-1.5*s+off*c,rise:p.y-height(p.x,p.z),seed:random()*100,speed:.45,site:p.kind});
  }
  for(const z of[1250,1300,1350])walkers.push({x1:692,z1:z,x2:692,z2:z+8,rise:0,seed:random()*100,speed:.6,site:'marina'});
  const rails=[];
  for(const deck of decks.filter(d=>d.kind!=='boardwalk')){
    const alongX=deck.maxX-deck.minX>deck.maxZ-deck.minZ,min=alongX?deck.minX:deck.minZ,max=alongX?deck.maxX:deck.maxZ,steps=Math.ceil((max-min)/3);
    for(const side of[-1,1])for(let n=0;n<steps;n++){
      const t0=min+(max-min)*n/steps,t1=min+(max-min)*(n+1)/steps,edge=(alongX?(side<0?deck.minZ:deck.maxZ):(side<0?deck.minX:deck.maxX))-.2*side,a=alongX?{x:t0,z:edge}:{x:edge,z:t0},b=alongX?{x:t1,z:edge}:{x:edge,z:t1},x=(a.x+b.x)/2,z=(a.z+b.z)/2,r=world.nearestRoad(x,z);
      if(r&&r.distance<r.road.width/2+1||decks.some(d=>d!==deck&&deckSurface([d],x,z,height,coast)!==null))continue;
      a.y=Math.max(height(a.x,a.z)+.095,deck.minimum);b.y=Math.max(height(b.x,b.z)+.095,deck.minimum);rails.push({a,b});footprint(x,z,alongX?t1-t0:.12,alongX?.12:t1-t0,0,'deck-rail');
    }
  }
  const surfaces=[];for(const p of props){const shape=p.kind==='plane'?[18,18,.03]:p.kind==='court'?[p.w,p.d,.0625]:p.kind==='playground'?[p.w,p.d,.075]:p.kind==='carwash'?[12,8,.08]:null;if(shape)surfaces.push({x:p.x,z:p.z,w:shape[0],d:shape[1],angle:p.angle,height:p.y+shape[2]});}
  return {props,parking,walkers,decks,rails,surfaces,footprints};
}

export function deckSurface(decks,x,z,height,coast){
  for(const deck of decks){
    if(z<deck.minZ||z>deck.maxZ)continue;
    if(deck.kind==='boardwalk'?Math.abs(x-coast(z)-deck.offset)>deck.width/2:x<deck.minX||x>deck.maxX)continue;
    return Math.max(height(x,z)+.095,deck.minimum);
  }return null;
}

export function drawDistrictLife(world,{box:B,column:C,crown:S,put,roof,materials:m}){
  const {stone,concrete,dark,wood,white,teal,red,yellow,green,grass,glass}=m,colours=[teal,red,yellow,green];
  const tyre=new THREE.CylinderGeometry(1,1,1,8).rotateZ(Math.PI/2);
  for(const i of world.life.props){
    const {x,z,y,angle:a=0,w,d,variant:v=0}=i,paint=colours[(v+4)%4];
    const pos=(lx,lz)=>[x+lx*Math.cos(a)+lz*Math.sin(a),z-lx*Math.sin(a)+lz*Math.cos(a)];
    const b=(bw,bh,bd,mat,lx,cy,lz,r=0)=>{const p=pos(lx,lz);B(bw,bh,bd,mat,p[0],y+cy,p[1],a+r);};
    const c=(r,h,mat,lx,cy,lz)=>{const p=pos(lx,lz);C(r,h,mat,p[0],y+cy,p[1]);};
    const s=(r,h,mat,lx,cy,lz)=>{const p=pos(lx,lz);S(r,h,mat,p[0],y+cy,p[1]);};
    if(['container','container-stack','tower','market','plane','equipment'].includes(i.kind)){const bottom=Math.min(...[-1,1].flatMap(sx=>[-1,1].map(sz=>{const p=pos(sx*w/2,sz*d/2);return world.terrainHeight(...p);})));if(y-bottom>.08)b(w,y-bottom+.08,d,concrete,0,-(y-bottom)/2,0);}
    if(i.kind==='garden'){
      b(w,.18,d,stone,0,.12,0);b(w-.5,.06,d-.5,dark,0,.24,0);
      for(let lx=-w/2+1;lx<w/2;lx+=2.3)for(let lz=-d/2+1;lz<d/2;lz+=2.7){s(.72,.5,green,lx,.65,lz);if((lx+lz)%3<1)c(.17,.3,paint,lx,.95,lz);}
    }
    if(i.kind==='pergola'||i.kind==='bike-shelter'){
      for(const sx of[-1,1])for(const sz of[-1,1])b(.16,2.8,.16,wood,sx*(w/2-.3),1.4,sz*(d/2-.3));
      for(let lx=-w/2;lx<=w/2;lx+=.75)b(.15,.14,d+.7,wood,lx,2.8,0);
      for(const side of[-1,1]){b(w-1,.12,.55,wood,0,.55,side*(d/2-.7));b(.15,.5,d-1,dark,side*(w/2-1),.25,0);}
      if(i.kind==='bike-shelter')for(let lx=-w/2+1;lx<w/2;lx+=1.4){b(.06,.8,.06,dark,lx,.4,-.4);b(.06,.8,.06,dark,lx,.4,.4);b(.06,.06,.8,dark,lx,.8,0);}
    }
    if(i.kind==='market'){
      b(6.2,.14,3.3,wood,0,1,0);for(const sx of[-1,1])for(const sz of[-1,1])b(.1,2.8,.1,dark,sx*2.8,1.4,sz*1.4);
      b(7,.2,4,paint,0,2.85,0);for(let lx=-2.7;lx<3;lx+=.9)b(.42,.25,1.8,v%2?yellow:red,lx,1.2,0);b(1,.9,.8,wood,2,.48,1.2);
    }
    if(i.kind==='court'){
      b(w,.055,d,teal,0,.035,0);for(const side of[-1,1]){b(w-.8,.02,.08,white,0,.075,side*(d/2-.4));b(.08,.02,d-.8,white,side*(w/2-.4),.075,0);b(.1,3.7,.1,dark,side*(w/2-1),1.85,0);b(.12,1.2,1.8,white,side*(w/2-1),3.5,0);b(1.1,.07,.9,red,side*(w/2-1.65),3,0);}b(.08,.02,d-.8,white,0,.075,0);
    }
    if(i.kind==='playground'){
      b(w,.07,d,grass,0,.04,0);for(const side of[-1,1]){for(const end of[-1,1])b(.17,2.8,.17,teal,side*4,1.4,end*2);b(8.2,.16,.16,teal,0,2.8,side*2);b(.13,.16,4,teal,side*2,2.8,0);for(const end of[-1,1])b(.04,2.2,.04,dark,side*2,1.65,end*.5);b(.8,.12,1.1,red,side*2,.48,0);}b(3,1.3,3,wood,8,.65,2);for(let n=0;n<10;n++)b(.5,.14,1.5,yellow,2.75+n*.5,.2+n*.12,2);for(let n=0;n<4;n++)b(1.6,.2,.45,red,8,.2+n*.3,-.3-n*.4);
    }
    if(i.kind==='recycling')for(const side of[-1,0,1]){b(1.3,1.4,1.3,colours[side+1],side*1.6,.7,0);b(1.4,.12,1.4,dark,side*1.6,1.45,0);}
    if(i.kind==='sculpture'){b(5,.45,5,stone,0,.23,0);c(.7,4,teal,0,2.45,0);b(4,.55,.55,yellow,0,4,0,Math.PI/4);}
    if(i.kind==='carwash'){b(12,.08,8,concrete,0,.04,0);for(const side of[-1,1]){b(.4,4,8,teal,side*5,2,0);c(.5,2.6,teal,side*3.6,1.6,0);}b(11,.35,8,white,0,4,0);}
    if(i.kind==='container'||i.kind==='container-stack'){
      const h=i.kind==='container-stack'?5.2:2.6;b(w,h,d,paint,0,h/2,0);for(let lx=-w/2+.3;lx<w/2;lx+=.8)for(const side of[-1,1])b(.07,h-.15,.06,dark,lx,h/2,side*(d/2+.02));for(const side of[-1,1])b(.08,h-.1,d,stone,side*(w/2-.15),h/2,0);
    }
    if(i.kind==='gantry'){
      for(const side of[-1,1]){b(.7,13,2,yellow,side*11,6.5,0);b(4,.5,5,dark,side*11,.3,0);}b(26,1,2,yellow,0,13,0);b(2,2.4,2,glass,-8,11.5,0);b(.06,8.5,.06,dark,0,8.25,0);b(1.4,.2,.2,dark,0,4,0);
    }
    if(i.kind==='equipment'){b(3,1.2,2.2,yellow,0,.8,0);for(const sx of[-1,1])for(const sz of[-1,1])c(.3,.6,dark,sx*1.3,.3,sz*.8);b(5,.12,3,wood,0,.18,0);}
    if(i.kind==='tower'){b(7,15,7,concrete,0,7.5,0);b(10,2.7,10,glass,0,16,0);b(11,.4,11,white,0,17.45,0);c(.12,6,dark,0,20.5,0);}
    if(i.kind==='plane'){
      b(18,.06,18,m.asphalt,0,0,0);b(1.25,1.25,9.5,white,0,1.7,0);b(.95,.5,2.5,glass,0,2.3,-1.6);b(13,.15,2.1,white,0,1.9,.3);b(4,.12,1.3,paint,0,2,4.1);b(.14,1.9,2,paint,0,2.7,3.7);for(const side of[-1,1]){b(.12,1.3,.12,dark,side*1.3,.7,.7);const p=pos(side*1.3,.7);put(tyre,dark,p[0],y+.34,p[1],.24,.34,.34,a);b(.5,.5,2,paint,side*3.2,1.6,-.4);b(.08,2,.13,dark,side*3.2,1.6,-1.48);}b(.12,1.1,.12,dark,0,.6,-3.7);const front=pos(0,-3.7);put(tyre,dark,front[0],y+.28,front[1],.2,.28,.28,a);
    }
    if(i.kind==='promenade'){
      b(3,.13,.6,wood,0,.55,0);b(3,.7,.1,wood,0,.9,.28);for(const side of[-1,1])b(.12,.5,.6,dark,side*1.1,.25,0);c(.32,1,teal,2,.5,0);c(.07,4.7,dark,-2,2.35,0);b(.6,.15,.6,white,-2,4.75,0);
    }
    if(i.kind==='dune'||i.kind==='scrub')for(const [n,lx,lz] of[[0,0,0],[1,-1.2,.6],[2,1.3,-.7]]){s(i.kind==='dune'?.8:1.2,.65+n*.15,green,lx,.55,lz);if(i.kind==='dune')for(const side of[-1,1])b(.04,1,.04,grass,lx+side*.3,.75,lz+.15);}
    if(i.kind==='log'){b(4,.45,.55,wood,0,.35,0);s(.7,.5,green,-1.7,.45,.4);}
    if(i.kind==='boat'){
      b(3.3,.65,8,white,0,.3,0);b(2.8,.15,6.6,wood,0,.72,0);b(2.3,1.5,2.8,glass,0,1.4,.4);b(2.8,.2,3.5,paint,0,2.25,.4);c(.055,5,dark,0,3.2,2);for(const side of[-1,1])for(const end of[-1,1])c(.12,.55,dark,side*1.55,.92,end*2.7);
    }
  }
  return {props:world.life.props.length,walkers:world.life.walkers.length,parked:world.life.parking.length};
}

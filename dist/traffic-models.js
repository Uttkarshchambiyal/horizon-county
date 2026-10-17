import * as THREE from './vendor/three.module.min.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

export {FLEET_TYPES} from './fleet-data.js?v=populated-8';
import {FLEET_FOOTPRINTS} from './fleet-data.js?v=populated-8';
const definitions={
  hatchback:{radius:.31,wheelbase:2.42,height:1.48,cabin:[[-1.04,.82],[-.65,1.39],[.63,1.43],[1.27,.86]]},
  sedan:{radius:.34,wheelbase:2.8,height:1.45,cabin:[[-1.2,.8],[-.57,1.39],[.66,1.4],[1.46,.82]]},
  suv:{radius:.4,wheelbase:2.86,height:1.86,cabin:[[-1.37,1.01],[-.84,1.78],[1.42,1.78],[1.69,1.03]]},
  coupe:{radius:.34,wheelbase:2.65,height:1.25,cabin:[[-1.14,.72],[-.38,1.2],[.56,1.2],[1.4,.72]]},
  pickup:{radius:.4,wheelbase:3.12,height:1.8,cabin:[[-1.38,1.03],[-.84,1.73],[.56,1.73],[.72,1.03]]},
  van:{radius:.36,wheelbase:3.1,height:2.16,cabin:[[-2.12,.98],[-1.72,2.08],[2.13,2.08],[2.25,.98]]}
};
const rubber=new THREE.MeshStandardMaterial({color:0x202428,roughness:.95}),alloy=new THREE.MeshStandardMaterial({color:0xa9afb2,metalness:.85,roughness:.28});
// All fleet cars have their own body profile, glazing, lights and wheelbase.
// Small parts are baked per material; wheel instances remain independent.
export function fleetModel(type){
  const footprint=FLEET_FOOTPRINTS[type]||FLEET_FOOTPRINTS.sedan,spec={...(definitions[type]||definitions.sedan),length:footprint[0],width:footprint[1]},parts=new Map();
  const paint=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.35,roughness:.26,envMapIntensity:.8}),glass=new THREE.MeshStandardMaterial({color:0x28404a,metalness:.4,roughness:.18}),trim=new THREE.MeshStandardMaterial({color:0x252e32,roughness:.65}),head=new THREE.MeshBasicMaterial({color:0xd4e7ea}),tail=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  function add(g,m){g=g.index?g.toNonIndexed():g;g.deleteAttribute('uv');if(!parts.has(m))parts.set(m,[]);parts.get(m).push(g);}
  function box(w,h,d,m,x,y,z){add(new THREE.BoxGeometry(w,h,d).translate(x,y-.55,z),m);}
  function profile(points,width,m){
    const vertices=[],indices=[],shape=points.map(([z,y])=>new THREE.Vector2(z,y));
    for(const side of[-1,1])for(const [z,y] of points)vertices.push(side*width/2,y-.55,z);
    const n=points.length;for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,i+n,j,j+n,i+n);}
    for(const [a,b,c] of THREE.ShapeUtils.triangulateShape(shape,[]))indices.push(c,b,a,a+n,b+n,c+n);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();add(g,m);
  }
  const {length:L,width:W,radius:r,wheelbase:wb,cabin}=spec,bottom=r*.72,deck=type==='coupe'?.72:type==='suv'||type==='pickup'?1.03:.86;
  profile([[-L/2,bottom+.13],[-L/2,deck-.15],[-L*.35,deck],[L*.39,deck],[L/2,deck-.07],[L/2,bottom+.09]],W,paint);
  profile(cabin,W*.83,paint);
  // Side glass panels are inset at each end, with a visible painted B pillar.
  const a=cabin[0],b=cabin[1],c=cabin[2],d=cabin[3],mid=(b[0]+c[0])/2;
  if(type==='van'){
    profile([[a[0]+.1,a[1]+.13],[b[0]+.08,b[1]-.14],[-.52,b[1]-.14],[-.52,a[1]+.13]],W*.838,glass);
    box(.04,.68,1.65,trim,-W*.43,1.45,1.05);box(.04,.68,1.65,trim,W*.43,1.45,1.05);
  }else{
    profile([[a[0]+.18,a[1]+.08],[b[0]+.04,b[1]-.1],[mid-.045,b[1]-.1],[mid-.045,a[1]+.08]],W*.838,glass);
    profile([[mid+.045,d[1]+.08],[mid+.045,c[1]-.1],[c[0]-.07,c[1]-.1],[d[0]-.18,d[1]+.08]],W*.838,glass);
  }
  // Sloping front/rear windshields use the actual cabin angles.
  for(const [p,q] of[[a,b],[c,d]]){
    const dz=q[0]-p[0],dy=q[1]-p[1],g=new THREE.PlaneGeometry(W*.7,Math.hypot(dz,dy)*.78);g.rotateX(Math.atan2(dz,dy));g.translate(0,(p[1]+q[1])/2-.55,(p[0]+q[0])/2);add(g,glass);
  }
  glass.side=THREE.DoubleSide;
  if(type==='pickup'){
    box(W*.84,.08,L*.31,trim,0,.87,L*.28);for(const side of[-1,1])box(.12,.28,L*.35,paint,side*W*.45,1.04,L*.27);box(W*.9,.28,.12,paint,0,1.04,L*.45);
  }
  if(type==='suv'||type==='van')for(const side of[-1,1])box(.055,.07,2.6,trim,side*W*.33,spec.height+.03,.25);
  box(W*.84,.18,.045,trim,0,deck-.27,-L/2-.015);box(W*.63,.13,.05,trim,0,deck-.15,-L/2-.035);
  for(const side of[-1,1]){
    box(W*.23,.13,.065,head,side*W*.34,deck-.05,-L/2-.025);box(W*.16,.14,.065,tail,side*W*.37,deck-.05,L/2+.02);
    box(.15,.13,.27,paint,side*W*.5,deck+.17,-.65);box(.08,.045,.21,alloy,side*W*.425,deck+.11,.15);
    box(.1,.12,L*.68,trim,side*W*.47,bottom,0);
  }
  const wheels=[[-W*.47,r-.55,-wb/2],[W*.47,r-.55,-wb/2],[-W*.47,r-.55,wb/2],[W*.47,r-.55,wb/2]];
  const wheelParts=[];
  const tire=new THREE.CylinderGeometry(r,r,.23,16,1).rotateZ(Math.PI/2);tire.deleteAttribute('uv');
  const rim=new THREE.TorusGeometry(r*.65,.025,6,16).rotateY(Math.PI/2).translate(.125,0,0),rimBack=rim.clone().translate(-.25,0,0),hub=new THREE.CylinderGeometry(r*.17,r*.17,.252,10,1).rotateZ(Math.PI/2);for(const g of[rim,rimBack,hub])g.deleteAttribute('uv');
  const spokes=[];for(let i=0;i<5;i++)spokes.push(new THREE.BoxGeometry(.252,r*.1,r*1.1).rotateX(i*Math.PI/5));
  let spoke=mergeGeometries(spokes.map(g=>{const f=g.toNonIndexed();f.deleteAttribute('uv');return f;}));
  wheelParts.push({geometry:tire,material:rubber},{geometry:mergeGeometries([rim.toNonIndexed(),rimBack.toNonIndexed(),hub.toNonIndexed(),spoke]),material:alloy});
  return {spec,wheels,wheelParts,parts:[...parts].map(([material,geometries])=>({geometry:mergeGeometries(geometries),material,paint:material===paint,tail:material===tail}))};
}
// Keep the exact body silhouette at distance, with one colour-aware draw and
// six-sided fixed tires. Close cars retain independent, animated wheel parts.
export function fleetProxy(model){
  const geometries=[];
  function add(source,colour){const g=source.index?source.toNonIndexed():source.clone();g.deleteAttribute('uv');const c=new THREE.Color(colour),colours=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colours.length;i+=3){colours[i]=c.r;colours[i+1]=c.g;colours[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(colours,3));geometries.push(g);}
  for(const part of model.parts)add(part.geometry,part.paint?0xffffff:part.tail?0x7e2424:part.material.color);
  for(const p of model.wheels)add(new THREE.CylinderGeometry(model.spec.radius,model.spec.radius,.24,6).rotateZ(Math.PI/2).translate(...p),0x25282b);
  const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());return geometry;
}

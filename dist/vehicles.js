import * as THREE from './vendor/three.module.min.js';
export const VEHICLES=[
  {id:'clubsport',name:'H-01 Clubsport',className:'SPORTS COUPE',description:'Low stance. Quick acceleration. Built for the coast road.',color:0xda7944,length:4.8,width:2.16,radius:.45,wheelbase:2.9,roof:1.04,top:58,boostTop:77,accel:14.5,brake:32,turn:.94,grip:17,offRoad:25},
  {id:'touring',name:'T-04 Meridian',className:'TOURING SEDAN',description:'A composed daily driver with a longer wheelbase.',color:0x557d89,length:5.1,width:2.08,radius:.46,wheelbase:3.08,roof:1.23,top:53,boostTop:69,accel:12,brake:31,turn:.83,grip:19,offRoad:29},
  {id:'trail',name:'R-09 Summit',className:'ALL-TERRAIN SUV',description:'Raised ride height. More grip on dirt and hillside roads.',color:0x778077,length:5.15,width:2.26,radius:.51,wheelbase:3.12,roof:1.70,top:46,boostTop:60,accel:10,brake:29,turn:.72,grip:16,offRoad:39}
];
export const vehicleSpec=id=>VEHICLES.find(v=>v.id===id)||VEHICLES[0];
export function createVehicle(parent,id='clubsport',{detail=true}={}){
  const spec=vehicleSpec(id),suv=id==='trail',sedan=id==='touring',root=new THREE.Group();root.name=spec.name;
  const wheels=[],steerWheels=[],flames=[],wheelCenters=[];
  const paint=new THREE.MeshPhysicalMaterial({color:spec.color,metalness:.72,roughness:.24,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.05});
  const trim=new THREE.MeshStandardMaterial({color:0x172027,metalness:.48,roughness:.42});
  const rubber=new THREE.MeshStandardMaterial({color:0x141719,roughness:.9});
  const alloy=new THREE.MeshStandardMaterial({color:0xb4bdc3,metalness:.98,roughness:.23});
  const glass=new THREE.MeshPhysicalMaterial({color:0x152c38,metalness:.24,roughness:.09,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.3});
  const tail=new THREE.MeshStandardMaterial({color:0xf53338,emissive:0xf81a20,emissiveIntensity:1.2});
  const led=new THREE.MeshStandardMaterial({color:0xe8f2fb,emissive:0xc7dfff,emissiveIntensity:1.8});
  const unit=new THREE.BoxGeometry(1,1,1),cyl=new THREE.CylinderGeometry(1,1,1,detail?32:16);
  function mesh(g,m,x=0,y=0,z=0,p=root){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function box(w,h,d,m,x,y,z,p=root){const o=mesh(unit,m,x,y,z,p);o.scale.set(w,h,d);return o;}
  function rod(a,b,r,m,p=root){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),o=mesh(cyl,m,0,0,0,p);o.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);o.scale.set(r,v.length(),r);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
  const half=spec.width/2,L=spec.length/2,axle=spec.wheelbase/2,wheelY=spec.radius-.55;
  const sections=[[-L,.78,.18],[-L+.2,.94,.28],[-axle,1,suv?.76:.60],[-.8,.96,suv?.73:.51],[0,.96,suv?.72:.48],[axle,1.025,suv?.76:.61],[L-.25,.98,suv?.72:.48],[L,.89,suv?.64:.36]];
  function profile(z){let i=0;while(i<sections.length-2&&z>sections[i+1][0])i++;const a=sections[i],b=sections[i+1],t=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0]))),smooth=t*t*(3-2*t);return {w:(a[1]+(b[1]-a[1])*smooth)*half,hi:a[2]+(b[2]-a[2])*smooth};}
  const nz=detail?76:28,nx=detail?24:12,positions=[],indices=[];
  for(let iz=0;iz<=nz;iz++){const z=-L+iz/nz*spec.length,f=profile(z);for(let ix=0;ix<=nx;ix++){const u=ix/nx*2-1;positions.push(u*f.w,f.hi+.055*(1-u*u)-.13*Math.abs(u)**8,z);}}
  for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const a=z*(nx+1)+x,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
  function geometry(p,i){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(i);g.computeVertexNormals();return g;}
  mesh(geometry(positions,indices),paint);
  // Separate side skins have true wheel openings instead of covering the tires.
  for(const side of[-1,1]){
    const p=[],idx=[];
    for(let iz=0;iz<=nz;iz++){const z=-L+iz/nz*spec.length,f=profile(z);let low=suv?-.16:-.28;
      for(const wz of[-axle,axle])if(Math.abs(z-wz)<spec.radius+.065)low=Math.max(low,wheelY+Math.sqrt(Math.max(0,(spec.radius+.065)**2-(z-wz)**2)));
      p.push(side*f.w,Math.min(low,f.hi-.135),z,side*f.w,f.hi-.13,z);
      if(iz){const a=(iz-1)*2,b=a+2;if(side<0)idx.push(a,b,a+1,a+1,b,b+1);else idx.push(a,a+1,b,a+1,b+1,b);}
    }
    mesh(geometry(p,idx),paint);
  }
  for(const end of[-1,1]){
    const z=end*L,f=profile(z),p=[],idx=[];
    for(let j=0;j<=nx;j++){const u=j/nx*2-1;p.push(u*f.w,-.23,z,u*f.w,f.hi+.055*(1-u*u)-.13*Math.abs(u)**8,z);if(j){const a=(j-1)*2;if(end<0)idx.push(a,a+1,a+2,a+1,a+3,a+2);else idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
    mesh(geometry(p,idx),paint);
  }
  box(spec.width-.12,.08,spec.length-.5,trim,0,-.28,0);
  // Rounded glasshouse and a separate, painted roof preserve each silhouette.
  const cabin=suv?[[-1.12,.80,.66,.70],[-.65,.78,.68,spec.roof], [1.20,.78,.69,spec.roof],[1.85,.88,.68,.91],[2.02,.88,.67,.72]]:
    [[-1.08,.78,.46,.48],[-.43,.72,.48,spec.roof],[.40,.72,.48,spec.roof+.025],[sedan?1.32:1.18,.85,.48,.55]];
  function shell(points,material){const ps=[],is=[],ring=10;
    for(const [z,w,lo,hi] of points){const bevel=Math.max(.002,Math.min(.08,(hi-lo)*.25));for(const [x,y] of[[-1,lo],[-1,hi-bevel],[-.82,hi],[0,hi+.025],[.82,hi],[1,hi-bevel],[1,lo],[.8,lo-.005],[0,lo-.005],[-.8,lo-.005]])ps.push(x*w,y,z);}
    for(let s=0;s<points.length-1;s++)for(let i=0;i<ring;i++){const a=s*ring+i,b=s*ring+(i+1)%ring;is.push(a,a+ring,b,b,a+ring,b+ring);}
    for(let i=1;i<ring-1;i++){is.push(0,i,i+1);const a=(points.length-1)*ring;is.push(a,a+i+1,a+i);}return mesh(geometry(ps,is),material);
  }
  shell(cabin,glass);
  const roofFront=suv?-.65:-.43,roofRear=suv?1.23:.43;
  shell([[roofFront,.715,spec.roof+.005,spec.roof+.025],[roofRear,.715,spec.roof+.005,spec.roof+.025]],paint);
  for(const side of[-1,1]){
    const frontLow=suv?.70:.49;
    rod([side*.80,frontLow,-1.08],[side*.715,spec.roof+.02,roofFront],.025,paint);
    rod([side*.715,spec.roof+.02,roofRear],[side*(suv?.88:.85),suv?.75:.52,suv?1.96:sedan?1.32:1.18],.035,paint);
    rod([side*.74,.5,.24],[side*.715,spec.roof,.24],sedan||suv?.04:.023,trim);
    if(suv)rod([side*.78,.7,1],[side*.715,spec.roof,1],.035,trim);
    box(.07,.13,spec.length-.8,trim,side*(half-.02),-.19,.08);
    box(.045,.035,.28,alloy,side*(half*.96+.01),suv?.57:.36,.30);
    if(sedan||suv)box(.045,.035,.25,alloy,side*(half*.96+.01),suv?.57:.36,1.10);
    rod([side*.80,.65,-.65],[side*1.10,.66,-.64],.025,trim);
    const mirror=mesh(new THREE.SphereGeometry(1,detail?20:10,detail?10:6),paint,side*1.14,.69,-.64);mirror.scale.set(.20,.10,.17);
    box(.28,.10,.012,alloy,side*1.14,.69,-.485);
    // Door shut lines, lower sill and fender lips add scale at close range.
    if(detail){rod([side*(half*.965+.006),-.14,-.83],[side*(half*.965+.006),.37,-.83],.005,trim);rod([side*(half*.965+.006),-.14,.94],[side*(half*.965+.006),.39,.94],.005,trim);}
    for(const z of[-axle,axle]){const lip=mesh(new THREE.TorusGeometry(spec.radius+.06,.022,6,detail?36:18,Math.PI),suv?trim:paint,side*half,wheelY,z);lip.rotation.y=Math.PI/2;}
    box(.59,suv?.11:.085,.06,trim,side*.67,suv?.44:.18,-L-.01);
    box(.53,.026,.025,led,side*.67,suv?.46:.21,-L-.048);
    box(.035,.15,.04,led,side*.94,suv?.36:.12,-L+.08);
    box(.56,.045,.035,tail,side*.67,suv?.54:.28,L+.025);
  }
  box(spec.width*.9,.11,.12,trim,0,-.14,-L+.015);box(spec.width*.9,.11,.13,trim,0,-.14,L-.015);
  box(spec.width*.62,suv?.29:.17,.045,trim,0,suv?.34:.025,-L-.04);
  for(let i=0;i<5;i++)box(spec.width*.56,.015,.025,alloy,0,(suv?.24:-.04)+i*.04,-L-.066);
  box(.48,.13,.025,trim,0,.11,L+.035);
  if(detail){
    const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#c9d1ca';ctx.fillRect(0,0,256,64);ctx.fillStyle='#23313b';ctx.font='bold 29px sans-serif';ctx.textAlign='center';ctx.fillText('HC • '+(suv?'R09':sedan?'T04':'H01'),128,43);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    mesh(new THREE.PlaneGeometry(.43,.11),new THREE.MeshBasicMaterial({map:tex}),0,.11,L+.051);
    // Windshield wipers, roof antenna and two exhaust outlets.
    rod([-.61,.5,-1.05],[.05,.51,-1.04],.009,trim);rod([.08,.5,-1.05],[.65,.51,-1.04],.009,trim);
    const antenna=mesh(new THREE.ConeGeometry(.035,.13,10),trim,0,spec.roof+.11,roofRear-.08);
    if(suv){for(const side of[-1,1])rod([side*.61,spec.roof+.09,-.5],[side*.61,spec.roof+.09,1.1],.027,alloy);}
    else if(!sedan){const spoiler=box(spec.width*.9,.035,.22,paint,0,.57,L-.17);spoiler.rotation.x=-.07;}
  }
  const caliper=new THREE.MeshStandardMaterial({color:suv?0x646c6c:0xb94d36,metalness:.35,roughness:.4});
  for(const side of[-1,1])for(const z of[-axle,axle]){
    const pivot=new THREE.Group();pivot.position.set(side*(half-.015),wheelY,z);root.add(pivot);if(z<0)steerWheels.push(pivot);
    const wheel=new THREE.Group();pivot.add(wheel);wheels.push(wheel);wheelCenters.push(pivot);
    const tire=mesh(new THREE.TorusGeometry(spec.radius-.105,.105,detail?12:6,detail?48:24),rubber,0,0,0,wheel);tire.rotation.y=Math.PI/2;tire.scale.z=1.65;
    const barrel=mesh(cyl,trim,0,0,0,wheel);barrel.scale.set(spec.radius*.68,.28,spec.radius*.68);barrel.rotation.z=Math.PI/2;
    const rim=mesh(new THREE.TorusGeometry(spec.radius*.64,.018,6,detail?36:18),alloy,side*.18,0,0,wheel);rim.rotation.y=Math.PI/2;
    const n=suv?6:sedan?10:5;
    for(let j=0;j<n;j++){const a=j*Math.PI*2/n,spoke=box(.033,.035,spec.radius*.53,alloy,side*.185,Math.sin(a)*spec.radius*.35,Math.cos(a)*spec.radius*.35,wheel);spoke.rotation.x=-a;}
    const hub=mesh(cyl,alloy,side*.19,0,0,wheel);hub.scale.set(.07,.045,.07);hub.rotation.z=Math.PI/2;
    if(detail){const disc=mesh(cyl,alloy,side*.12,0,0,wheel);disc.scale.set(spec.radius*.54,.02,spec.radius*.54);disc.rotation.z=Math.PI/2;box(.08,.17,.09,caliper,side*.15,.03,.15,pivot);
      for(const edge of[-1,1]){const sidewall=mesh(new THREE.TorusGeometry(spec.radius*.82,.005,4,40),trim,edge*.135,0,0,wheel);sidewall.rotation.y=Math.PI/2;}
    }
  }
  for(const side of[-1,1]){const tip=mesh(new THREE.CylinderGeometry(.08,.08,.15,detail?24:12),alloy,side*.73,-.09,L+.03);tip.rotation.x=Math.PI/2;
    if(detail){const flame=mesh(new THREE.ConeGeometry(.11,1.15,10),new THREE.MeshBasicMaterial({color:0x8cd7ff,transparent:true,opacity:.7}),side*.73,-.09,L+.67);flame.rotation.x=Math.PI/2;flame.visible=false;flames.push(flame);}
  }
  root.updateMatrixWorld(true);
  // Batch fixed cube trim inside each component, preserving wheel animation.
  const parents=[];root.traverse(o=>{if(o.isGroup)parents.push(o);});
  for(const p of parents){const groups=new Map();for(const c of p.children)if(c.geometry===unit){if(!groups.has(c.material))groups.set(c.material,[]);groups.get(c.material).push(c);}
    for(const [m,objects] of groups)if(objects.length>2){const batch=new THREE.InstancedMesh(unit,m,objects.length);objects.forEach((o,i)=>{batch.setMatrixAt(i,o.matrix);p.remove(o);});batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();p.add(batch);}}
  parent.add(root);
  return {car:root,spec,bodyMat:paint,tailMat:tail,wheels,steerWheels,flames,wheelCenters};
}

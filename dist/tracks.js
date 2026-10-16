import * as THREE from './vendor/three.module.min.js';

export const TRACKS = [
  {
    id: 'skyline', name: 'Skyline Circuit', subtitle: 'Above the ordinary.', environment: 'ALPINE / DAYLIGHT',
    difficulty: 'ROOKIE', number: '01', width: 16, color: '#c8ff4a',
    description: 'Big skies. Sweeping turns. Three leaps of faith. Find your flow on a floating mountain circuit.',
    points: [[0,25,0],[0,25,-180],[50,30,-360],[210,38,-440],[380,42,-350],[420,38,-150],[310,32,20],[130,42,120],[-60,48,200],[-240,48,100],[-310,34,-100],[-260,30,-320],[-150,35,-490],[-50,42,-650],[100,48,-760],[310,45,-730],[480,38,-840]],
    jumps: [{at:.125,gap:27,rise:7},{at:.46,gap:32,rise:9},{at:.79,gap:36,rise:10}],
    palette: {sky:0xb5d5d2,fog:0xb5d5d2,ground:0x6e9383,mountain:0x80a99b,road:0x303a3b,edge:0xc8ff4a,sun:0xfff0cf,water:0x86babb},
    par: [83,105,140]
  },
  {
    id:'canyon', name:'Canyon Launch', subtitle:'Keep your wheels off the ground.', environment:'RED ROCK / GOLDEN HOUR',
    difficulty:'INTERMEDIATE',number:'02',width:14,color:'#ffac6b',
    description:'Thread the red rocks, ride the elevation changes, and carry your speed across four canyon gaps.',
    points:[[0,22,0],[0,22,-150],[-100,30,-300],[-260,42,-350],[-410,45,-250],[-450,30,-40],[-310,23,100],[-140,48,160],[40,56,70],[160,37,-120],[140,28,-310],[280,40,-470],[460,58,-550],[540,60,-730],[410,44,-870],[230,38,-920],[110,40,-1090]],
    jumps:[{at:.11,gap:30,rise:8},{at:.35,gap:35,rise:10},{at:.6,gap:38,rise:11},{at:.83,gap:42,rise:12}],
    palette:{sky:0xe7bca5,fog:0xdcb19b,ground:0xb87750,mountain:0xc18058,road:0x423a39,edge:0xffad6c,sun:0xffdfaf,water:0xa17d69},par:[87,112,150]
  },
  {
    id:'afterdark',name:'Neon Heights',subtitle:'Make the night your playground.',environment:'SKY CITY / AFTER DARK',
    difficulty:'EXPERT',number:'03',width:12.5,color:'#a9a0ff',
    description:'A ribbon of light above a sleeping city. Tight switchbacks and five jumps. Commit to the landing.',
    points:[[0,40,0],[0,40,-170],[100,55,-310],[260,65,-300],[360,60,-150],[280,58,0],[100,72,90],[-100,85,100],[-270,70,-20],[-280,58,-230],[-140,60,-390],[-30,78,-540],[-120,90,-700],[-300,85,-780],[-440,70,-920],[-360,64,-1090],[-180,72,-1200],[30,80,-1180]],
    jumps:[{at:.105,gap:33,rise:9},{at:.3,gap:35,rise:10},{at:.49,gap:39,rise:11},{at:.68,gap:42,rise:12},{at:.86,gap:45,rise:13}],
    palette:{sky:0x121b31,fog:0x19283c,ground:0x172b35,mountain:0x223a49,road:0x293042,edge:0x9e93ff,sun:0xc4c4ef,water:0x172638},par:[94,120,165]
  }
];

export function makeCourse(config) {
  const curve = new THREE.CatmullRomCurve3(config.points.map(p=>new THREE.Vector3(...p)),false,'catmullrom',.35);
  const length = curve.getLength();
  const count = Math.ceil(length / 1.4);
  const jumps = config.jumps.map(j=>({...j,start:j.at*length,end:j.at*length+j.gap}));
  const samples=[];
  function elevation(s) {
    for(const j of jumps) {
      if(s>=j.start-35 && s<=j.start) return j.rise * ((s-j.start+35)/35)**1.7;
    }
    return 0;
  }
  for(let i=0;i<=count;i++) {
    const s=i/count*length,p=curve.getPointAt(i/count),t=curve.getTangentAt(i/count);
    const flat=Math.hypot(t.x,t.z);
    p.y+=elevation(s);
    samples.push({s,x:p.x,y:p.y,z:p.z,tx:t.x/flat,tz:t.z/flat,nx:-t.z/flat,nz:t.x/flat,
      angle:Math.atan2(-t.x,-t.z),gap:jumps.some(j=>s>=j.start&&s<j.end),ramp:jumps.some(j=>s>=j.start-35&&s<j.start),width:config.width});
  }
  for(let i=0;i<samples.length;i++) {
    const a=samples[Math.max(0,i-1)],b=samples[Math.min(count,i+1)];
    samples[i].slope=(b.y-a.y)/(b.s-a.s || 1);
  }
  function frame(s) {
    const pos=Math.max(0,Math.min(count-.00001,s/length*count));
    const i=Math.floor(pos),t=pos-i,a=samples[i],b=samples[i+1];
    return {...a,s,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,
      slope:a.slope+(b.slope-a.slope)*t,gap:jumps.some(j=>s>=j.start&&s<j.end)};
  }
  const checkpoints=[.25,.5,.75].map(t=>{
    let s=t*length;
    for(const jump of jumps)if(s>jump.start-40 && s<jump.end+20)s=jump.end+50;
    return s;
  });
  return {config,length,samples,jumps,checkpoints,frame};
}

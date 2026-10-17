// Connect the existing sampled roads once. Guidance follows this graph rather
// than drawing a straight line through buildings or across the sea.
export function createRoutePlanner(world){
  const nodes=[],cells=new Map(),key=(x,z)=>`${Math.floor(x/14)},${Math.floor(z/14)}`;
  const connect=(a,b)=>{const cost=Math.hypot(a.x-b.x,a.z-b.z);a.edges.push([b.id,cost]);b.edges.push([a.id,cost]);};
  for(const road of world.roads){
    let previous=null,first=null;
    for(let i=0;i<road.samples.length;i+=2){const p=road.samples[i],node={id:nodes.length,x:p.x,z:p.z,road,edges:[]};nodes.push(node);if(previous)connect(previous,node);else first=node;previous=node;const k=key(p.x,p.z);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(node);}
    const end=road.samples.at(-1);if(Math.hypot(previous.x-end.x,previous.z-end.z)>.1){const node={id:nodes.length,x:end.x,z:end.z,road,edges:[]};nodes.push(node);connect(previous,node);previous=node;const k=key(node.x,node.z);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(node);}if(road.closed)connect(previous,first);
  }
  for(const a of nodes){const gx=Math.floor(a.x/14),gz=Math.floor(a.z/14);for(let x=gx-1;x<=gx+1;x++)for(let z=gz-1;z<=gz+1;z++)for(const b of cells.get(`${x},${z}`)||[])if(a.id<b.id&&a.road!==b.road&&Math.hypot(a.x-b.x,a.z-b.z)<11)connect(a,b);}
  function nearest(p){let best=null,distance=Infinity;for(const node of nodes){const d=(p.x-node.x)**2+(p.z-node.z)**2;if(d<distance){distance=d;best=node;}}return best;}
  function route(from,to){
    const start=nearest(from),end=nearest(to),costs=new Float64Array(nodes.length).fill(Infinity),previous=new Int32Array(nodes.length).fill(-1),heap=[];costs[start.id]=0;
    function push(id,cost){const item={id,cost};let i=heap.length;heap.push(item);while(i){const parent=(i-1)>>1;if(heap[parent].cost<=cost)break;heap[i]=heap[parent];i=parent;}heap[i]=item;}
    function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].cost<heap[child].cost)child++;if(heap[child].cost>=last.cost)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;}
    push(start.id,0);
    while(heap.length){const {id,cost}=pop();if(cost!==costs[id])continue;if(id===end.id)break;for(const [next,d] of nodes[id].edges)if(cost+d<costs[next]){costs[next]=cost+d;previous[next]=id;push(next,cost+d);}}
    if(!Number.isFinite(costs[end.id]))return {points:[],distance:Infinity};
    const path=[];for(let id=end.id;id!==-1;id=previous[id])path.push({x:nodes[id].x,z:nodes[id].z});path.reverse();path.unshift({x:from.x,z:from.z});path.push({x:to.x,z:to.z});
    // Keep turns, but omit redundant points on a straight road.
    const points=[path[0]];for(let i=1;i<path.length-1;i++){const a=points.at(-1),b=path[i],c=path[i+1],cross=(b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x);if(Math.abs(cross)>.5||Math.hypot(b.x-a.x,b.z-a.z)>45)points.push(b);}points.push(path.at(-1));
    return {points,distance:costs[end.id]+Math.hypot(from.x-start.x,from.z-start.z)+Math.hypot(to.x-end.x,to.z-end.z)};
  }
  return {route,nodeCount:nodes.length};
}

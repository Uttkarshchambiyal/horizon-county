const $=id=>document.getElementById(id);
export function createPerformanceUI(capture,startCapture){
  $('start-benchmark').addEventListener('click',startCapture);
  $('cancel-benchmark').addEventListener('click',()=>{capture.cancel();update();});
  $('download-benchmark').addEventListener('click',()=>{
    const data=capture.toJSON();if(!data)return;const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='horizon-drive-performance.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  function chart(){
    const canvas=$('frame-chart'),ctx=canvas.getContext('2d'),width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);ctx.fillStyle='#1b2a30';ctx.fillRect(0,0,width,height);
    const y=ms=>height-12-Math.min(66.7,ms)/66.7*(height-24);ctx.strokeStyle='#c8ff4a70';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y(16.67));ctx.lineTo(width,y(16.67));ctx.stroke();ctx.fillStyle='#c8ff4a';ctx.font='10px sans-serif';ctx.fillText('16.7 ms',7,y(16.67)-4);
    ctx.strokeStyle='#9ecedc';ctx.lineWidth=1.5;ctx.beginPath();const n=capture.historyCount;for(let i=0;i<n;i++){const index=(capture.historyCursor-n+i+capture.history.length)%capture.history.length,x=i/179*width,py=y(capture.history[index]);i?ctx.lineTo(x,py):ctx.moveTo(x,py);}ctx.stroke();
  }
  function update(){
    const report=capture.report;$('benchmark-hud').classList.toggle('hidden',!capture.running);$('benchmark-progress').textContent=Math.min(60,capture.elapsed).toFixed(0)+' / 60 S';
    $('benchmark-status').textContent=capture.running?'RECORDING / '+capture.elapsed.toFixed(1)+' OF 60 SECONDS':report?'LAST DRIVE / '+report.durationSeconds+' SECONDS':'NO CAPTURE YET';
    $('benchmark-results').classList.toggle('hidden',!report);$('download-benchmark').disabled=!report;$('start-benchmark').disabled=capture.running;$('cancel-benchmark').classList.toggle('hidden',!capture.running);
    if(report){$('benchmark-rating').textContent=report.targetMet?'60 FPS TARGET MET IN THIS CAPTURE':'FRAME-TIME SPIKES NEED ATTENTION';$('benchmark-metrics').textContent=`${report.fps} FPS · P95 ${report.p95} MS · P99 ${report.p99} MS · 1% LOW ${report.onePercentLow} FPS`;$('benchmark-detail').textContent=`${report.hitches} FRAMES >33 MS · ${report.stalls} >50 MS · MAX ${report.max} MS · ${report.calls} AVG DRAW CALLS`;$('benchmark-cpu').textContent=`CPU ${report.cpuMs} MS / RENDER SUBMISSION ${report.renderSubmitMs} MS. GPU TIME IS NOT MEASURED.`;}
    if(!$('settings-overlay').classList.contains('hidden'))chart();
  }
  update();return {update};
}

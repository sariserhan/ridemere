const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8997;
  const server = spawn('python3', [path.join(__dirname,'../scripts/serve.py'), DIST, String(port)], { stdio:'ignore', detached:true });
  await sleep(1200);
  const b = await chromium.launch({ headless:true, channel:'chromium', args:['--no-sandbox'] });
  try {
    const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
    await p.goto(`http://localhost:${port}/?park=sunrise-test.park`, { waitUntil:'domcontentloaded' });
    await p.mouse.move(640,400);
    await p.waitForFunction(()=>!document.getElementById('boot'), null, {timeout:180000});
    await sleep(10000); await p.mouse.move(640,400);
    await p.evaluate(()=>window.Module.ccall('SunriseCentreView','number',[],[]));
    await p.evaluate(()=>window.Module.ccall('SunriseGenerateGuests','number',['number'],[120]));
    await p.evaluate(()=>window.Module.ccall('SunriseSpriteAuditClear',null,[],[]));
    for (let i=0;i<40;i++){ await p.mouse.move(640,400); await sleep(3000); }
    const rides = await p.evaluate(()=>JSON.parse(window.Module.ccall('SunriseRideListJson','string',[],[])));
    console.log('rides:', JSON.stringify(rides.map(r=>({id:r.id,type:r.rideType,status:r.status,cust:r.totalCustomers}))));
    console.log('stats:', await p.evaluate(()=>window.Module.ccall('SunriseParkMetadataJson','string',[],[])));
    console.log('audit:', await p.evaluate(()=>window.Module.ccall('SunriseSpriteAuditJson','string',[],[])));
    await p.screenshot({ path: path.join(__dirname,'results-visual','shops.png') });
  } finally { try{process.kill(-server.pid);}catch{}; await b.close(); }
})();

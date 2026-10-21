import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createAppServer } from '../prototype/server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const server = createAppServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const errors = [];
const results = [];
const action = (page, name) => page.locator(`[data-action="${name}"]`).first();
const screen = (page, value) => page.waitForFunction(v => document.body.dataset.screen === v, value);
async function setup(game = 'plane', motionPermission) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  if (motionPermission) await context.addInitScript(permission => {
    window.DeviceMotionEvent = class { static requestPermission() { return Promise.resolve(permission); } };
  }, motionPermission);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  let draws = 0;
  page.on('request', request => { if (request.method() === 'POST' && /\/draw$/.test(new URL(request.url()).pathname)) draws++; });
  await page.goto(base);
  await page.locator('[data-action="select-preset"][data-id="explore"]').click();
  await screen(page, 'game');
  if (game !== 'plane') await page.locator(`[data-action="set-game"][data-id="${game}"]`).click();
  const stage = page.locator('#game-stage');
  await stage.scrollIntoViewIfNeeded();
  const box = await stage.boundingBox();
  return { page, context, stage, box, draws: () => draws };
}
async function move(page, x, y) { await page.mouse.move(x, y, { steps: 5 }); }
async function result(page) {
  await page.waitForSelector('[data-action="skip-animation"]');
  await action(page, 'skip-animation').click();
  await screen(page, 'result');
}
async function shakeByDrag(page, box) {
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await move(page, x, y); await page.mouse.down();
  for (const offset of [48, -48, 48, -48]) { await page.waitForTimeout(125); await move(page, x + offset, y); }
}
try {
  {
    const {page,context,stage,box,draws}=await setup();
    const x=box.x+box.width/2,y=box.y+box.height*.68;
    await move(page,x,y); await page.mouse.down(); await move(page,x+22,y-95);
    assert.ok(parseFloat(await stage.evaluate(el=>el.style.getPropertyValue('--drag-y')))<-60,'飞机在松手之前跟随手势向上移动');
    assert.equal(draws(),0,'拖动阶段没有提前抽取');
    assert.equal(await stage.locator('[data-gesture-progress]').getAttribute('aria-valuenow'),'100');
    await page.mouse.up(); await result(page);
    assert.equal(draws(),1,'完成动作只抽一次');
    assert.ok((await page.locator('.phone').innerText()).includes('亲手放飞'),'结果留下动作小记');
    await context.close(); results.push('飞机跟手、松手提交和出发小记');
  }
  {
    const {page,context,stage,box,draws}=await setup();
    const x=box.x+box.width/2,y=box.y+box.height*.5;
    await move(page,x,y); await page.mouse.down(); await move(page,x,y+60); await page.mouse.up();
    await page.waitForTimeout(80); assert.equal(draws(),0,'向下滑飞机不触发');
    await move(page,x,y); await page.mouse.down(); await move(page,x,y-25); await page.mouse.up();
    assert.equal(draws(),0,'短距离不触发');
    await move(page,x,y); await page.mouse.down(); await move(page,x,y-90);
    await stage.dispatchEvent('pointercancel',{pointerId:1,isPrimary:true}); await page.mouse.up();
    assert.equal(draws(),0,'系统取消不触发');
    await context.close(); results.push('飞机方向、阈值和取消');
  }
  {
    const {page,context,stage,box,draws}=await setup();
    let release;
    const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/api/draw',async route=>{await gate;await route.continue();});
    const x=box.x+box.width/2,y=box.y+box.height*.65;
    await move(page,x,y);await page.mouse.down();await move(page,x+18,y-95);await page.mouse.up();
    await page.waitForTimeout(1100);
    assert.equal(await stage.locator('.flying-plane').evaluate(el=>getComputedStyle(el).opacity),'0');
    release();await page.waitForSelector('[data-action="skip-animation"]');
    assert.equal(await page.locator('.flying-plane').evaluate(el=>getComputedStyle(el).opacity),'0','慢响应返回时已结束的飞机不重新出现');
    assert.ok(parseFloat(await page.locator('#game-stage').evaluate(el=>el.style.getPropertyValue('--drag-y')))<-60,'揭晓延续松手时的姿态');
    await result(page);assert.equal(draws(),1);
    await context.close();results.push('慢响应延续同一次放飞');
  }
  {
    const {page,context,draws}=await setup();
    await page.evaluate(()=>{
      window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
      window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
    });
    const box=await page.locator('#game-stage').boundingBox();
    const x=box.x+box.width/2,y=box.y+box.height*.65;
    await move(page,x,y);await page.mouse.down();await move(page,x,y-90);await page.mouse.up();
    await result(page);assert.equal(draws(),1,'缓存恢复后手势重新挂载');
    await context.close();results.push('页面缓存恢复后手势可继续使用');
  }
  {
    const {page,context,stage,box,draws}=await setup('dart');
    const x=box.x+box.width/2,y=box.y+box.height*.35;
    const before=await stage.locator('[data-bow-string]').getAttribute('d');
    await move(page,x,y); await page.mouse.down(); await move(page,x+8,y+80);
    assert.notEqual(await stage.locator('[data-bow-string]').getAttribute('d'),before,'弓弦随着下拉实时伸展');
    await move(page,x,y+10); await page.mouse.up(); assert.equal(draws(),0,'拉回可以取消');
    await move(page,x,y); await page.mouse.down(); await move(page,x,y+85); await page.mouse.up();
    await action(page,'launch').click({timeout:1000}).catch(()=>{});
    await result(page); assert.equal(draws(),1);
    await context.close(); results.push('飞镖下拉蓄力、拉回取消和单次提交');
  }
  {
    const {page,context,stage,box,draws}=await setup('sticks');
    await shakeByDrag(page,box);
    assert.equal(draws(),0,'签筒摇够但尚未松手不提前抽取');
    assert.equal(await stage.locator('[data-gesture-progress]').getAttribute('aria-valuenow'),'100');
    await page.mouse.up(); await result(page); assert.equal(draws(),1);
    await context.close(); results.push('签筒往返摇动与松手落签');
  }
  {
    const {page,context,stage,box,draws}=await setup('aroma');
    const x=box.x+35,y=box.y+box.height*.38;
    for(let i=0;i<6;i++) { await move(page,x,y); await page.mouse.down(); await move(page,x+45,y); await page.mouse.up(); }
    assert.equal(draws(),0,'重复擦同一小块不累计到揭晓');
    const erased=await stage.locator('.aroma-fog').evaluate(canvas=> {
      const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let transparent=0;for(let i=3;i<d.length;i+=4)if(d[i]<100)transparent++;return transparent/(d.length/4);
    });
    assert.ok(erased>0&&erased<.38,'雾层沿实际路径擦除');
    await move(page,box.x+25,box.y+85);await page.mouse.down();
    for(const [i,dy] of [85,125,165,205].entries()) await move(page,box.x+(i%2?25:box.width-25),box.y+dy);
    assert.equal(draws(),0,'擦开达标也等待松手');
    await page.mouse.up(); await result(page); assert.equal(draws(),1);
    await context.close(); results.push('香雾实际擦除与去重覆盖');
  }
  {
    const {page,context,stage,box,draws}=await setup('aroma');
    await move(page,box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    for(const [x,y] of [
      [box.x-90,box.y+box.height/2],[box.x-90,box.y-90],
      [box.x+box.width+90,box.y-90],[box.x+box.width+90,box.y+box.height+90],
      [box.x-90,box.y+box.height+90],[box.x-90,box.y+box.height/2]
    ])await move(page,x,y);
    assert.ok(Number(await stage.locator('[data-gesture-progress]').getAttribute('aria-valuenow'))<100,'场景外绕圈不形成虚假的边缘擦除');
    await page.mouse.up();assert.equal(draws(),0);
    await context.close();results.push('擦雾区域外轨迹不计入覆盖');
  }
  {
    const {page,context,box,draws}=await setup('sticks','denied');
    await page.locator('[data-motion-enable]').click();
    await page.waitForFunction(()=>document.querySelector('[data-motion-status]')?.textContent.includes('拖动'));
    assert.equal(draws(),0);
    await page.locator('#game-stage').scrollIntoViewIfNeeded();
    await shakeByDrag(page,await page.locator('#game-stage').boundingBox()); await page.mouse.up();
    await result(page); assert.equal(draws(),1);
    await context.close(); results.push('摇动权限拒绝后拖动可用');
  }
  {
    const {page,context,stage,box,draws}=await setup('dart');
    const x=box.x+box.width/2,y=box.y+box.height*.45;
    await move(page,x,y);await page.mouse.down();await move(page,x,y+65);
    await page.evaluate(()=>{
      Object.defineProperty(document,'hidden',{configurable:true,value:true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.mouse.up();assert.equal(draws(),0,'切后台取消已达标未松手动作');
    await page.evaluate(()=>{
      Object.defineProperty(document,'hidden',{configurable:true,value:false});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await stage.locator('[data-gesture-progress]').getAttribute('aria-valuenow'),'0');
    await move(page,x,y);await page.mouse.down();await move(page,x,box.y+box.height+15);await page.mouse.up();
    await result(page);assert.equal(draws(),1,'指针捕获支持区域外松手');
    await context.close();results.push('切后台取消、回来重试和区域外释放');
  }
  {
    const {page,context,draws}=await setup('sticks','granted');
    await page.locator('[data-motion-enable]').click();
    await page.waitForFunction(()=>document.querySelector('[data-motion-status]')?.textContent.includes('暂未收到'),null,{timeout:6000});
    assert.equal(draws(),0,'没有硬件数据不会自动抽取');
    assert.equal(await page.locator('[data-motion-enable]').isDisabled(),false);
    await page.locator('#game-stage').scrollIntoViewIfNeeded();
    await shakeByDrag(page,await page.locator('#game-stage').boundingBox());await page.mouse.up();
    await result(page);assert.equal(draws(),1);
    await context.close();results.push('没有运动数据时回到拖动抽签');
  }
  {
    const {page,context,draws}=await setup('sticks');
    await page.evaluate(()=>{
      window.DeviceMotionEvent=class {static requestPermission(){return new Promise(resolve=>{window.resolveMotion=resolve;});}};
    });
    await page.locator('[data-motion-enable]').click();
    await page.locator('[data-action="set-game"][data-id="plane"]').click();
    await page.evaluate(()=>window.resolveMotion('granted'));
    for(const x of [8,-8,8,-8]) {
      await page.evaluate(value=>{const e=new Event('devicemotion');Object.defineProperty(e,'acceleration',{value:{x:value,y:0,z:0}});window.dispatchEvent(e);},x);
      await page.waitForTimeout(125);
    }
    await page.waitForTimeout(500);assert.equal(draws(),0,'离开场景后才完成的权限授权不会装回监听器');
    await context.close();results.push('待处理权限请求的销毁');
  }
  {
    const {page,context,draws}=await setup('sticks','granted');
    await page.locator('[data-motion-enable]').click();
    async function motion(x) { await page.evaluate(value=>{const e=new Event('devicemotion');Object.defineProperty(e,'acceleration',{value:{x:value,y:0,z:0}});window.dispatchEvent(e);},x); }
    for(const x of [8,-8,8,-8]) {await motion(x);await page.waitForTimeout(125);}
    await result(page);assert.equal(draws(),1);
    await action(page,'draw-again').click();
    await page.locator('[data-motion-enable]').click();
    await page.locator('[data-action="set-game"][data-id="plane"]').click();
    for(const x of [8,-8,8,-8]) {await motion(x);await page.waitForTimeout(125);}
    await page.waitForTimeout(500);assert.equal(draws(),1,'换玩法后传感器不会继续抽签');
    await context.close();results.push('合成传感器事件、停稳提交和换场清理');
  }
  assert.deepEqual(errors,[],'无浏览器脚本错误');
  console.log(JSON.stringify({passed:results.length,checks:results},null,2));
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}

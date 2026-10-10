import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const output='/tmp/karta-browser-validation';mkdirSync(output,{recursive:true});
await build({entryPoints:['app/glass/backdrop.ts'],bundle:true,format:'iife',globalName:'BackdropTest',outfile:output+'/backdrop.js'});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc=size=160x160:rate=12','-t','1','-c:v','libvpx','-pix_fmt','yuv420p',output+'/sample.webm']);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Test the declared unsupported-browser path; real WebGPU pixels are checked separately.
 await page.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined}));
 await page.goto('http://127.0.0.1:3000');await page.locator('.intro-stage[data-ready=true]').waitFor();
 const before=Date.now();await page.locator('.intro-stage').waitFor({state:'detached'});
 assert.ok(Date.now()-before>2500&&Date.now()-before<3500,'Intro must complete its three-second timeline');
 await page.getByRole('button',{name:'Intro · 3 s'}).click();await page.locator('.intro-stage').waitFor();
 await page.getByRole('button',{name:'Invitación'}).click();await page.locator('.intro-stage').waitFor({state:'detached'});
 await page.getByRole('link',{name:'Cristal',exact:true}).click();await page.getByRole('heading',{name:'Un monograma. Cualquier fondo.'}).waitFor();
 await page.addScriptTag({path:output+'/backdrop.js'});
 for(const mode of ['svg','sdf','solid','glass']){await page.getByLabel('Vista de diagnóstico').selectOption(mode);assert.equal(await page.getByLabel('Vista de diagnóstico').inputValue(),mode);}
 for(const background of ['neutral','solid','gradient','pattern','dom']) {
   await page.locator('select').nth(1).selectOption(background);
   const snapshot=await page.evaluate(async()=>{
    const element=document.querySelector('.lab-backdrop');
    const canvas=await window.BackdropTest.createDomBackdrop(element)();
    const context=canvas.getContext('2d');const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    return {width:canvas.width,height:canvas.height,alpha:pixels[3],distinct:new Set(Array.from(pixels).filter((_,i)=>i%4!==3)).size};
   });
   assert.equal(snapshot.width,390);assert.equal(snapshot.height,430);assert.equal(snapshot.alpha,255);
   if(background==='pattern'||background==='dom')assert.ok(snapshot.distinct>4,'Backdrop capture must contain actual pattern/content');
 }
 await page.getByLabel('Probar mi imagen o video').setInputFiles('public/floral.svg');
 await page.locator('.backdrop-image img').waitFor();await page.waitForFunction(()=>document.querySelector('.backdrop-image img').naturalWidth>0);
 assert.ok(await page.evaluate(()=>{const img=document.querySelector('.backdrop-image img');const canvas=document.createElement('canvas');canvas.width=390;canvas.height=430;window.BackdropTest.drawCover(canvas.getContext('2d'),img,390,430);return canvas.getContext('2d').getImageData(0,0,390,430).data.some((v,i)=>i%4===3&&v>0);}));
 await page.getByLabel('Probar mi imagen o video').setInputFiles(output+'/sample.webm');
 await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 assert.ok(await page.evaluate(()=>{const video=document.querySelector('video');const canvas=document.createElement('canvas');canvas.width=390;canvas.height=430;window.BackdropTest.drawCover(canvas.getContext('2d'),video,390,430);return canvas.getContext('2d').getImageData(0,0,1,1).data[3]===255;}));
 await page.locator('select').nth(1).selectOption('pattern');
 await page.getByLabel('Superponer contorno del SVG').check();await page.getByRole('button',{name:'Restablecer material'}).click();
 assert.equal(await page.getByLabel('Superponer contorno del SVG').isChecked(),false);
 for(const width of [320,390,480,1280]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').getBoundingClientRect().width<=480));}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:output+'/lab.png',fullPage:true});
 assert.equal(errors.length,0,errors.join('\n'));
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto('http://127.0.0.1:3000');await nojs.getByRole('heading',{name:'Darwin & Andrea'}).waitFor();
 console.log('Browser checks passed: intro timing, skip/replay, debug controls, DOM/color/gradient/pattern snapshots, image/video drawCover, mobile bounds, and no-JS invitation. WebGPU fallback was deliberately tested; 3D pixels are validated in check:glass.');
}finally{await browser.close();}

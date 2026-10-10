/** Real device tests: geometry is measured separately from material/backdrop optics. */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { Resvg } from '@resvg/resvg-js';
import { init, frame, target, surface } from 'vgpu/node';
import { createGlassScene } from '../app/glass/scene';
import { DEFAULT_GLASS, type GlassParameters } from '../app/glass/parameters';
import { generateDistanceField } from '../app/glass/geometry';

async function check() {
  const outputDir=process.env.GLASS_TEST_OUTPUT || '/tmp/karta-glass-validation';
  mkdirSync(outputDir,{recursive:true});
  const alpha=new Uint8Array(49);for(let y=2;y<=4;y++)for(let x=2;x<=4;x++)alpha[y*7+x]=255;
  const sdf=generateDistanceField(alpha,7);
  assert.ok(sdf[3*7+3]<0);assert.ok(sdf[0]>0);
  assert.ok(Math.abs(sdf[0]-(Math.sqrt(8)-.5)*2/7)<1e-6,'Euclidean distance differs from known square geometry');
  const atlas=PNG.sync.read(readFileSync('public/monogram-sdf.png'));
  const size=320;
  const gpu=await init();const errors:unknown[]=[];gpu.onError(e=>errors.push(e));
  const output=target(gpu,{size:[size,size],format:'rgba8unorm'});
  const scene=createGlassScene(gpu,output,{size:atlas.width,rgba:new Uint8Array(atlas.data)});
  const backgrounds=(pattern:boolean)=>{
    const pixels=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4;const stripe=pattern&&((Math.floor(x/17)+Math.floor(y/17))%2===0);
      pixels[i]=stripe?92:221;pixels[i+1]=stripe?113:228;pixels[i+2]=stripe?101:211;pixels[i+3]=255;
    }return pixels;
  };
  const background=backgrounds(true);
  const render=async(name:string,parameters:Partial<GlassParameters>,pixels=background)=>{
    scene.uploadPixels(pixels,size,size);
    const before=performance.now();
    frame(gpu,current=>scene.render(current,output,{...DEFAULT_GLASS,...parameters},0));
    const rgba=await output.color.read({mipLevel:0,region:'all'});
    await gpu.settled();assert.equal(errors.length,0,errors.map(String).join('\n'));
    const png=new PNG({width:size,height:size});png.data.set(rgba);writeFileSync(join(outputDir,name+'.png'),PNG.sync.write(png));
    return {rgba,ms:Math.round(performance.now()-before)};
  };
  try {
    // Exercise the actual VGPU Surface lifecycle with a texture-backed canvas
    // context. Offscreen targets alone cannot detect illegal swapchain access.
    let acquired = 0;
    const swapchain = gpu.gpu.createTexture({ size: [size, size], format: 'bgra8unorm', usage: 16 | 4 | 1 });
    const canvas = {
      width: size, height: size,
      getContext: () => ({ configure() {}, unconfigure() {}, getCurrentTexture() { acquired++; return swapchain; } }),
    } as unknown as HTMLCanvasElement;
    const presentation = surface(gpu, canvas, { size: [size, size], format: 'bgra8unorm' });
    const surfaceScene = createGlassScene(gpu, presentation, { size: atlas.width, rgba: new Uint8Array(atlas.data) }, { colors: ['bgra8unorm'], sampleCount: 1 });
    try {
      await surfaceScene.prepare();
      assert.equal(acquired, 0, 'Shader preparation must not acquire a canvas texture outside frame');
      surfaceScene.uploadPixels(background, size, size);
      frame(gpu, current => surfaceScene.render(current, presentation, DEFAULT_GLASS));
      await gpu.settled();
      assert.ok(acquired > 0, 'Surface frame did not acquire the canvas texture');
      assert.equal(errors.length, 0, errors.map(String).join('\n'));
    } finally { surfaceScene.destroy(); presentation.dispose(); swapchain.destroy(); }
    await scene.prepare();
    const original=await render('source',{debugMode:'svg'});
    const solid=await render('solid',{debugMode:'solid'});
    let intersection=0,union=0;
    for(let i=3;i<original.rgba.length;i+=4){const a=original.rgba[i]>=128,b=solid.rgba[i]>=128;if(a&&b)intersection++;if(a||b)union++;}
    const iou=intersection/union;assert.ok(iou>.975,`SVG/solid silhouette IoU ${iou}`);
    // Independent raster of the original SVG, not the SDF's own diagnostic.
    const svg=readFileSync('public/monogram.svg','utf8').replace(/<svg[^>]*>/,`<svg x="${size*.13}" y="${size*.13}" width="${size*.74}" height="${size*.74}" viewBox="0 0 200 200">`);
    const raster=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${svg}</svg>`).render().pixels;
    let expectedIntersection=0,expectedUnion=0;
    for(let i=3;i<raster.length;i+=4){const a=raster[i]>=128,b=solid.rgba[i]>=128;if(a&&b)expectedIntersection++;if(a||b)expectedUnion++;}
    const sourceIoU=expectedIntersection/expectedUnion;assert.ok(sourceIoU>.975,`Independent SVG/solid silhouette IoU ${sourceIoU}`);
    const identity=await render('identity',{ior:1,absorptionStrength:0,highlightStrength:0});
    let maxError=0;
    for(let i=0;i<identity.rgba.length;i+=4)if(identity.rgba[i+3]===255){for(let c=0;c<3;c++)maxError=Math.max(maxError,Math.abs(identity.rgba[i+c]-background[i+c]));}
    assert.ok(maxError<=2,`IOR=1 must reproduce the real backdrop, max error ${maxError}`);
    const glass=await render('glass-pattern',{});
    const neutral=await render('glass-neutral',{},backgrounds(false));
    const repeat=await render('glass-repeat',{});
    assert.deepEqual(glass.rgba,repeat.rgba,'Static glass renders must be deterministic');
    let changed=0,backdropChanged=0;
    for(let i=0;i<glass.rgba.length;i+=4){
      if(glass.rgba[i+3]===255&&Math.abs(glass.rgba[i]-background[i])>8)changed++;
      if(glass.rgba[i+3]===255&&Math.abs(glass.rgba[i]-neutral.rgba[i])>8)backdropChanged++;
    }
    assert.ok(changed>100,'Material did not alter backdrop pixels');assert.ok(backdropChanged>100,'Glass did not respond to the supplied backdrop');
    for(const corner of [0,(size-1)*4,(size*(size-1))*4,(size*size-1)*4])assert.equal(glass.rgba[corner+3],0,'Canvas corners must remain transparent');
    await render('sdf',{debugMode:'sdf'});await render('overlay',{debugMode:'solid',overlay:true});
    const result={size,sourceIoU,diagnosticIoU:iou,identityMaxError:maxError,materialChangedPixels:changed,backdropChangedPixels:backdropChanged,glassReadbackMs:glass.ms,outputDir};
    writeFileSync(join(outputDir,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  } finally {scene.destroy();gpu.dispose();}
}
check().catch(e=>{console.error(e);process.exitCode=1});

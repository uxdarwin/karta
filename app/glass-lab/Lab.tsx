'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import GlassMonogram from '../glass/GlassMonogram';
import { createDomBackdrop, type BackdropSource } from '../glass/backdrop';
import { DEFAULT_GLASS, type DebugMode, type GlassParameters } from '../glass/parameters';

const modes: { value: DebugMode; label: string }[] = [
 {value:'svg',label:'1 · SVG original'},{value:'sdf',label:'2 · Campo SDF'},
 {value:'solid',label:'3 · Volumen sólido'},{value:'glass',label:'4 · Cristal transparente'},
];
export default function Lab() {
 const [parameters,setParameters]=useState<GlassParameters>({...DEFAULT_GLASS});
 const [background,setBackground]=useState('pattern');
 const [solid,setSolid]=useState('#d9ded5');
 const [source,setSource]=useState<BackdropSource|null>(null);
 const [media,setMedia]=useState<{url:string;type:'image'|'video'}|null>(null);
 const [status,setStatus]=useState('Preparando');const [error,setError]=useState('');
 const element=useRef<HTMLDivElement>(null);const image=useRef<HTMLImageElement>(null);const video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{
  setSource(null);setError('');
  if (background==='image' || background==='video') return;
  const provider=createDomBackdrop(element.current!);
  setSource(()=>provider);
 },[background,solid]);
 useEffect(()=>()=>{if(media)URL.revokeObjectURL(media.url);},[media]);
 const upload=(file:File|undefined)=>{
   if(!file)return;
   const type=file.type.startsWith('video/')?'video':'image';
   setSource(null);setMedia({url:URL.createObjectURL(file),type});setBackground(type);
 };
 const sliders: {key:keyof GlassParameters;label:string;min:number;max:number;step:number}[]=[
 {key:'logoScale',label:'Escala',min:.35,max:.9,step:.01},{key:'depth',label:'Profundidad',min:.02,max:.3,step:.005},
 {key:'bevelRadius',label:'Bisel interior',min:0,max:.05,step:.001},{key:'ior',label:'Índice de refracción',min:1,max:1.8,step:.01},
 {key:'roughness',label:'Rugosidad',min:0,max:.3,step:.005},{key:'highlightStrength',label:'Reflejos',min:0,max:2,step:.05},
 {key:'distortionStrength',label:'Distorsión',min:0,max:2,step:.05},{key:'absorptionStrength',label:'Absorción',min:0,max:2,step:.05},
 {key:'yaw',label:'Giro (0 = frontal)',min:-.45,max:.45,step:.01},
 ];
 return <main className="glass-lab"><header><a href="/">← Karta</a><span>LABORATORIO DE CRISTAL</span></header>
 <div className="lab-title"><p className="eyebrow">FORMA PRIMERO. MATERIAL DESPUÉS.</p><h1>Un monograma.<br/>Cualquier fondo.</h1><p>El SVG original define el volumen. El cristal refracta una captura del contenido situado debajo.</p></div>
 <div className="lab-stage">
  <div ref={element} className={`lab-backdrop backdrop-${background}`} style={{'--solid-color':solid} as CSSProperties}>
   {background==='dom'&&<div className="sample-dom"><span>DARWIN & ANDREA</span><strong>Love is<br/>in the details.</strong><p>11 / ABRIL · NUESTRA HISTORIA</p><div>Un día para recordar.</div></div>}
   {background==='image'&&<img ref={image} src={media?.type==='image'?media.url:'/floral.svg'} alt="Fondo de prueba" onLoad={()=>{setError('');setSource(image.current);}} onError={()=>setError('No se pudo cargar la imagen.')}/>}
   {background==='video'&&(media?.type==='video'?<video ref={video} src={media.url} muted autoPlay loop playsInline onLoadedData={()=>{setError('');setSource(video.current);}} onError={()=>setError('El navegador no puede reproducir este video.')}/>:<p className="media-hint">Selecciona un video local para probarlo.</p>)}
  </div>
  <GlassMonogram backdrop={source} parameters={parameters} onReady={mode=>setStatus(mode==='webgpu'?'WebGPU · cristal 3D':'SVG · sin WebGPU')} onError={()=>{setError('WebGPU o la captura no está disponible. Se muestra el SVG original; no es una simulación de cristal.');}}/>
 </div>
 <div className="lab-status" role="status">{status}{error&&<p>{error}</p>}</div>
 <section className="lab-controls" aria-label="Controles del cristal">
  <label>Vista de diagnóstico<select value={parameters.debugMode} onChange={e=>setParameters(p=>({...p,debugMode:e.target.value as DebugMode}))}>{modes.map(mode=><option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
  <label>Fondo<select value={background} onChange={e=>{setBackground(e.target.value);setStatus('Preparando');}}><option value="neutral">Neutro (diagnóstico)</option><option value="solid">Color sólido</option><option value="gradient">Gradiente</option><option value="pattern">Patrón</option><option value="image">Imagen</option><option value="video">Video</option><option value="dom">Contenido DOM</option></select></label>
  {background==='solid'&&<label>Color del fondo<input type="color" value={solid} onChange={e=>setSolid(e.target.value)}/></label>}
  <label className="file-input">Probar mi imagen o video<input type="file" accept="image/*,video/*" onChange={e=>upload(e.target.files?.[0])}/><small>Solo se utiliza en tu navegador. No se sube al servidor.</small></label>
  <label className="overlay-control"><input type="checkbox" checked={parameters.overlay} onChange={e=>setParameters(p=>({...p,overlay:e.target.checked,yaw:0}))}/>Superponer contorno del SVG (rosa)</label>
  {sliders.map(item=><label className="parameter" key={item.key}><span>{item.label}<output>{Number(parameters[item.key]).toFixed(3)}</output></span><input type="range" min={item.min} max={item.max} step={item.step} value={Number(parameters[item.key])} onChange={e=>setParameters(p=>({...p,[item.key]:Number(e.target.value)}))}/></label>)}
  <label>Tinte sutil<input type="color" value={'#'+parameters.tint.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('')} onChange={e=>{const hex=e.target.value;setParameters(p=>({...p,tint:[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255]}));}}/></label>
  <button className="lab-reset" onClick={()=>setParameters({...DEFAULT_GLASS})}>Restablecer material</button>
 </section>
 <p className="lab-footnote">El fondo DOM se captura periódicamente. Para video fluido se usa el elemento de video directamente. El contenido externo necesita permiso CORS. En navegadores sin WebGPU verás el SVG, no el cristal 3D.</p>
 </main>;
}

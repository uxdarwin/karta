'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import GlassMonogram from './glass/GlassMonogram';
import type { BackdropSource } from './glass/backdrop';

function Intro({ onFinish }: { onFinish: () => void }) {
  const backdropCanvas = useRef<HTMLCanvasElement>(null);
  const [backdrop, setBackdrop] = useState<BackdropSource | null>(null);
  const [ready, setReady] = useState(false);
  const [renderer, setRenderer] = useState('loading');
  const [reduced, setReduced] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const canvas = backdropCanvas.current!;
    const draw = () => {
      canvas.width = Math.max(1, canvas.clientWidth); canvas.height = Math.max(1, canvas.clientHeight);
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#f5f5ef'); gradient.addColorStop(.45, '#dbe3dc'); gradient.addColorStop(1, '#eef0e9');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    draw(); const resize = new ResizeObserver(draw); resize.observe(canvas);
    setBackdrop(canvas);
    return () => { resize.disconnect(); clearTimeout(timer.current); };
  }, []);
  const begin = useCallback((mode: 'webgpu' | 'svg-fallback') => {
    setRenderer(mode); setReady(true);
    clearTimeout(timer.current); timer.current = setTimeout(onFinish, 3000);
  }, [onFinish]);
  return <div className={`intro-stage ${ready ? 'playing' : ''}`} role="region" aria-label="Introducción de Darwin y Andrea" data-ready={ready} data-renderer={renderer}>
    <div className="intro-topline">DARWIN & ANDREA <span>11 / ABRIL</span></div>
    <div className="glass-frame"><canvas ref={backdropCanvas} className="intro-glass-backdrop" aria-hidden="true"/><GlassMonogram backdrop={backdrop} animate={!reduced} onReady={begin}/></div>
    <div className="intro-caption"><p>EL COMIENZO DE NUESTRO</p><h2>para siempre.</h2><div className="intro-progress"/><span>UNA HISTORIA QUE SE CELEBRA CONTIGO</span></div>
  </div>;
}
export default function IntroTransition({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<'intro' | 'landing'>('intro');
  const [run, setRun] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const finish = useRef(() => { setView('landing'); window.scrollTo({ top: 0, behavior: 'instant' }); }).current;
  useEffect(() => {
    if (view !== 'intro') return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [view]);
  return <>
    <noscript><style>{`.intro-stage,.preview-controls{display:none!important}`}</style></noscript>
    <div className={`landing-shell ${view === 'landing' ? 'revealed' : ''}`} inert={hydrated && view === 'intro'} aria-hidden={hydrated && view === 'intro'}>{children}</div>
    {view === 'intro' && <Intro key={run} onFinish={finish}/>}
    <nav className="preview-controls" aria-label="Vista previa de la invitación"><button aria-pressed={view === 'intro'} onClick={() => { window.scrollTo({top:0, behavior:'instant'}); setRun(value => value + 1); setView('intro'); }}>↻ Intro · 3 s</button><button aria-pressed={view === 'landing'} onClick={finish}>Invitación ↗</button><a href="/glass">Cristal</a></nav>
  </>;
}

'use client';
import { useEffect, useRef, useState } from 'react';

function Intro({ onFinish }: { onFinish: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [glass, setGlass] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let started = false;
    let timer: ReturnType<typeof setTimeout>;
    let budget: ReturnType<typeof setTimeout>;
    let dispose: (() => void) | undefined;
    const begin = (render?: () => void) => {
      if (cancelled || started) return;
      started = true;
      clearTimeout(budget);
      setReady(true);
      render?.();
      timer = setTimeout(onFinish, 3000);
    };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !navigator.gpu) begin();
    else {
      // Never keep guests waiting on GPU initialization.
      budget = setTimeout(() => { dispose?.(); begin(); }, 1800);
      import('./glass/renderer').then(({ createMonogramRenderer }) => {
        if (cancelled || started) return;
        const renderer = createMonogramRenderer(canvas.current!, () => { if (!cancelled) { setGlass(false); begin(); } });
        dispose = renderer.dispose;
        renderer.ready.then(play => {
          if (cancelled || started || !play) return;
          setGlass(true);
          begin(play);
        }).catch(error => { if (cancelled) return; console.warn('Glass intro unavailable; using SVG fallback.', error); setGlass(false); dispose?.(); begin(); });
      }).catch(() => { dispose?.(); begin(); });
    }
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(budget); dispose?.(); };
  }, [onFinish]);
  return <div className={`intro-stage ${ready ? 'playing' : ''}`} role="region" aria-label="Introducción de Darwin y Andrea" data-ready={ready} data-renderer={glass ? 'webgpu' : 'fallback'}>
    <div className="intro-topline">DARWIN & ANDREA <span>11 / ABRIL</span></div>
    <div className="glass-frame"><canvas ref={canvas} className={glass ? 'visible' : ''} aria-label="Monograma de Darwin y Andrea en cristal"/><div className={`glass-fallback ${glass ? 'hidden' : ''}`}><div className="glass-mark"/></div></div>
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
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [view]);
  return <>
    <noscript><style>{`.landing-shell{visibility:visible!important;opacity:1!important}.intro-stage,.preview-controls{display:none!important}`}</style></noscript>
    <div className={`landing-shell ${view === 'landing' ? 'revealed' : ''}`} inert={hydrated && view === 'intro'} aria-hidden={hydrated && view === 'intro'}>{children}</div>
    {view === 'intro' && <Intro key={run} onFinish={finish}/>}
    <nav className="preview-controls" aria-label="Vista previa de la invitación"><button aria-pressed={view === 'intro'} onClick={() => { window.scrollTo({top:0, behavior:'instant'}); setRun(value => value + 1); setView('intro'); }}>↻ Intro · 3 s</button><button aria-pressed={view === 'landing'} onClick={finish}>Invitación ↗</button></nav>
  </>;
}

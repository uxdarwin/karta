'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GlassError, type GlassStage } from './errors';
import type { BackdropSource } from './backdrop';
import { DEFAULT_GLASS, type GlassParameters } from './parameters';
import type { createMonogramRenderer } from './renderer';

export interface GlassMonogramProps {
  backdrop: BackdropSource | null;
  parameters?: Partial<GlassParameters>;
  svgUrl?: string; animate?: boolean; className?: string;
  onReady?: (renderer: 'webgpu' | 'svg-fallback') => void;
  onError?: (error: unknown) => void;
}
/** Absolutely positioned transparent layer. Backdrop pixels must cover the same rectangle. */
export default function GlassMonogram({ backdrop, parameters, svgUrl = '/monogram.svg', animate = false, className = '', onReady, onError }: GlassMonogramProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof createMonogramRenderer> | undefined>(undefined);
  const callbacks = useRef({ onReady, onError });
  const settings = useRef(parameters);
  const [status, setStatus] = useState<'loading' | 'webgpu' | 'svg-fallback'>('loading');
  callbacks.current = { onReady, onError }; settings.current = parameters;
  useEffect(() => {
    if (!backdrop) return;
    let cancelled = false; let settled = false;
    setStatus('loading');
    let stage: GlassStage = 'module';
    const fallback = (error?: unknown) => {
      if (cancelled) return;
      renderer.current?.dispose();
      setStatus('svg-fallback');
      if (error) callbacks.current.onError?.(error);
      if (!settled) { settled = true; callbacks.current.onReady?.('svg-fallback'); }
    };
    const timeout = setTimeout(() => fallback(new GlassError(stage, new Error('La inicialización superó el límite de 4,5 segundos.'))), 4500);
    if (!navigator.gpu) { clearTimeout(timeout); fallback(new Error(window.isSecureContext ? 'Chrome no expone navigator.gpu en esta sesión. Revisa el estado de WebGPU en chrome://gpu; activar la aceleración gráfica no garantiza su disponibilidad.' : 'WebGPU requiere una conexión segura HTTPS. Esta página no está en un contexto seguro.')); }
    else import('./renderer').then(({ createMonogramRenderer }) => {
      if (cancelled || settled) return;
      const instance = createMonogramRenderer(canvas.current!, {
        onStage: next => { stage = next; }, backdrop, svgUrl, parameters: settings.current, animate,
        onError: error => { clearTimeout(timeout); fallback(error); },
      });
      renderer.current = instance;
      instance.ready.then(play => {
        if (cancelled || settled || !play) return;
        clearTimeout(timeout); settled = true; setStatus('webgpu');
        play(); callbacks.current.onReady?.('webgpu');
      }).catch(error => { clearTimeout(timeout); fallback(error); });
    }).catch(error => { clearTimeout(timeout); fallback(new GlassError('module', error)); });
    return () => { cancelled = true; clearTimeout(timeout); renderer.current?.dispose(); renderer.current = undefined; };
  }, [backdrop, svgUrl, animate]);
  useEffect(() => { renderer.current?.setParameters(parameters ?? {}); }, [parameters]);
  const scale = parameters?.logoScale ?? DEFAULT_GLASS.logoScale;
  return <div data-glass-layer data-renderer={status} className={`glass-monogram ${className}`}>
    <canvas ref={canvas} aria-label="Monograma de cristal de Darwin y Andrea" style={{ opacity: status === 'webgpu' ? 1 : 0 }}/>
    {status !== 'webgpu' && <div className="glass-svg-fallback" role="img" aria-label="Monograma SVG; el cristal 3D no está disponible" style={{ '--logo-source': `url("${svgUrl}")`, '--logo-scale': `${scale * 100}%` } as CSSProperties}/>}
  </div>;
}

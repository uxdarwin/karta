export type GlassStage = 'module' | 'geometry' | 'device' | 'surface' | 'shader' | 'backdrop' | 'render';
const descriptions: Record<GlassStage, string> = {
  module: 'No se pudo cargar el módulo del renderizador 3D.',
  geometry: 'No se pudo cargar o decodificar la geometría del monograma.',
  device: 'Chrome expone WebGPU, pero no se pudo iniciar un dispositivo gráfico compatible.',
  surface: 'No se pudo configurar el canvas para mostrar WebGPU.',
  shader: 'No se pudo preparar el shader del cristal.',
  backdrop: 'No se pudo capturar o transferir el fondo al renderizador.',
  render: 'El renderizador WebGPU falló al dibujar el monograma.',
};
export class GlassError extends Error {
  constructor(public stage: GlassStage, cause: unknown) {
    const detail = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
    super(`${descriptions[stage]} Detalle: ${detail}`, { cause });
    this.name = 'GlassError';
  }
}
export function describeGlassError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

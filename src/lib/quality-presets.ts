// Quality presets for F14 Desktop streaming

export type VideoCodec = 'h264' | 'h265' | 'av1';
export type AudioSource = 'system' | 'microphone' | 'disabled';
export type AudioCodec = 'aac' | 'opus' | 'raw';
export type CaptureMethod = 'surfacecontrol' | 'virtualdisplay' | 'projection';
export type DisplayMode = 'desktop' | 'mirror';

export interface QualityPreset {
  name: string;
  description: string;
  resolution: { width: number; height: number };
  dpi: number;
  bitrate: number; // in bits per second
  maxFps: number;
  codec: VideoCodec;
  estimatedLatency: string;
}

export const RESOLUTION_OPTIONS = [
  { width: 1920, height: 1080, label: '1920×1080 (Full HD)' },
  { width: 1280, height: 720, label: '1280×720 (HD)' },
  { width: 960, height: 540, label: '960×540 (qHD)' },
  { width: 640, height: 360, label: '640×360 (nHD)' },
];

export const DPI_OPTIONS = [
  { value: 160, label: '160 dpi (mdpi — Tablet/Tablet-like)' },
  { value: 240, label: '240 dpi (hdpi — Balanceado)' },
  { value: 320, label: '320 dpi (xhdpi — Nítido)' },
  { value: 480, label: '480 dpi (xxhdpi — Teléfono nativo)' },
];

export const BITRATE_OPTIONS = [
  { value: 2000000, label: '2 Mbps — Bajo consumo' },
  { value: 4000000, label: '4 Mbps — Balanceado' },
  { value: 8000000, label: '8 Mbps — Alta calidad (default)' },
  { value: 16000000, label: '16 Mbps — Muy alta calidad' },
  { value: 32000000, label: '32 Mbps — Máxima calidad' },
];

export const FPS_OPTIONS = [
  { value: 15, label: '15 fps — Mínimo (baja latencia)' },
  { value: 30, label: '30 fps — Standard' },
  { value: 60, label: '60 fps — Fluida' },
  { value: 90, label: '90 fps — Alta fluidez' },
  { value: 120, label: '120 fps — Máxima (requiere soporte)' },
];

export const VIDEO_CODEC_OPTIONS = [
  { value: 'h264' as VideoCodec, label: 'H.264 (AVC) — Compatible con todos' },
  { value: 'h265' as VideoCodec, label: 'H.265 (HEVC) — Mejor compresión' },
  { value: 'av1' as VideoCodec, label: 'AV1 — Android 14+ experimental' },
];

export const CAPTURE_METHOD_OPTIONS = [
  { value: 'surfacecontrol' as CaptureMethod, label: 'SurfaceControl + MediaCodec', desc: 'Captura directa del compositor. Máxima fidelidad, menor latencia. Método por defecto de scrcpy.' },
  { value: 'virtualdisplay' as CaptureMethod, label: 'VirtualDisplay + MediaCodec', desc: 'Usa VirtualDisplay para captura. Necesario para modo Desktop/DeX. Crea una pantalla virtual independiente.' },
  { value: 'projection' as CaptureMethod, label: 'DisplayManager + MediaProjection', desc: 'Modo compatibilidad. Usa MediaProjection API. Requiere permiso del usuario en el dispositivo.' },
];

export const AUDIO_SOURCE_OPTIONS = [
  { value: 'system' as AudioSource, label: 'Audio del sistema (Android 11+)' },
  { value: 'microphone' as AudioSource, label: 'Micrófono del dispositivo' },
  { value: 'disabled' as AudioSource, label: 'Sin audio' },
];

export const AUDIO_CODEC_OPTIONS = [
  { value: 'aac' as AudioCodec, label: 'AAC — Compatibilidad universal' },
  { value: 'opus' as AudioCodec, label: 'Opus — Mejor calidad/bitrate' },
  { value: 'raw' as AudioCodec, label: 'PCM Raw — Sin compresión, máxima calidad' },
];

export const QUALITY_PRESETS: QualityPreset[] = [
  {
    name: 'Baja Latencia',
    description: 'Prioriza velocidad. Ideal para control interactivo.',
    resolution: { width: 640, height: 360 },
    dpi: 160,
    bitrate: 2000000,
    maxFps: 30,
    codec: 'h264',
    estimatedLatency: '5-15ms',
  },
  {
    name: 'Balanceado',
    description: 'Equilibrio entre calidad y rendimiento.',
    resolution: { width: 1280, height: 720 },
    dpi: 240,
    bitrate: 8000000,
    maxFps: 30,
    codec: 'h264',
    estimatedLatency: '15-30ms',
  },
  {
    name: 'HD Full',
    description: 'Máxima calidad visual. Para ver videos/series.',
    resolution: { width: 1920, height: 1080 },
    dpi: 320,
    bitrate: 16000000,
    maxFps: 60,
    codec: 'h264',
    estimatedLatency: '30-50ms',
  },
  {
    name: 'DeX Desktop',
    description: 'Configuración optimizada para modo escritorio.',
    resolution: { width: 1920, height: 1080 },
    dpi: 160,
    bitrate: 8000000,
    maxFps: 60,
    codec: 'h264',
    estimatedLatency: '15-30ms',
  },
];

export interface StreamConfig {
  mode: DisplayMode;
  resolution: { width: number; height: number };
  dpi: number;
  bitrate: number;
  maxFps: number;
  videoCodec: VideoCodec;
  captureMethod: CaptureMethod;
  audioSource: AudioSource;
  audioCodec: AudioCodec;
}

export const DEFAULT_CONFIG: StreamConfig = {
  mode: 'mirror',
  resolution: { width: 1280, height: 720 },
  dpi: 240,
  bitrate: 8000000,
  maxFps: 30,
  videoCodec: 'h264',
  captureMethod: 'surfacecontrol',
  audioSource: 'system',
  audioCodec: 'aac',
};

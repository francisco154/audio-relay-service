"use client";

import React, { useState } from 'react';
import { 
  StreamConfig, DEFAULT_CONFIG,
  RESOLUTION_OPTIONS, DPI_OPTIONS, BITRATE_OPTIONS, FPS_OPTIONS,
  VIDEO_CODEC_OPTIONS, CAPTURE_METHOD_OPTIONS, AUDIO_SOURCE_OPTIONS,
  AUDIO_CODEC_OPTIONS, QUALITY_PRESETS, DisplayMode
} from '@/lib/quality-presets';
import { Settings2, ChevronDown, Info, Zap, Tv, Laptop } from 'lucide-react';

interface QualityPanelProps {
  config: StreamConfig;
  onConfigChange: (config: StreamConfig) => void;
  disabled?: boolean;
}

export default function QualityPanel({ config, onConfigChange, disabled }: QualityPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateConfig = (key: keyof StreamConfig, value: any) => {
    onConfigChange({ ...config, [key]: value });
  };

  const applyPreset = (presetIndex: number) => {
    const preset = QUALITY_PRESETS[presetIndex];
    onConfigChange({
      ...config,
      resolution: preset.resolution,
      dpi: preset.dpi,
      bitrate: preset.bitrate,
      maxFps: preset.maxFps,
      videoCodec: preset.codec,
      captureMethod: config.mode === 'desktop' ? 'virtualdisplay' : 'surfacecontrol',
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Settings2 className="w-4 h-4" />
        Configuración de Streaming
      </h3>

      {/* Quick Presets */}
      <div className="space-y-2">
        <span className="text-xs text-text-muted">Presets rápidos</span>
        <div className="grid grid-cols-2 gap-1.5">
          {QUALITY_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              disabled={disabled}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                config.bitrate === preset.bitrate && config.maxFps === preset.maxFps
                  ? 'bg-primary/20 border border-primary text-primary'
                  : 'bg-surface border border-border hover:bg-surface-hover text-foreground'
              } ${disabled ? 'opacity-50' : ''}`}
            >
              {preset.name === 'Baja Latencia' ? <Zap className="w-3.5 h-3.5" /> :
               preset.name === 'DeX Desktop' ? <Laptop className="w-3.5 h-3.5" /> :
               preset.name === 'HD Full' ? <Tv className="w-3.5 h-3.5" /> :
               <Info className="w-3.5 h-3.5" />}
              <div>
                <div>{preset.name}</div>
                <div className="opacity-60">{preset.estimatedLatency}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <div className="space-y-1.5">
        <label className="text-xs text-text-muted">Resolución</label>
        <select
          value={`${config.resolution.width}x${config.resolution.height}`}
          onChange={(e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            updateConfig('resolution', { width: w, height: h });
          }}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground appearance-none cursor-pointer focus:border-primary outline-none"
        >
          {RESOLUTION_OPTIONS.map(opt => (
            <option key={`${opt.width}x${opt.height}`} value={`${opt.width}x${opt.height}`}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* DPI */}
      <div className="space-y-1.5">
        <label className="text-xs text-text-muted">DPI / Densidad</label>
        <select
          value={config.dpi}
          onChange={(e) => updateConfig('dpi', parseInt(e.target.value))}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground appearance-none cursor-pointer focus:border-primary outline-none"
        >
          {DPI_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Bitrate */}
      <div className="space-y-1.5">
        <label className="text-xs text-text-muted">Bitrate de Video</label>
        <select
          value={config.bitrate}
          onChange={(e) => updateConfig('bitrate', parseInt(e.target.value))}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground appearance-none cursor-pointer focus:border-primary outline-none"
        >
          {BITRATE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* FPS */}
      <div className="space-y-1.5">
        <label className="text-xs text-text-muted">FPS Máximo</label>
        <select
          value={config.maxFps}
          onChange={(e) => updateConfig('maxFps', parseInt(e.target.value))}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground appearance-none cursor-pointer focus:border-primary outline-none"
        >
          {FPS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-center gap-1 py-2 text-xs text-text-muted hover:text-foreground transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        Configuración avanzada
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-3 mode-switch-enter">
          {/* Video Codec */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted">Codec de Video</label>
            <select
              value={config.videoCodec}
              onChange={(e) => updateConfig('videoCodec', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground appearance-none cursor-pointer focus:border-primary outline-none"
            >
              {VIDEO_CODEC_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Capture Method */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted">Método de Captura</label>
            <select
              value={config.captureMethod}
              onChange={(e) => updateConfig('captureMethod', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground appearance-none cursor-pointer focus:border-primary outline-none"
            >
              {CAPTURE_METHOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-text-muted italic">
              {CAPTURE_METHOD_OPTIONS.find(o => o.value === config.captureMethod)?.desc}
            </p>
          </div>

          {/* Audio Source */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted">Fuente de Audio</label>
            <select
              value={config.audioSource}
              onChange={(e) => updateConfig('audioSource', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground appearance-none cursor-pointer focus:border-primary outline-none"
            >
              {AUDIO_SOURCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Audio Codec */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted">Codec de Audio</label>
            <select
              value={config.audioCodec}
              onChange={(e) => updateConfig('audioCodec', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground appearance-none cursor-pointer focus:border-primary outline-none"
            >
              {AUDIO_CODEC_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

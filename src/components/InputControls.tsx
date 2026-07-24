"use client";

import React from 'react';
import { ANDROID_KEY_CODES } from '@/lib/scrcpy-client';
import { 
  ArrowLeft, Home, LayoutGrid, Power, Volume2, VolumeX,
  RotateCcw, Keyboard
} from 'lucide-react';

interface InputControlsProps {
  onInjectKey: (keyCode: number, action: 'down' | 'up') => void;
  onInjectText: (text: string) => void;
  disabled?: boolean;
}

export default function InputControls({ onInjectKey, onInjectText, disabled }: InputControlsProps) {
  const handleSpecialKey = (keyCode: number) => {
    onInjectKey(keyCode, 'down');
    setTimeout(() => onInjectKey(keyCode, 'up'), 50);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Keyboard className="w-4 h-4" />
        Control de Entrada
      </h3>

      {/* Special Keys */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          onClick={() => handleSpecialKey(ANDROID_KEY_CODES.BACK)}
          disabled={disabled}
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-foreground transition-colors disabled:opacity-50"
          title="Atrás"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs">Atrás</span>
        </button>

        <button
          onClick={() => handleSpecialKey(ANDROID_KEY_CODES.HOME)}
          disabled={disabled}
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-foreground transition-colors disabled:opacity-50"
          title="Home"
        >
          <Home className="w-4 h-4" />
          <span className="text-xs">Home</span>
        </button>

        <button
          onClick={() => handleSpecialKey(ANDROID_KEY_CODES.RECENT_APPS)}
          disabled={disabled}
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-foreground transition-colors disabled:opacity-50"
          title="Recientes"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-xs">Recientes</span>
        </button>

        <button
          onClick={() => handleSpecialKey(ANDROID_KEY_CODES.POWER)}
          disabled={disabled}
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-foreground transition-colors disabled:opacity-50"
          title="Power"
        >
          <Power className="w-4 h-4" />
          <span className="text-xs">Power</span>
        </button>
      </div>

      {/* Volume Controls */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => handleSpecialKey(ANDROID_KEY_CODES.VOLUME_UP)}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-foreground transition-colors disabled:opacity-50"
        >
          <Volume2 className="w-4 h-4" />
          <span className="text-xs">Vol+</span>
        </button>

        <button
          onClick={() => handleSpecialKey(ANDROID_KEY_CODES.VOLUME_DOWN)}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-foreground transition-colors disabled:opacity-50"
        >
          <Volume2 className="w-4 h-4 opacity-50" />
          <span className="text-xs">Vol-</span>
        </button>

        <button
          onClick={() => { handleSpecialKey(ANDROID_KEY_CODES.VOLUME_UP); handleSpecialKey(ANDROID_KEY_CODES.VOLUME_DOWN); }}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-foreground transition-colors disabled:opacity-50"
        >
          <VolumeX className="w-4 h-4" />
          <span className="text-xs">Silencio</span>
        </button>
      </div>

      {/* Rotation */}
      <button
        onClick={() => handleSpecialKey(276)} // KEYCODE_ROTATE_DEVICE
        disabled={disabled}
        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-foreground transition-colors disabled:opacity-50"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="text-xs">Rotar pantalla</span>
      </button>

      {/* Text Input */}
      <div className="space-y-1.5">
        <label className="text-xs text-text-muted">Enviar texto al dispositivo</label>
        <input
          type="text"
          placeholder="Escribe aquí..."
          disabled={disabled}
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-text-muted focus:border-primary outline-none disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value) {
              onInjectText(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>

      {/* Keyboard shortcuts info */}
      <div className="px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-muted space-y-1">
        <div className="font-medium text-foreground">Atajos de teclado:</div>
        <div>Ctrl+Backspace → Atrás</div>
        <div>Alt+Tab → Recientes</div>
        <div>Esc → Escape</div>
        <div>Enter → Enter</div>
        <div>Letras/Números → Input directo</div>
      </div>
    </div>
  );
}

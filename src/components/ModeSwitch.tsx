"use client";

import React from 'react';
import { DisplayMode } from '@/lib/quality-presets';
import { Monitor, Smartphone } from 'lucide-react';

interface ModeSwitchProps {
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  disabled?: boolean;
}

export default function ModeSwitch({ mode, onModeChange, disabled }: ModeSwitchProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Modo de Visualización</h3>
      
      <div className="flex gap-2">
        {/* Desktop/DeX Mode */}
        <button
          onClick={() => onModeChange('desktop')}
          disabled={disabled}
          className={`flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all ${
            mode === 'desktop'
              ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
              : 'bg-surface border-border text-text-muted hover:bg-surface-hover hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Monitor className="w-8 h-8" />
          <div className="text-center">
            <div className="font-semibold text-sm">Desktop / DeX</div>
            <div className="text-xs mt-1 opacity-70">Pantalla virtual escritorio</div>
          </div>
        </button>

        {/* Mirror Mode */}
        <button
          onClick={() => onModeChange('mirror')}
          disabled={disabled}
          className={`flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all ${
            mode === 'mirror'
              ? 'bg-accent/20 border-accent text-accent hover:bg-accent/30'
              : 'bg-surface border-border text-text-muted hover:bg-surface-hover hover:border-accent/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Smartphone className="w-8 h-8" />
          <div className="text-center">
            <div className="font-semibold text-sm">Mirror / Control</div>
            <div className="text-xs mt-1 opacity-70">Pantalla principal del teléfono</div>
          </div>
        </button>
      </div>

      {/* Mode description */}
      <div className={`px-3 py-2 rounded-lg text-xs ${
        mode === 'desktop' 
          ? 'bg-primary/10 border border-primary/30 text-primary' 
          : 'bg-accent/10 border border-accent/30 text-accent'
      }`}>
        {mode === 'desktop' 
          ? '🔒 Crea una pantalla virtual independiente en modo escritorio. Puedes usar apps en ventana, multitarea y control de cursor/teclado como en una PC real. Similar a Samsung DeX.'
          : '📱 Transmite la pantalla principal de tu teléfono. Controla tu dispositivo con cursor y teclado desde el navegador. Ideal para control remoto.'
        }
      </div>
    </div>
  );
}

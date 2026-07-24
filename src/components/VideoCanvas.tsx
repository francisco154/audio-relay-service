"use client";

import React, { useRef, useEffect, useState } from 'react';
import { DisplayMode, StreamConfig, DEFAULT_CONFIG } from '@/lib/quality-presets';
import { handleMouseEvent, handleScrollEvent } from '@/lib/input-handler';
import { ANDROID_KEY_CODES } from '@/lib/scrcpy-client';
import { Monitor, Smartphone, Maximize2 } from 'lucide-react';

interface VideoCanvasProps {
  mode: DisplayMode;
  config: StreamConfig;
  isStreaming: boolean;
  onInjectTouch: (action: 'down' | 'move' | 'up', x: number, y: number) => void;
  onInjectScroll: (x: number, y: number, hScroll: number, vScroll: number) => void;
  onInjectKey: (keyCode: number, action: 'down' | 'up') => void;
  onInjectText: (text: string) => void;
}

export default function VideoCanvas({
  mode,
  config,
  isStreaming,
  onInjectTouch,
  onInjectScroll,
  onInjectKey,
  onInjectText,
}: VideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceResolution, setDeviceResolution] = useState({ width: 1080, height: 1920 });

  useEffect(() => {
    // Set canvas dimensions based on config
    if (canvasRef.current) {
      canvasRef.current.width = config.resolution.width;
      canvasRef.current.height = config.resolution.height;
    }
  }, [config.resolution]);

  // Handle mouse events
  const handleMouseDown = (e: MouseEvent) => {
    if (!canvasRef.current) return;
    handleMouseEvent(e, canvasRef.current, deviceResolution.width, deviceResolution.height, onInjectTouch);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!canvasRef.current) return;
    handleMouseEvent(e, canvasRef.current, deviceResolution.width, deviceResolution.height, onInjectTouch);
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!canvasRef.current) return;
    handleMouseEvent(e, canvasRef.current, deviceResolution.width, deviceResolution.height, onInjectTouch);
  };

  const handleWheel = (e: WheelEvent) => {
    if (!canvasRef.current) return;
    handleScrollEvent(e, canvasRef.current, deviceResolution.width, deviceResolution.height, onInjectScroll);
  };

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent) => {
    const keyCode = mapBrowserKeyToAndroid(e);
    if (keyCode) {
      onInjectKey(keyCode, 'down');
      e.preventDefault();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    const keyCode = mapBrowserKeyToAndroid(e);
    if (keyCode) {
      onInjectKey(keyCode, 'up');
      e.preventDefault();
    }
  };

  // Map browser key to Android keycode
  function mapBrowserKeyToAndroid(event: KeyboardEvent): number | null {
    if (event.ctrlKey && event.key === 'Backspace') return ANDROID_KEY_CODES.BACK;
    if (event.altKey && event.key === 'Tab') return ANDROID_KEY_CODES.RECENT_APPS;
    
    const keyMap: Record<string, number> = {
      'Enter': ANDROID_KEY_CODES.ENTER,
      'Backspace': ANDROID_KEY_CODES.DELETE,
      'Escape': ANDROID_KEY_CODES.ESC,
      'ArrowUp': 19,
      'ArrowDown': 20,
      'ArrowLeft': 21,
      'ArrowRight': 22,
      'Space': 62,
    };
    
    if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
      return 29 + (event.key.toUpperCase().charCodeAt(0) - 65);
    }
    if (event.key.length === 1 && event.key.match(/[0-9]/)) {
      return 7 + parseInt(event.key);
    }
    
    return keyMap[event.key] || null;
  }

  // Register event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('keyup', handleKeyUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('keyup', handleKeyUp);
    };
  }, [deviceResolution, onInjectTouch, onInjectScroll, onInjectKey]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!canvasRef.current) return;
    if (!document.fullscreenElement) {
      canvasRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      {/* Mode indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {mode === 'desktop' ? (
            <Monitor className="w-4 h-4 text-primary" />
          ) : (
            <Smartphone className="w-4 h-4 text-accent" />
          )}
          <span className="font-medium">
            {mode === 'desktop' ? 'Pantalla Desktop Virtual' : 'Pantalla Principal'}
          </span>
          <span className="text-text-muted">
            {config.resolution.width}×{config.resolution.height} @ {config.maxFps}fps
          </span>
        </div>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-foreground transition-colors"
          title="Pantalla completa"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Video Canvas */}
      <div className="relative flex-1 rounded-xl bg-black overflow-hidden border border-border">
        <canvas
          ref={canvasRef}
          className={`w-full h-full video-canvas cursor-pointer ${isStreaming ? '' : 'opacity-30'}`}
          tabIndex={0}
          style={{ aspectRatio: `${config.resolution.width}/${config.resolution.height}` }}
        />
        
        {/* Not streaming overlay */}
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center space-y-2">
              <div className="text-4xl opacity-30">
                {mode === 'desktop' ? (
                  <Monitor className="w-12 h-12 mx-auto" />
                ) : (
                  <Smartphone className="w-12 h-12 mx-auto" />
                )}
              </div>
              <p className="text-text-muted text-sm">
                {mode === 'desktop' 
                  ? 'Conecta un dispositivo para activar Desktop/DeX'
                  : 'Conecta un dispositivo para ver la pantalla'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useCallback } from 'react';
import DeviceConnector from '@/components/DeviceConnector';
import ModeSwitch from '@/components/ModeSwitch';
import VideoCanvas from '@/components/VideoCanvas';
import QualityPanel from '@/components/QualityPanel';
import InputControls from '@/components/InputControls';
import { DeviceInfo } from '@/lib/adb';
import { StreamConfig, DEFAULT_CONFIG, DisplayMode } from '@/lib/quality-presets';
import { Plane } from 'lucide-react';

export default function F14DesktopPage() {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [config, setConfig] = useState<StreamConfig>(DEFAULT_CONFIG);

  const handleConnected = useCallback((dev: DeviceInfo) => {
    setDevice(dev);
  }, []);

  const handleDisconnected = useCallback(() => {
    setDevice(null);
    setIsStreaming(false);
  }, []);

  const handleModeChange = useCallback((mode: DisplayMode) => {
    setConfig(prev => ({
      ...prev,
      mode,
      captureMethod: mode === 'desktop' ? 'virtualdisplay' : 'surfacecontrol',
    }));
  }, []);

  // Placeholder input handlers (will be connected to scrcpy when streaming)
  const handleInjectTouch = useCallback((action: 'down' | 'move' | 'up', x: number, y: number) => {
    console.log('Touch:', action, x, y);
  }, []);

  const handleInjectScroll = useCallback((x: number, y: number, hScroll: number, vScroll: number) => {
    console.log('Scroll:', x, y, hScroll, vScroll);
  }, []);

  const handleInjectKey = useCallback((keyCode: number, action: 'down' | 'up') => {
    console.log('Key:', keyCode, action);
  }, []);

  const handleInjectText = useCallback((text: string) => {
    console.log('Text:', text);
  }, []);

  const handleStartStream = () => {
    if (!device) return;
    setIsStreaming(true);
  };

  const handleStopStream = () => {
    setIsStreaming(false);
  };

  const isConnected = device !== null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Plane className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">
                F14 <span className="text-primary">Desktop</span>
              </h1>
            </div>
            <span className="text-xs text-text-muted px-2 py-1 rounded bg-surface border border-border">
              v1.0.0
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isStreaming && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-success/20 border border-success/40 text-success text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-success pulse-dot" />
                Streaming activo
              </div>
            )}
            {isConnected && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/20 border border-primary/40 text-primary text-sm font-medium">
                📱 {device?.displayName}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[300px] min-w-[300px] border-r border-border bg-surface overflow-y-auto p-4 space-y-6">
          {/* Device Connection */}
          <DeviceConnector
            onConnected={handleConnected}
            onDisconnected={handleDisconnected}
          />

          {/* Mode Switch */}
          {isConnected && (
            <ModeSwitch
              mode={config.mode}
              onModeChange={handleModeChange}
            />
          )}

          {/* Start/Stop Streaming */}
          {isConnected && (
            <div className="flex gap-2">
              {!isStreaming ? (
                <button
                  onClick={handleStartStream}
                  className="w-full px-4 py-3 rounded-lg bg-success hover:bg-success/80 text-white font-semibold transition-colors"
                >
                  ▶ Iniciar Streaming
                </button>
              ) : (
                <button
                  onClick={handleStopStream}
                  className="w-full px-4 py-3 rounded-lg bg-error hover:bg-error/80 text-white font-semibold transition-colors"
                >
                  ■ Detener Streaming
                </button>
              )}
            </div>
          )}

          {/* Quality Settings */}
          <QualityPanel
            config={config}
            onConfigChange={setConfig}
            disabled={!isConnected}
          />

          {/* Input Controls */}
          <InputControls
            onInjectKey={handleInjectKey}
            onInjectText={handleInjectText}
            disabled={!isStreaming}
          />
        </aside>

        {/* Video Area */}
        <div className="flex-1 flex flex-col p-4 bg-background">
          <VideoCanvas
            mode={config.mode}
            config={config}
            isStreaming={isStreaming}
            onInjectTouch={handleInjectTouch}
            onInjectScroll={handleInjectScroll}
            onInjectKey={handleInjectKey}
            onInjectText={handleInjectText}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-border bg-surface text-xs text-text-muted">
        <div className="flex items-center justify-between">
          <span>F14 Desktop — Control de Android vía USB/ADB</span>
          <span>WebUSB + scrcpy protocol + WebCodecs</span>
        </div>
      </footer>
    </div>
  );
}

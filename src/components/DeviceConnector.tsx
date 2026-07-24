"use client";

import React, { useState, useCallback } from 'react';
import { ConnectionState, connectDevice, disconnectDevice, DeviceInfo } from '@/lib/adb';
import { Usb, X, Smartphone, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface DeviceConnectorProps {
  onConnected: (device: DeviceInfo) => void;
  onDisconnected: () => void;
}

export default function DeviceConnector({ onConnected, onDisconnected }: DeviceConnectorProps) {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [error, setError] = useState<string>('');

  const handleConnect = useCallback(async () => {
    setState('connecting');
    setError('');
    
    const result = await connectDevice();
    setState(result.state);
    
    if (result.device) {
      setDevice(result.device);
      onConnected(result.device);
    }
    if (result.error) {
      setError(result.error);
    }
  }, [onConnected]);

  const handleDisconnect = useCallback(async () => {
    await disconnectDevice();
    setState('disconnected');
    setDevice(null);
    setError('');
    onDisconnected();
  }, [onDisconnected]);

  const getStatusColor = () => {
    switch (state) {
      case 'connected': return 'text-success';
      case 'connecting': return 'text-warning';
      case 'waiting_auth': return 'text-primary';
      case 'error': return 'text-error';
      default: return 'text-text-muted';
    }
  };

  const getStatusIcon = () => {
    switch (state) {
      case 'connected': return <CheckCircle2 className="w-5 h-5" />;
      case 'connecting': return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'waiting_auth': return <Smartphone className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      default: return <Usb className="w-5 h-5" />;
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'disconnected': return 'Desconectado';
      case 'connecting': return 'Conectando...';
      case 'waiting_auth': return 'Autoriza ADB en tu teléfono';
      case 'connected': return device ? `${device.displayName}` : 'Conectado';
      case 'error': return 'Error de conexión';
      default: return 'Desconectado';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Connection Button */}
      {state === 'disconnected' || state === 'error' ? (
        <button
          onClick={handleConnect}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors"
        >
          <Usb className="w-5 h-5" />
          Conectar Dispositivo Android
        </button>
      ) : state === 'connected' ? (
        <button
          onClick={handleDisconnect}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-surface hover:bg-surface-hover border border-border text-foreground font-medium transition-colors"
        >
          <X className="w-5 h-5" />
          Desconectar
        </button>
      ) : (
        <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-surface border border-border text-warning font-medium">
          {getStatusIcon()}
          Esperando...
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
        <span className={`${getStatusColor()} pulse-dot`}>
          {getStatusIcon()}
        </span>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Error Message */}
      {error && state !== 'connected' && (
        <div className="px-3 py-2 rounded-lg bg-error/10 border border-error/30 text-error text-sm">
          {error}
        </div>
      )}

      {/* Device Info */}
      {device && state === 'connected' && (
        <div className="px-3 py-2 rounded-lg bg-surface border border-border text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-text-muted">Modelo:</span>
            <span className="font-medium">{device.model}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Android:</span>
            <span className="font-medium">{device.androidVersion}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Serial:</span>
            <span className="font-mono text-xs">{device.serial}</span>
          </div>
        </div>
      )}

      {/* Plug & Play hint */}
      {state === 'disconnected' && (
        <p className="text-xs text-text-muted text-center">
          Conecta tu Android vía USB y haz clic en conectar. 
          Aparecerá una alerta en tu teléfono para autorizar ADB.
        </p>
      )}
    </div>
  );
}

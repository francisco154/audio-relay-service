"use client";

// Scrcpy Client Wrapper for F14 Desktop
// Manages the scrcpy streaming connection and video rendering

import { Adb } from '@yume-chan/adb';
import { AdbScrcpyClient } from '@yume-chan/adb-scrcpy';
import type { DisplayMode, StreamConfig } from './quality-presets';

export interface ScrcpyState {
  running: boolean;
  mode: DisplayMode | null;
  error?: string;
}

let client: AdbScrcpyClient<any> | null = null;

export async function startScrcpy(
  adb: Adb,
  config: StreamConfig,
): Promise<ScrcpyState> {
  try {
    // If desktop mode, enable freeform support first
    if (config.mode === 'desktop') {
      await adb.subprocess.noneProtocol.spawnWaitText('settings put global enable_freeform_support 1');
      await adb.subprocess.noneProtocol.spawnWaitText('settings put global force_desktop_mode_on_external_displays 1');
    }

    // Create scrcpy client with appropriate options
    // The client will push scrcpy-server.jar to the device automatically
    const options = {
      videoCodec: config.videoCodec,
      videoBitRate: config.bitrate,
      maxFps: config.maxFps,
      videoResolution: `${config.resolution.width}x${config.resolution.height}`,
      audio: config.audioSource !== 'disabled',
      audioCodec: config.audioCodec,
      control: true,
      newDisplay: config.mode === 'desktop' ? `${config.resolution.width}x${config.resolution.height}/${config.dpi}` : undefined,
      displayId: config.mode === 'mirror' ? 0 : undefined,
      cleanup: true,
    };

    // Start the scrcpy client
    // Note: In a real implementation, we need to use the proper scrcpy options class
    // and handle the video/audio decoding pipeline
    // For now, this is the framework that will be expanded

    return { running: true, mode: config.mode };
  } catch (error: any) {
    console.error('Scrcpy start error:', error);
    return { running: false, mode: null, error: error.message };
  }
}

export async function stopScrcpy(): Promise<void> {
  if (client) {
    try { await client.close(); } catch {}
    client = null;
  }
}

export function isScrcpyRunning(): boolean {
  return client !== null;
}

// Android key codes for input control
export const ANDROID_KEY_CODES = {
  BACK: 4,
  HOME: 3,
  RECENT_APPS: 187,
  POWER: 26,
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  MENU: 82,
  ENTER: 66,
  DELETE: 67,
  ESC: 111,
} as const;

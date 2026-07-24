"use client";

// ADB Connection Manager for F14 Desktop
// Uses @yume-chan/adb with WebUSB for connecting to Android devices

import { Adb, AdbDaemonTransport, ADB_DEFAULT_AUTHENTICATORS } from '@yume-chan/adb';
import { AdbDaemonWebUsbDeviceManager } from '@yume-chan/adb-daemon-webusb';
import type { AdbPrivateKey, AdbCredentialStore } from '@yume-chan/adb';

export interface DeviceInfo {
  serial: string;
  model: string;
  androidVersion: string;
  productName: string;
  displayName: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'waiting_auth' | 'connected' | 'error';

let adb: Adb | null = null;
let deviceSerial: string = '';

// Browser-based credential store for ADB authentication
class BrowserAdbCredentialStore implements AdbCredentialStore {
  private keys: AdbPrivateKey[] = [];

  async generateKey(): Promise<AdbPrivateKey> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true, // extractable so we can export the private key
      ['sign', 'verify']
    );

    // Export private key in PKCS#8 format
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const key: AdbPrivateKey = {
      buffer: new Uint8Array(privateKeyBuffer),
    };
    this.keys.push(key);
    return key;
  }

  iterateKeys(): Iterable<AdbPrivateKey> {
    return this.keys;
  }
}

export async function connectDevice(): Promise<{ state: ConnectionState; device?: DeviceInfo; error?: string }> {
  try {
    if (!navigator.usb) {
      return { state: 'error', error: 'WebUSB no disponible. Usa Chrome o Edge.' };
    }

    // Step 1: Create device manager and request device
    const deviceManager = new AdbDaemonWebUsbDeviceManager(navigator.usb);
    const device = await deviceManager.requestDevice();

    if (!device) {
      return { state: 'disconnected', error: 'No se seleccionó ningún dispositivo' };
    }

    // Step 2: Connect to device (opens USB, claims interface, establishes connection)
    const connection = await device.connect();

    // Step 3: Create credential store
    const credentialStore = new BrowserAdbCredentialStore();
    await credentialStore.generateKey();

    // Step 4: Authenticate and create transport
    deviceSerial = device.serial;
    const transport = await AdbDaemonTransport.authenticate({
      serial: deviceSerial,
      connection,
      credentialStore,
      authenticators: ADB_DEFAULT_AUTHENTICATORS,
    });

    // Step 5: Create Adb instance
    adb = new Adb(transport);

    // Step 6: Get device info
    const deviceInfo = await getDeviceInfo(adb);
    
    return { state: 'connected', device: deviceInfo };
  } catch (error: any) {
    console.error('ADB connection error:', error);
    if (error.name === 'NotFoundError') {
      return { state: 'disconnected', error: 'No se seleccionó ningún dispositivo' };
    }
    if (error.name === 'SecurityError') {
      return { state: 'error', error: 'Acceso USB denegado. Verifica permisos del navegador.' };
    }
    return { state: 'error', error: error.message || 'Error de conexión USB' };
  }
}

async function getDeviceInfo(adb: Adb): Promise<DeviceInfo> {
  try {
    const model = await shellCommand(adb, 'getprop ro.product.model');
    const version = await shellCommand(adb, 'getprop ro.build.version.release');
    const product = await shellCommand(adb, 'getprop ro.product.name');

    return {
      serial: deviceSerial,
      model: model || 'Unknown',
      androidVersion: version || 'Unknown',
      productName: product || 'Unknown',
      displayName: `${model || 'Device'} (Android ${version || '?'})`,
    };
  } catch {
    return {
      serial: deviceSerial,
      model: 'Unknown',
      androidVersion: 'Unknown',
      productName: 'Unknown',
      displayName: 'Dispositivo Android',
    };
  }
}

async function shellCommand(adb: Adb, command: string): Promise<string> {
  try {
    return await adb.subprocess.noneProtocol.spawnWaitText(command);
  } catch {
    return '';
  }
}

export async function disconnectDevice() {
  if (adb) {
    try { await adb.close(); } catch {}
    adb = null;
  }
}

export function getAdb(): Adb | null {
  return adb;
}

export function isConnected(): boolean {
  return adb !== null;
}

export async function enableDesktopMode(adb: Adb): Promise<void> {
  await shellCommand(adb, 'settings put global enable_freeform_support 1');
  await shellCommand(adb, 'settings put global force_desktop_mode_on_external_displays 1');
}

export async function disableDesktopMode(adb: Adb): Promise<void> {
  await shellCommand(adb, 'settings put global enable_freeform_support 0');
  await shellCommand(adb, 'settings put global force_desktop_mode_on_external_displays 0');
}

export async function createVirtualDisplay(adb: Adb, width: number, height: number, dpi: number): Promise<void> {
  await shellCommand(adb, `settings put global overlay_display_devices ${width}x${height}/${dpi}`);
}

export async function removeVirtualDisplay(adb: Adb): Promise<void> {
  await shellCommand(adb, 'settings put global overlay_display_devices none');
}

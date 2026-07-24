"use client";

// Display Manager for F14 Desktop
// Handles virtual display creation and management via ADB

import { Adb } from '@yume-chan/adb';

export interface DisplayInfo {
  id: number;
  width: number;
  height: number;
  dpi: number;
  isDefault: boolean;
  type: 'internal' | 'external' | 'virtual';
}

async function shell(adb: Adb, command: string): Promise<string> {
  try {
    return await adb.subprocess.noneProtocol.spawnWaitText(command);
  } catch {
    return '';
  }
}

// Parse display information from dumpsys
export async function listDisplays(adb: Adb): Promise<DisplayInfo[]> {
  try {
    const text = await shell(adb, 'dumpsys display');
    
    const displays: DisplayInfo[] = [];
    const displaySections = text.split('Display: ');
    
    for (const section of displaySections) {
      const idMatch = section.match(/mDisplayId=(\d+)/);
      const widthMatch = section.match(/mBaseDisplayWidth=(\d+)/);
      const heightMatch = section.match(/mBaseDisplayHeight=(\d+)/);
      const dpiMatch = section.match(/mBaseDisplayDensity=(\d+)/);
      
      if (idMatch) {
        displays.push({
          id: parseInt(idMatch[1]),
          width: widthMatch ? parseInt(widthMatch[1]) : 0,
          height: heightMatch ? parseInt(heightMatch[1]) : 0,
          dpi: dpiMatch ? parseInt(dpiMatch[1]) : 0,
          isDefault: idMatch[1] === '0',
          type: idMatch[1] === '0' ? 'internal' : 'virtual',
        });
      }
    }
    
    return displays.length > 0 ? displays : [{ id: 0, width: 1080, height: 1920, dpi: 320, isDefault: true, type: 'internal' }];
  } catch {
    return [{ id: 0, width: 1080, height: 1920, dpi: 320, isDefault: true, type: 'internal' }];
  }
}

// Create a virtual display using overlay_display_devices setting
export async function createDesktopDisplay(
  adb: Adb,
  width: number,
  height: number,
  dpi: number
): Promise<number> {
  await shell(adb, 'settings put global enable_freeform_support 1');
  await shell(adb, 'settings put global force_desktop_mode_on_external_displays 1');
  await shell(adb, `settings put global overlay_display_devices ${width}x${height}/${dpi}`);
  
  // Wait for display to be created
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Find the new display
  const displays = await listDisplays(adb);
  const virtualDisplay = displays.find(d => !d.isDefault);
  
  if (virtualDisplay) {
    await shell(adb, `am start --display ${virtualDisplay.id} com.android.launcher3/.Launcher`);
    return virtualDisplay.id;
  }
  
  return -1;
}

// Remove virtual display
export async function removeDesktopDisplay(adb: Adb): Promise<void> {
  await shell(adb, 'settings put global overlay_display_devices none');
}

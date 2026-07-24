// Input Handler for F14 Desktop
// Maps browser mouse/keyboard events to Android input via scrcpy control protocol

import { ANDROID_KEY_CODES } from './scrcpy-client';

export interface InputEvent {
  type: 'touch' | 'key' | 'scroll' | 'text';
  data: TouchEventData | KeyEventData | ScrollEventData | TextEventData;
}

export interface TouchEventData {
  action: 'down' | 'move' | 'up';
  x: number;
  y: number;
  pressure?: number;
}

export interface KeyEventData {
  action: 'down' | 'up';
  keyCode: number;
}

export interface ScrollEventData {
  x: number;
  y: number;
  hScroll: number;
  vScroll: number;
}

export interface TextEventData {
  text: string;
}

// Map browser keyboard events to Android key codes
export function mapBrowserKeyToAndroid(event: KeyboardEvent): number | null {
  // Direct mappings
  const keyMap: Record<string, number> = {
    'Enter': ANDROID_KEY_CODES.ENTER,
    'Backspace': ANDROID_KEY_CODES.DELETE,
    'Delete': ANDROID_KEY_CODES.DELETE,
    'Escape': ANDROID_KEY_CODES.ESC,
    'Tab': 61,
    'ArrowUp': 19,
    'ArrowDown': 20,
    'ArrowLeft': 21,
    'ArrowRight': 22,
    'F1': 131,
    'F2': 132,
    'F3': 133,
    'F4': 134,
    'F5': 135,
    'F6': 136,
    'F7': 137,
    'F8': 138,
    'F9': 139,
    'F10': 140,
    'F11': 141,
    'F12': 142,
    'Space': 62,
    'Shift': 59,
    'Control': 113,
    'Alt': 57,
  };

  // Letter keys (A-Z mapped to Android KEYCODE_A=29 to KEYCODE_Z=54)
  if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
    return 29 + (event.key.toUpperCase().charCodeAt(0) - 65);
  }

  // Number keys (0-9 mapped to Android KEYCODE_0=7 to KEYCODE_9=16)
  if (event.key.length === 1 && event.key.match(/[0-9]/)) {
    return 7 + parseInt(event.key);
  }

  return keyMap[event.key] || null;
}

// Map canvas mouse coordinates to device screen coordinates
export function mapCanvasToDevice(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  deviceWidth: number,
  deviceHeight: number
): { x: number; y: number } {
  // Account for canvas scaling
  const scaleX = deviceWidth / canvasWidth;
  const scaleY = deviceHeight / canvasHeight;
  
  return {
    x: Math.round(canvasX * scaleX),
    y: Math.round(canvasY * scaleY),
  };
}

// Handle mouse events on the video canvas
export function handleMouseEvent(
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  deviceWidth: number,
  deviceHeight: number,
  sendTouch: (action: 'down' | 'move' | 'up', x: number, y: number) => void
) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = event.clientX - rect.left;
  const canvasY = event.clientY - rect.top;
  
  const deviceCoords = mapCanvasToDevice(
    canvasX, canvasY,
    rect.width, rect.height,
    deviceWidth, deviceHeight
  );
  
  switch (event.type) {
    case 'mousedown':
      sendTouch('down', deviceCoords.x, deviceCoords.y);
      break;
    case 'mousemove':
      if (event.buttons > 0) {
        sendTouch('move', deviceCoords.x, deviceCoords.y);
      }
      break;
    case 'mouseup':
      sendTouch('up', deviceCoords.x, deviceCoords.y);
      break;
  }
}

// Handle wheel/scroll events
export function handleScrollEvent(
  event: WheelEvent,
  canvas: HTMLCanvasElement,
  deviceWidth: number,
  deviceHeight: number,
  sendScroll: (x: number, y: number, hScroll: number, vScroll: number) => void
) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = event.clientX - rect.left;
  const canvasY = event.clientY - rect.top;
  
  const deviceCoords = mapCanvasToDevice(
    canvasX, canvasY,
    rect.width, rect.height,
    deviceWidth, deviceHeight
  );
  
  // Normalize scroll values
  const vScroll = event.deltaY > 0 ? -1 : event.deltaY < 0 ? 1 : 0;
  const hScroll = event.deltaX > 0 ? -1 : event.deltaX < 0 ? 1 : 0;
  
  sendScroll(deviceCoords.x, deviceCoords.y, hScroll, vScroll);
}

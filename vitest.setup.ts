/**
 * Test environment setup: jsdom does not implement the canvas 2D context,
 * ResizeObserver, or matchMedia. We provide lightweight mocks that record
 * enough calls to assert draw/redraw behavior in component tests.
 */
import { afterEach, beforeEach, vi } from 'vitest';

interface CanvasCallCounters {
  putImageData: number;
  drawImage: number;
  clearRect: number;
  createImageData: number;
}

declare global {
  var __canvasCalls: CanvasCallCounters;
}

globalThis.__canvasCalls = {
  putImageData: 0,
  drawImage: 0,
  clearRect: 0,
  createImageData: 0,
};

function resetCanvasCalls(): void {
  globalThis.__canvasCalls.putImageData = 0;
  globalThis.__canvasCalls.drawImage = 0;
  globalThis.__canvasCalls.clearRect = 0;
  globalThis.__canvasCalls.createImageData = 0;
}

function makeContext(): unknown {
  return {
    imageSmoothingEnabled: true,
    clearRect: vi.fn(() => {
      globalThis.__canvasCalls.clearRect++;
    }),
    drawImage: vi.fn(() => {
      globalThis.__canvasCalls.drawImage++;
    }),
    putImageData: vi.fn(() => {
      globalThis.__canvasCalls.putImageData++;
    }),
    createImageData: vi.fn((w: number, h: number) => {
      globalThis.__canvasCalls.createImageData++;
      return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
    }),
  };
}

// Cache one context per canvas element so counters are stable across getContext.
const contextCache = new WeakMap<HTMLCanvasElement, unknown>();

// Only install browser mocks in DOM environments (the SSR test runs in node).
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement, type: string) {
      if (type !== '2d') return null;
      let ctx = contextCache.get(this);
      if (!ctx) {
        ctx = makeContext();
        contextCache.set(this, ctx);
      }
      return ctx;
    },
  });

  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
}

if (typeof window !== 'undefined') {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  resetCanvasCalls();
});

afterEach(() => {
  vi.clearAllMocks();
});

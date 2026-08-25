import {
  useEffect,
  useLayoutEffect,
  useState,
  type Ref,
  type RefCallback,
} from 'react';

/**
 * `useLayoutEffect` on the client, `useEffect` on the server, avoiding the
 * React SSR warning while keeping synchronous drawing in the browser.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Merges multiple React refs into a single callback ref. SSR-safe.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') {
        ref(value);
      } else {
        (ref as { current: T | null }).current = value;
      }
    }
  };
}

/**
 * Tracks the current `devicePixelRatio`, updating when it changes (e.g. moving
 * the window between displays or browser zoom). Returns `1` during SSR and
 * before the first client effect runs.
 */
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let media: MediaQueryList | null = null;
    const update = () => {
      const next = window.devicePixelRatio || 1;
      setDpr(next);
      // The media query is tied to a specific dpr, so re-subscribe each change.
      media?.removeEventListener('change', update);
      media = window.matchMedia(`(resolution: ${next}dppx)`);
      media.addEventListener('change', update);
    };

    update();
    return () => media?.removeEventListener('change', update);
  }, []);

  return dpr;
}

/**
 * The measured content-box size of an element, in CSS pixels.
 */
export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Observes an element's size with `ResizeObserver` while `enabled` is true.
 * Returns `null` until a measurement is available. SSR-safe.
 */
export function useElementSize(
  element: HTMLElement | null,
  enabled: boolean,
): ElementSize | null {
  const [size, setSize] = useState<ElementSize | null>(null);

  useEffect(() => {
    if (!enabled || element === null) {
      setSize(null);
      return;
    }
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentBoxSize?.[0];
      const width = box ? box.inlineSize : entry.contentRect.width;
      const height = box ? box.blockSize : entry.contentRect.height;
      setSize({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, enabled]);

  return size;
}

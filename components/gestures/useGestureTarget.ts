"use client";

import {useCallback} from 'react';

/**
 * Marks a node as reachable by the gesture pointer. Most of the site needs
 * nothing: real links and buttons inside a `data-gesture-scope` already count.
 * Use this for custom controls, and for the reversible choices that may be
 * chosen by holding still (`dwell`).
 */
export function useGestureTarget<T extends HTMLElement>({dwell = false} = {}) {
  return useCallback(
    (node: T | null) => {
      if (!node) return;
      node.setAttribute('data-gesture-target', '');
      if (dwell) node.setAttribute('data-gesture-dwell', '');
      return () => {
        node.removeAttribute('data-gesture-target');
        node.removeAttribute('data-gesture-dwell');
      };
    },
    [dwell],
  );
}

export default useGestureTarget;

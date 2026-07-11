import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Returns a stable function identity that always calls the latest `fn`.
 * Lets effects depend on a callback without re-running when it changes.
 */
export function useCallbackRef<Args extends unknown[], R>(
  fn: (...args: Args) => R,
): (...args: Args) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: Args) => ref.current(...args), []);
}

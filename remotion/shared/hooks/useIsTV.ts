import { useVideoConfig } from 'remotion';

/**
 * Returns true when rendering in TV (16:9) aspect ratio.
 * Social (9:16) → false, TV (16:9) → true.
 */
export function useIsTV(): boolean {
  const { width, height } = useVideoConfig();
  return width > height;
}

import React from 'react';
import { useVideoConfig } from 'remotion';
import { PhoneFrame } from './PhoneFrame';
import { DesktopFrame } from './DesktopFrame';

/**
 * Auto-detects aspect ratio and renders PhoneFrame (social 9:16)
 * or DesktopFrame (TV 16:9) accordingly.
 */
export const DeviceFrame: React.FC<{
  children: React.ReactNode;
  scale?: number;
  delay?: number;
  shadowIntensity?: number;
}> = ({ children, scale = 1, delay = 0, shadowIntensity = 0.8 }) => {
  const { width, height } = useVideoConfig();
  const isTV = width > height;

  if (isTV) {
    return (
      <DesktopFrame scale={scale} delay={delay} shadowIntensity={shadowIntensity}>
        {children}
      </DesktopFrame>
    );
  }

  return (
    <PhoneFrame scale={scale} delay={delay} shadowIntensity={shadowIntensity}>
      {children}
    </PhoneFrame>
  );
};

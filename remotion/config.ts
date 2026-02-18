export const MISRAD_COLORS = {
  primary: '#A21D3C',
  primaryGlow: '#881337',
  primaryDark: '#4C0519',
  indigo: '#3730A3',
  onyx900: '#09090B',
  onyx800: '#18181B',
  onyx700: '#27272A',
  surface50: '#F8FAFC',
  surface100: '#F1F5F9',
};

export const SPRING_CONFIGS = {
  hero: { damping: 12, stiffness: 100, mass: 0.8 },
  camera: { damping: 25, stiffness: 50, mass: 1.2 },
  ui: { damping: 10, stiffness: 200, mass: 1 },
};

export const TIMING = {
  fps: 30,
  duration: 60,
  scenes: {
    hook: { start: 0, duration: 90 }, // 0-3s
    problem: { start: 90, duration: 240 }, // 3-11s
    solution: { start: 330, duration: 270 }, // 11-20s
    features: { start: 600, duration: 750 }, // 20-45s
    cta: { start: 1350, duration: 450 }, // 45-60s
  },
};

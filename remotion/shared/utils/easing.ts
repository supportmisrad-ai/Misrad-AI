/**
 * Custom cubic-bezier easing functions.
 * NO generic ease-in/ease-out allowed — every motion is intentional.
 */

/** Attempt bezier evaluation via de Casteljau subdivision */
function cubicBezierValue(t: number, p1: number, p2: number): number {
  // Attempt simple cubic bezier y(t) approximation
  const ct = 1 - t;
  return 3 * ct * ct * t * p1 + 3 * ct * t * t * p2 + t * t * t;
}

function solveCubicBezierX(x: number, x1: number, x2: number): number {
  // Newton's method to find t for given x
  let t = x;
  for (let i = 0; i < 8; i++) {
    const ct = 1 - t;
    const currentX = 3 * ct * ct * t * x1 + 3 * ct * t * t * x2 + t * t * t;
    const dx = currentX - x;
    if (Math.abs(dx) < 1e-6) break;
    // derivative
    const dxdt = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
    if (Math.abs(dxdt) < 1e-6) break;
    t -= dx / dxdt;
    t = Math.max(0, Math.min(1, t));
  }
  return t;
}

/**
 * Create a cubic-bezier easing function compatible with Remotion's interpolate.
 * Returns a function that maps progress [0,1] → eased [0,1].
 */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const solvedT = solveCubicBezierX(t, x1, x2);
    return cubicBezierValue(solvedT, y1, y2);
  };
}

/** "Boom then glide" — aggressive start, silk landing */
export const easeOutExpo = bezier(0.16, 1, 0.3, 1);

/** Snappy UI interactions */
export const easeSnap = bezier(0.22, 0.68, 0, 1);

/** Dramatic entrance for hero elements */
export const easeDramatic = bezier(0.05, 0.7, 0.1, 1);

/** Smooth camera movement */
export const easeCamera = bezier(0.25, 0.46, 0.45, 0.94);

/** Ultra-aggressive punch (for stats numbers) */
export const easePunch = bezier(0, 0.9, 0.1, 1);

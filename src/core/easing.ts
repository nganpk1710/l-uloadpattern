export type EasingId = 'linear' | 'sine' | 'cubic' | 'quint' | 'expo' | 'back' | 'steps';

const C1 = 1.70158;
const C2 = C1 * 1.525;

export const EASINGS: Record<EasingId, (t: number) => number> = {
  linear: (t) => t,
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  cubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  quint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
  expo: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
  back: (t) =>
    t < 0.5
      ? ((2 * t) ** 2 * ((C2 + 1) * 2 * t - C2)) / 2
      : ((2 * t - 2) ** 2 * ((C2 + 1) * (t * 2 - 2) + C2) + 2) / 2,
  // "Load" feel: the value climbs in discrete notches like a loading bar
  steps: (t) => Math.min(1, Math.floor(t * 6) / 5),
};

export const EASING_LABELS: Record<EasingId, string> = {
  linear: 'Đều',
  sine: 'Sine',
  cubic: 'Cubic',
  quint: 'Quint',
  expo: 'Expo',
  back: 'Bật',
  steps: 'Nấc',
};

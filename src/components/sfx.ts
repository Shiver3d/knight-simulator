import selectSound from '../assets/sfx/selectSound.mp3';
import exitReveal from '../assets/sfx/exitReveal.mp3';

let baseSelect: HTMLAudioElement | null = null;
let baseExit: HTMLAudioElement | null = null;

export const playSelectSound = (volume = 0.85) => {
  try {
    if (!baseSelect) baseSelect = new Audio(selectSound);
    const a = baseSelect.cloneNode(true) as HTMLAudioElement;
    a.volume = volume;
    a.play().catch(() => {});
  } catch {}
};

export const playExitReveal = (volume = 0.95) => {
  try {
    if (!baseExit) baseExit = new Audio(exitReveal);
    const a = baseExit.cloneNode(true) as HTMLAudioElement;
    a.volume = volume;
    a.play().catch(() => {});
  } catch {}
};

export default null;

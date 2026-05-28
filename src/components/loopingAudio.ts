export interface LoopingAudioOptions {
  volume?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  loopStart?: number;
  loopEnd?: number;
}

export interface LoopingAudioHandle {
  audio: HTMLAudioElement;
  stop: () => void;
}

export const createLoopingAudio = (
  src: string,
  options: LoopingAudioOptions = {}
): LoopingAudioHandle => {
  const audio = new Audio();
  audio.src = src;
  audio.loop = false;
  audio.volume = 0;

  const targetVolume = options.volume ?? 0.6;
  const fadeInMs = options.fadeInMs ?? 600;
  const fadeOutMs = options.fadeOutMs ?? 600;
  const loopStart = options.loopStart ?? 0;

  let fadeInStart = performance.now();
  let fadeOutStart: number | null = null;
  let stopped = false;

  const step = () => {
    if (stopped) return;

    const now = performance.now();
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const loopEnd = options.loopEnd && options.loopEnd > 0 ? options.loopEnd : duration;

    if (loopEnd && audio.currentTime >= loopEnd - fadeOutMs / 1000) {
      if (fadeOutStart === null) {
        fadeOutStart = now;
      }
    }

    if (fadeOutStart !== null) {
      const t = Math.min(1, (now - fadeOutStart) / fadeOutMs);
      audio.volume = targetVolume * (1 - t);
      if (t >= 1) {
        audio.currentTime = loopStart;
        fadeOutStart = null;
        fadeInStart = performance.now();
        audio.volume = 0;
      }
    } else if (fadeInStart) {
      const t = Math.min(1, (now - fadeInStart) / fadeInMs);
      audio.volume = targetVolume * t;
      if (t >= 1) {
        fadeInStart = 0;
      }
    }
  };

  const intervalId = window.setInterval(step, 50);

  audio.addEventListener('ended', () => {
    if (stopped) return;
    audio.currentTime = loopStart;
    audio.play().catch(() => {});
  });

  audio.play().catch(() => {});

  return {
    audio,
    stop: () => {
      stopped = true;
      window.clearInterval(intervalId);
      audio.pause();
    },
  };
};

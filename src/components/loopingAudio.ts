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
  // longer, smoother defaults for subtle fades
  const fadeInMs = options.fadeInMs ?? 1400;
  const fadeOutMs = options.fadeOutMs ?? 1400;
  const loopStart = options.loopStart ?? 0;
  let stopped = false;

  const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // smooth ease in/out

  let rafId: number | null = null;
  let fadeOutRequestedAt: number | null = null;
  let fadeInStartedAt: number | null = null;

  const tick = (now: number) => {
    if (stopped) return;
    // ensure audio metadata loaded
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const loopEnd = options.loopEnd && options.loopEnd > 0 ? options.loopEnd : duration;

    if (loopEnd && audio.currentTime >= Math.max(0, loopEnd - fadeOutMs / 1000)) {
      if (fadeOutRequestedAt === null) fadeOutRequestedAt = now;
    }

    if (fadeOutRequestedAt !== null) {
      const t = Math.min(1, (now - fadeOutRequestedAt) / fadeOutMs);
      const v = targetVolume * (1 - ease(t));
      audio.volume = Math.max(0, Math.min(1, v));
      if (t >= 1) {
        audio.currentTime = loopStart;
        fadeOutRequestedAt = null;
        fadeInStartedAt = performance.now();
        audio.volume = 0;
      }
    } else if (fadeInStartedAt !== null) {
      const t = Math.min(1, (now - fadeInStartedAt) / fadeInMs);
      audio.volume = targetVolume * ease(t);
      if (t >= 1) fadeInStartedAt = null;
    }

    rafId = window.requestAnimationFrame(tick);
  };

  // start playback and smooth fade in
  audio.play().catch(() => {});
  fadeInStartedAt = performance.now();
  rafId = window.requestAnimationFrame(tick);

  return {
    audio,
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
      } catch {}
    },
  };
};

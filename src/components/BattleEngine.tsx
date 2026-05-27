import React, { useEffect, useRef, useState } from 'react';
import battleHud from '../assets/battleHud.png';
import soulSprite from '../assets/spriteResources/SOUL.png';
import trkSprite from '../assets/spriteResources/TRK.png';
import BorderBackground from './BorderBackground';

interface PlayerState {
  x: number;
  y: number;
  speed: number;
  coreRadius: number;
  grazeRadius: number;
  hp: number;
  tp: number;
}

interface Bullet {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  alreadyGrazed: boolean;
}

interface BoxDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Scene = 1 | 2;

type Scene2Shape =
  | { kind: 'circle'; x: number; y: number; radius: number }
  | { kind: 'square'; x: number; y: number; size: number }
  | { kind: 'triangle'; x: number; y: number; size: number };

const RED_SOUL_SPRITE = {
  x: 3,
  y: 17,
  width: 16,
  height: 16,
};

const GRAZE_SPRITE = {
  x: 28,
  y: 123,
  width: 26,
  height: 26,
};

const TRK_IDLE_SWORD_SPRITE = {
  x: 1802,
  y: 189,
  width: 68,
  height: 65,
};

const HUD_SPRITE = {
  x: 21,
  y: 62,
  width: 640,
  height: 480,
};

const BACKGROUND_FRAME_DURATION_MS = 1000 / 12;

const BOX_CONFIG: BoxDimensions = {
  x: 450,
  y: 250,
  width: 200,
  height: 200,
};

function getBackgroundFrameNumber(path: string) {
  const match = path.match(/BBS_(\d+)\.png$/i);
  return match ? Number(match[1]) : 0;
}

const BACKGROUND_FRAMES = (
  Object.entries(
    import.meta.glob('../assets/background/BBS_*.png', {
      eager: true,
      import: 'default',
    })
  ) as Array<[string, string]>
)
  .sort((a, b) => getBackgroundFrameNumber(a[0]) - getBackgroundFrameNumber(b[0]))
  .map((entry) => entry[1]);

const SCENE2_SHAPES: Scene2Shape[] = [
  { kind: 'circle', x: 200, y: 180, radius: 16 },
  { kind: 'square', x: 340, y: 240, size: 32 },
  { kind: 'triangle', x: 260, y: 320, size: 36 },
];

export const BattleEngine: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});

  const [displayHp, setDisplayHp] = useState(100);

  const playerRef = useRef<PlayerState>({
    x: 320,
    y: 240,
    speed: 2,
    coreRadius: 6,
    grazeRadius: 25,
    hp: 100,
    tp: 0,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const spawnTimerRef = useRef(0);
  const spriteImageRef = useRef<HTMLImageElement | null>(null);
  const trkImageRef = useRef<HTMLImageElement | null>(null);
  const hudMaskRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundImagesRef = useRef<HTMLImageElement[]>([]);
  const backgroundFrameRef = useRef(0);
  const backgroundTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const sceneRef = useRef<Scene>(1);
  const scene2GrazedRef = useRef<Set<number>>(new Set());

  const setSceneValue = (next: Scene) => {
    if (sceneRef.current === next) return;

    sceneRef.current = next;
    bulletsRef.current = [];
    spawnTimerRef.current = 0;
    scene2GrazedRef.current = new Set();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') {
        setSceneValue(1);
      } else if (e.key === '2') {
        setSceneValue(2);
      }

      keysRef.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = soulSprite;
    img.onload = () => {
      spriteImageRef.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = trkSprite;
    img.onload = () => {
      trkImageRef.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = battleHud;

    img.onload = () => {
      const mask = document.createElement('canvas');
      mask.width = HUD_SPRITE.width;
      mask.height = HUD_SPRITE.height;

      const maskCtx = mask.getContext('2d');
      if (!maskCtx) return;

      maskCtx.imageSmoothingEnabled = false;

      maskCtx.drawImage(
        img,
        HUD_SPRITE.x,
        HUD_SPRITE.y,
        HUD_SPRITE.width,
        HUD_SPRITE.height,
        0,
        0,
        HUD_SPRITE.width,
        HUD_SPRITE.height
      );

      const imageData = maskCtx.getImageData(0, 0, mask.width, mask.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const isLightBlue =
          r <= 10 &&
          g >= 140 &&
          g <= 170 &&
          b >= 240;

        if (isLightBlue) {
          data[i + 3] = 0;
        }
      }

      maskCtx.putImageData(imageData, 0, 0);
      hudMaskRef.current = mask;
    };
  }, []);

  useEffect(() => {
    const images = BACKGROUND_FRAMES.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });

    backgroundImagesRef.current = images;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const updateBackground = (deltaMs: number) => {
      const frames = backgroundImagesRef.current;
      if (frames.length === 0) return;

      backgroundTimeRef.current += deltaMs;

      while (backgroundTimeRef.current >= BACKGROUND_FRAME_DURATION_MS) {
        backgroundTimeRef.current -= BACKGROUND_FRAME_DURATION_MS;
        backgroundFrameRef.current = (backgroundFrameRef.current + 1) % frames.length;
      }
    };

    const spawnBullet = () => {
      const bullet: Bullet = {
        x: BOX_CONFIG.x + Math.random() * BOX_CONFIG.width,
        y: BOX_CONFIG.y - 10,
        radius: 6,
        speedY: 2 + Math.random() * 2,
        speedX: (Math.random() - 0.5) * 2,
        alreadyGrazed: false,
      };

      bulletsRef.current.push(bullet);
    };

    const drawScene2Shape = (ctxL: CanvasRenderingContext2D, shape: Scene2Shape) => {
      if (shape.kind === 'circle') {
        ctxL.beginPath();
        ctxL.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
        ctxL.fill();
        return;
      }

      if (shape.kind === 'square') {
        const half = shape.size / 2;
        ctxL.fillRect(shape.x - half, shape.y - half, shape.size, shape.size);
        return;
      }

      const { ax, ay, bx, by, cx: vx, cy: vy } = getTriangleVertices(
        shape.x,
        shape.y,
        shape.size
      );

      ctxL.beginPath();
      ctxL.moveTo(ax, ay);
      ctxL.lineTo(bx, by);
      ctxL.lineTo(vx, vy);
      ctxL.closePath();
      ctxL.fill();
    };

    const drawTrkIdleSword = (
      ctxL: CanvasRenderingContext2D,
      canvasElement: HTMLCanvasElement,
      time: number
    ) => {
      const sprite = trkImageRef.current;
      if (!sprite) return;

      const t = time / 3000;
      const bobY = Math.cos(t * 10) * 10;

      const scale = 3;
      const drawW = TRK_IDLE_SWORD_SPRITE.width * scale;
      const drawH = TRK_IDLE_SWORD_SPRITE.height * scale;

      const baseX = canvasElement.width - drawW - 24;
      const baseY = 250;

      const drawX = baseX;
      const drawY = baseY + bobY;

      const afterCount = 15;
      const span = -25;
      const spacing = 5;
      const speed = 100;
      const phase = (t * speed) % span;

      ctxL.save();
      ctxL.globalCompositeOperation = 'lighter';

      for (let i = 0; i < afterCount; i++) {
        const offset = (phase + i * spacing) % span - span / 2;
        const alpha = 0.3 - i * 0.04;

        if (alpha <= 0) continue;

        ctxL.globalAlpha = alpha;

        ctxL.drawImage(
          sprite,
          TRK_IDLE_SWORD_SPRITE.x,
          TRK_IDLE_SWORD_SPRITE.y,
          TRK_IDLE_SWORD_SPRITE.width,
          TRK_IDLE_SWORD_SPRITE.height,
          drawX + offset,
          drawY,
          drawW,
          drawH
        );
      }

      ctxL.restore();
      ctxL.globalAlpha = 1;

      ctxL.drawImage(
        sprite,
        TRK_IDLE_SWORD_SPRITE.x,
        TRK_IDLE_SWORD_SPRITE.y,
        TRK_IDLE_SWORD_SPRITE.width,
        TRK_IDLE_SWORD_SPRITE.height,
        drawX,
        drawY,
        drawW,
        drawH
      );
    };

    const update = (deltaMs: number, canvasElement: HTMLCanvasElement) => {
      const player = playerRef.current;
      const currentScene = sceneRef.current;

      updateBackground(deltaMs);

      if (keysRef.current['ArrowUp'] || keysRef.current['w'] || keysRef.current['W']) {
        player.y -= player.speed;
      }

      if (keysRef.current['ArrowDown'] || keysRef.current['s'] || keysRef.current['S']) {
        player.y += player.speed;
      }

      if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
        player.x -= player.speed;
      }

      if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
        player.x += player.speed;
      }

      if (currentScene === 1) {
        if (player.x < BOX_CONFIG.x + player.coreRadius) {
          player.x = BOX_CONFIG.x + player.coreRadius;
        }

        if (player.x > BOX_CONFIG.x + BOX_CONFIG.width - player.coreRadius) {
          player.x = BOX_CONFIG.x + BOX_CONFIG.width - player.coreRadius;
        }

        if (player.y < BOX_CONFIG.y + player.coreRadius) {
          player.y = BOX_CONFIG.y + player.coreRadius;
        }

        if (player.y > BOX_CONFIG.y + BOX_CONFIG.height - player.coreRadius) {
          player.y = BOX_CONFIG.y + BOX_CONFIG.height - player.coreRadius;
        }

        spawnTimerRef.current++;

        if (spawnTimerRef.current % 30 === 0) {
          spawnBullet();
        }

        const bullets = bulletsRef.current;

        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];

          b.x += b.speedX;
          b.y += b.speedY;

          const dx = player.x - b.x;
          const dy = player.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < player.coreRadius + b.radius) {
            player.hp -= 10;

            if (player.hp < 0) {
              player.hp = 0;
            }

            bullets.splice(i, 1);
            continue;
          }

          if (distance < player.grazeRadius + b.radius && !b.alreadyGrazed) {
            b.alreadyGrazed = true;
            player.tp += 5;

            if (player.tp > 100) {
              player.tp = 100;
            }
          }

          if (b.y > canvasElement.height + 20) {
            bullets.splice(i, 1);
          }
        }
      } else {
        if (player.x < player.coreRadius) {
          player.x = player.coreRadius;
        }

        if (player.x > canvasElement.width - player.coreRadius) {
          player.x = canvasElement.width - player.coreRadius;
        }

        if (player.y < player.coreRadius) {
          player.y = player.coreRadius;
        }

        if (player.y > canvasElement.height - player.coreRadius) {
          player.y = canvasElement.height - player.coreRadius;
        }

        SCENE2_SHAPES.forEach((shape, index) => {
          const coreHit = shapeIntersectsCircle(
            shape,
            player.x,
            player.y,
            player.coreRadius
          );

          if (coreHit) {
            player.hp -= 10;

            if (player.hp < 0) {
              player.hp = 0;
            }

            return;
          }

          const grazeHit = shapeIntersectsCircle(
            shape,
            player.x,
            player.y,
            player.grazeRadius
          );

          if (grazeHit && !scene2GrazedRef.current.has(index)) {
            scene2GrazedRef.current.add(index);

            player.tp += 5;

            if (player.tp > 100) {
              player.tp = 100;
            }
          }
        });
      }

      setDisplayHp(player.hp);
    };

    const render = (
      ctxL: CanvasRenderingContext2D,
      canvasElement: HTMLCanvasElement,
      time: number
    ) => {
      const player = playerRef.current;
      const sprite = spriteImageRef.current;
      const currentScene = sceneRef.current;

      ctxL.clearRect(0, 0, canvasElement.width, canvasElement.height);
      ctxL.imageSmoothingEnabled = false;

      ctxL.fillStyle = '#000';
      ctxL.fillRect(0, 0, canvasElement.width, canvasElement.height);

      const backgroundFrames = backgroundImagesRef.current;

      if (backgroundFrames.length > 0) {
        const bg = backgroundFrames[backgroundFrameRef.current];

        if (bg && bg.complete) {
          ctxL.drawImage(bg, 0, 0, canvasElement.width, canvasElement.height);
        }
      }

      const hudMask = hudMaskRef.current;

      if (hudMask) {
        ctxL.drawImage(hudMask, 0, 0, canvasElement.width, canvasElement.height);
      }

      if (currentScene === 1) {
        ctxL.fillStyle = '#000';
        ctxL.fillRect(BOX_CONFIG.x, BOX_CONFIG.y, BOX_CONFIG.width, BOX_CONFIG.height);

        ctxL.strokeStyle = '#00ff00';
        ctxL.lineWidth = 2;
        ctxL.strokeRect(BOX_CONFIG.x, BOX_CONFIG.y, BOX_CONFIG.width, BOX_CONFIG.height);
      }

      drawTrkIdleSword(ctxL, canvasElement, time);

      if (sprite) {
        const grazeSize = player.grazeRadius * 2;

        ctxL.drawImage(
          sprite,
          GRAZE_SPRITE.x,
          GRAZE_SPRITE.y,
          GRAZE_SPRITE.width,
          GRAZE_SPRITE.height,
          player.x - grazeSize / 2,
          player.y - grazeSize / 2,
          grazeSize,
          grazeSize
        );
      }

      if (sprite) {
        const soulSize = 16;

        ctxL.drawImage(
          sprite,
          RED_SOUL_SPRITE.x,
          RED_SOUL_SPRITE.y,
          RED_SOUL_SPRITE.width,
          RED_SOUL_SPRITE.height,
          player.x - soulSize / 2,
          player.y - soulSize / 2,
          soulSize,
          soulSize
        );
      }

      ctxL.fillStyle = '#fff';

      if (currentScene === 1) {
        for (const b of bulletsRef.current) {
          ctxL.beginPath();
          ctxL.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctxL.fill();
        }
      } else {
        for (const shape of SCENE2_SHAPES) {
          drawScene2Shape(ctxL, shape);
        }
      }

      ctxL.fillStyle = '#fff';
      ctxL.font = '16px monospace';
      ctxL.fillText(`HP: ${player.hp}`, 20, 30);
      ctxL.fillText(`TP: ${player.tp.toFixed(0)}%`, 20, 60);
      ctxL.fillText(`Scene: ${currentScene}`, 20, 90);
    };

    const gameLoop = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      const deltaMs = time - lastTimeRef.current;
      lastTimeRef.current = time;

      update(deltaMs, canvas);
      render(ctx, canvas, time);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={styles.container}>
      <BorderBackground hp={displayHp} />

      <canvas
        ref={canvasRef}
        width={1200}
        height={900}
        style={styles.canvas}
      />
    </div>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  canvas: {
    backgroundColor: '#000',
    position: 'relative' as const,
    zIndex: 1,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function circleIntersectsCircle(
  cx: number,
  cy: number,
  radius: number,
  sx: number,
  sy: number,
  sr: number
) {
  const dx = cx - sx;
  const dy = cy - sy;

  return dx * dx + dy * dy <= (radius + sr) * (radius + sr);
}

function circleIntersectsSquare(
  cx: number,
  cy: number,
  radius: number,
  sx: number,
  sy: number,
  size: number
) {
  const half = size / 2;

  const closestX = clamp(cx, sx - half, sx + half);
  const closestY = clamp(cy, sy - half, sy + half);

  const dx = cx - closestX;
  const dy = cy - closestY;

  return dx * dx + dy * dy <= radius * radius;
}

function circleIntersectsTriangle(
  cx: number,
  cy: number,
  radius: number,
  tx: number,
  ty: number,
  size: number
) {
  const { ax, ay, bx, by, cx: vx, cy: vy } = getTriangleVertices(tx, ty, size);

  if (pointInTriangle(cx, cy, ax, ay, bx, by, vx, vy)) {
    return true;
  }

  const d1 = distanceToSegment(cx, cy, ax, ay, bx, by);
  const d2 = distanceToSegment(cx, cy, bx, by, vx, vy);
  const d3 = distanceToSegment(cx, cy, vx, vy, ax, ay);

  return Math.min(d1, d2, d3) <= radius;
}

function shapeIntersectsCircle(
  shape: Scene2Shape,
  cx: number,
  cy: number,
  radius: number
) {
  if (shape.kind === 'circle') {
    return circleIntersectsCircle(cx, cy, radius, shape.x, shape.y, shape.radius);
  }

  if (shape.kind === 'square') {
    return circleIntersectsSquare(cx, cy, radius, shape.x, shape.y, shape.size);
  }

  return circleIntersectsTriangle(cx, cy, radius, shape.x, shape.y, shape.size);
}

function getTriangleVertices(x: number, y: number, size: number) {
  const height = (size * Math.sqrt(3)) / 2;

  const ax = x;
  const ay = y - (2 * height) / 3;

  const bx = x - size / 2;
  const by = y + height / 3;

  const cx = x + size / 2;
  const cy = y + height / 3;

  return { ax, ay, bx, by, cx, cy };
}

function pointInTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
) {
  const sign = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ) => {
    return (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  };

  const b1 = sign(px, py, ax, ay, bx, by) < 0;
  const b2 = sign(px, py, bx, by, cx, cy) < 0;
  const b3 = sign(px, py, cx, cy, ax, ay) < 0;

  return b1 === b2 && b2 === b3;
}

function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const dx = bx - ax;
  const dy = by - ay;

  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1);

  const ex = ax + t * dx;
  const ey = ay + t * dy;

  return Math.hypot(px - ex, py - ey);
}

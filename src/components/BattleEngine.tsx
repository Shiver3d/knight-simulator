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

type BattlePhase = 'command' | 'enemy';

type ActionName = 'FIGHT' | 'ACT' | 'ITEM' | 'SPARE' | 'DEFEND' | 'MAGIC';

const COMMAND_ACTIONS: ActionName[] = ['FIGHT', 'ACT', 'ITEM', 'SPARE', 'DEFEND', 'MAGIC'];

const COMMAND_MENU = {
  x: 24,
  y: 726,
  width: 540,
  height: 146,
  padding: 14,
  buttonWidth: 76,
  buttonHeight: 34,
  buttonGap: 8,
} as const;

const ENEMY_PHASE_DURATION_MS = 9000;

type Scene2Shape =
  | { kind: 'circle'; x: number; y: number; radius: number }
  | { kind: 'square'; x: number; y: number; size: number }
  | { kind: 'triangle'; x: number; y: number; size: number };

interface BattleEngineProps {
  initialScene?: Scene;
  debugEnabled?: boolean;
  debugSettings?: DebugSettings;
}

export interface DebugSettings {
  coreRadius: number;
  grazeRadius: number;
  playerSpeed: number;
  enemySpeed: number;
}

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

/** Slots (grades azuis) no layout de batalha — coordenadas relativas ao recorte HUD 640×480 */
const BATTLE_HUD_SLOTS = [
  { id: 'slot1', x: 0, y: 327, width: 212, height: 36 },
  { id: 'slot2', x: 213, y: 327, width: 211, height: 36 },
  { id: 'slot3', x: 425, y: 327, width: 211, height: 36 },
] as const;

/** Sprites simples (só HP) na coluna EN do battleHud.png */
const CHARACTER_HUD_SPRITES = {
  KRIS: { x: 690, y: 281, width: 213, height: 34 },
  SUSIE: { x: 690, y: 354, width: 213, height: 34 },
  RALSEI: { x: 690, y: 427, width: 213, height: 34 },
  NOELLE: { x: 690, y: 500, width: 213, height: 34 },
} as const;

/** Áreas dinâmicas dentro de cada painel 213×34 (transparentes na máscara) */
const HP_BAR_REL = { x: 128, y: 19, width: 76, height: 9 };
const HP_TEXT_REL = { x: 118, y: 4, width: 92, height: 14 };

/** Bordas laterais do sprite — mascaradas; desenhadas em runtime no turno do personagem */
const TURN_BORDER_WIDTH = 2;

const HP_BAR_EMPTY = '#7F0001';

/** Margem acima dos slots da party — balas não entram na HUD */
const BULLET_HUD_MARGIN = 4;

type CharacterId = keyof typeof CHARACTER_HUD_SPRITES;

type CharacterActionState = Record<CharacterId, ActionName | null>;

function createEmptyActionState(): CharacterActionState {
  return {
    KRIS: null,
    SUSIE: null,
    RALSEI: null,
    NOELLE: null,
  };
}

/** Cor assinatura (barra de HP e borda de turno) */
const CHARACTER_SIGNATURE_COLORS: Record<CharacterId, string> = {
  KRIS: '#00FFFF',
  SUSIE: '#FF00FF',
  RALSEI: '#00FF00',
  NOELLE: '#FFFF00',
};

interface PartyMember {
  id: CharacterId;
  name: string;
  atk: number;
  def: number;
  maxHp: number;
  hp: number;
}

const INITIAL_PARTY: PartyMember[] = [
  { id: 'KRIS', name: 'KRIS', atk: 10, def: 10, maxHp: 90, hp: 90 },
  { id: 'SUSIE', name: 'SUSIE', atk: 12, def: 6, maxHp: 90, hp: 90 },
  { id: 'RALSEI', name: 'RALSEI', atk: 8, def: 8, maxHp: 70, hp: 70 },
  { id: 'NOELLE', name: 'NOELLE', atk: 10, def: 2, maxHp: 80, hp: 80 },
];

/** Três personagens visíveis nos slots da batalha (ordem: esquerda → direita) */
const ACTIVE_BATTLE_PARTY: CharacterId[] = ['KRIS', 'SUSIE', 'RALSEI'];

const TP_BAR_RECT = {
  x: 38,
  y: 41,
  width: 25,
  height: 195,
};

const TP_VALUE_RECT = {
  x: 8,
  y: 117,
  width: 28,
  height: 18,
};

const GRAZE_FADE_IN_MS = 80;
const GRAZE_FADE_OUT_MS = 420;

const BACKGROUND_FRAME_DURATION_MS = 1000 / 12;

const BOX_SIZE = {
  width: 200,
  height: 200,
};

const VIRTUAL_CANVAS_SIZE = {
  width: 1200,
  height: 900,
};

const MAX_DPR = 2;

const DEFAULT_DEBUG_SETTINGS: DebugSettings = {
  coreRadius: 6,
  grazeRadius: 25,
  playerSpeed: 2,
  enemySpeed: 1,
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

export const BattleEngine: React.FC<BattleEngineProps> = ({
  initialScene = 1,
  debugEnabled = false,
  debugSettings = DEFAULT_DEBUG_SETTINGS,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});

  const [displayHp, setDisplayHp] = useState(90);

  const playerRef = useRef<PlayerState>({
    x: 320,
    y: 240,
    speed: debugSettings.playerSpeed,
    coreRadius: debugSettings.coreRadius,
    grazeRadius: debugSettings.grazeRadius,
    tp: 0,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const spawnTimerRef = useRef(0);
  const spriteImageRef = useRef<HTMLImageElement | null>(null);
  const trkImageRef = useRef<HTMLImageElement | null>(null);
  const hudMaskRef = useRef<HTMLCanvasElement | null>(null);
  const hudImageRef = useRef<HTMLImageElement | null>(null);
  const characterHudMasksRef = useRef<Partial<Record<CharacterId, HTMLCanvasElement>>>({});
  const partyRef = useRef<PartyMember[]>(INITIAL_PARTY.map((m) => ({ ...m })));
  const activeTurnCharacterRef = useRef<CharacterId | null>(null);
  const battlePhaseRef = useRef<BattlePhase>('command');
  const selectedActionIndexRef = useRef(0);
  const activePartyTurnIndexRef = useRef(0);
  const partyActionsRef = useRef<CharacterActionState>(createEmptyActionState());
  const enemyPhaseStartRef = useRef(0);
  const backgroundImagesRef = useRef<HTMLImageElement[]>([]);
  const backgroundFrameRef = useRef(0);
  const backgroundTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const sceneRef = useRef<Scene>(initialScene);
  const scene2GrazedRef = useRef<Set<number>>(new Set());
  const lastGrazeTimeRef = useRef<number>(-Infinity);
  const invulnUntilRef = useRef(0);
  const debugEnabledRef = useRef(debugEnabled);
  const debugSettingsRef = useRef<DebugSettings>(debugSettings);

  const centerPlayer = (scene: Scene) => {
    if (scene === 1) {
      const box = getBox();
      playerRef.current.x = box.x + box.width / 2;
      playerRef.current.y = box.y + box.height / 2;
    } else {
      playerRef.current.x = VIRTUAL_CANVAS_SIZE.width / 2;
      playerRef.current.y = VIRTUAL_CANVAS_SIZE.height / 2;
    }
  };

  const resetBattleCommandState = () => {
    battlePhaseRef.current = 'command';
    selectedActionIndexRef.current = 0;
    activePartyTurnIndexRef.current = 0;
    partyActionsRef.current = createEmptyActionState();
    enemyPhaseStartRef.current = 0;
    activeTurnCharacterRef.current = ACTIVE_BATTLE_PARTY[0];
  };

  const beginEnemyPhase = (time: number) => {
    battlePhaseRef.current = 'enemy';
    enemyPhaseStartRef.current = time;
    activeTurnCharacterRef.current = null;
  };

  const setSceneValue = (next: Scene) => {
    if (sceneRef.current === next) return;

    sceneRef.current = next;
    bulletsRef.current = [];
    spawnTimerRef.current = 0;
    scene2GrazedRef.current = new Set();
    resetBattleCommandState();
    centerPlayer(next);
  };

  useEffect(() => {
    debugEnabledRef.current = debugEnabled;
  }, [debugEnabled]);

  useEffect(() => {
    debugSettingsRef.current = debugSettings;
  }, [debugSettings]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') {
        setSceneValue(1);
      } else if (e.key === '2') {
        setSceneValue(2);
      }

      if (battlePhaseRef.current === 'command') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
        }

        if (e.key === 'ArrowLeft') {
          selectedActionIndexRef.current =
            (selectedActionIndexRef.current + COMMAND_ACTIONS.length - 1) % COMMAND_ACTIONS.length;
          return;
        }

        if (e.key === 'ArrowRight') {
          selectedActionIndexRef.current =
            (selectedActionIndexRef.current + 1) % COMMAND_ACTIONS.length;
          return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
          const currentCharacter = ACTIVE_BATTLE_PARTY[activePartyTurnIndexRef.current];

          if (!currentCharacter) {
            return;
          }

          const selectedAction = COMMAND_ACTIONS[selectedActionIndexRef.current];
          partyActionsRef.current = {
            ...partyActionsRef.current,
            [currentCharacter]: selectedAction,
          };

          const nextIndex = activePartyTurnIndexRef.current + 1;

          if (nextIndex >= ACTIVE_BATTLE_PARTY.length) {
            beginEnemyPhase(performance.now());
          } else {
            activePartyTurnIndexRef.current = nextIndex;
            selectedActionIndexRef.current = 0;
            activeTurnCharacterRef.current = ACTIVE_BATTLE_PARTY[nextIndex];
          }

          return;
        }

        return;
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
      hudImageRef.current = img;

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

        if (isHudPlaceholderPixel(r, g, b)) {
          data[i + 3] = 0;
        }
      }

      maskCtx.putImageData(imageData, 0, 0);
      hudMaskRef.current = mask;

      const masks: Partial<Record<CharacterId, HTMLCanvasElement>> = {};
      for (const id of Object.keys(CHARACTER_HUD_SPRITES) as CharacterId[]) {
        const sprite = CHARACTER_HUD_SPRITES[id];
        const panel = document.createElement('canvas');
        panel.width = sprite.width;
        panel.height = sprite.height;

        const panelCtx = panel.getContext('2d');
        if (!panelCtx) continue;

        panelCtx.imageSmoothingEnabled = false;
        panelCtx.drawImage(
          img,
          sprite.x,
          sprite.y,
          sprite.width,
          sprite.height,
          0,
          0,
          sprite.width,
          sprite.height
        );

        const panelData = panelCtx.getImageData(0, 0, panel.width, panel.height);
        const panelPixels = panelData.data;

        for (let py = 0; py < sprite.height; py++) {
          for (let px = 0; px < sprite.width; px++) {
            const inBar =
              px >= HP_BAR_REL.x &&
              px < HP_BAR_REL.x + HP_BAR_REL.width &&
              py >= HP_BAR_REL.y &&
              py < HP_BAR_REL.y + HP_BAR_REL.height;

            const inText =
              px >= HP_TEXT_REL.x &&
              px < HP_TEXT_REL.x + HP_TEXT_REL.width &&
              py >= HP_TEXT_REL.y &&
              py < HP_TEXT_REL.y + HP_TEXT_REL.height;

            const inTurnBorder =
              px < TURN_BORDER_WIDTH || px >= sprite.width - TURN_BORDER_WIDTH;

            if (inBar || inText || inTurnBorder) {
              const i = (py * sprite.width + px) * 4;
              panelPixels[i + 3] = 0;
            }
          }
        }

        panelCtx.putImageData(panelData, 0, 0);
        masks[id] = panel;
      }

      characterHudMasksRef.current = masks;
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

    centerPlayer(sceneRef.current);

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

    const spawnBullet = (box: BoxDimensions) => {
      const bullet: Bullet = {
        x: box.x + Math.random() * box.width,
        y: box.y - 10,
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

    const drawPartyHud = (
      ctxL: CanvasRenderingContext2D,
      scaleX: number,
      scaleY: number
    ) => {
      const party = partyRef.current;
      const masks = characterHudMasksRef.current;

      ACTIVE_BATTLE_PARTY.forEach((charId, slotIndex) => {
        const slot = BATTLE_HUD_SLOTS[slotIndex];
        const member = party.find((m) => m.id === charId);
        const panel = masks?.[charId];

        if (!slot || !member || !panel) return;

        const destX = slot.x * scaleX;
        const destY = slot.y * scaleY;
        const destW = slot.width * scaleX;
        const destH = slot.height * scaleY;

        ctxL.drawImage(panel, destX, destY, destW, destH);

        const barX = destX + (HP_BAR_REL.x / panel.width) * destW;
        const barY = destY + (HP_BAR_REL.y / panel.height) * destH;
        const barW = (HP_BAR_REL.width / panel.width) * destW;
        const barH = (HP_BAR_REL.height / panel.height) * destH;
        const hpRatio = Math.min(1, Math.max(0, member.hp / member.maxHp));

        if (barW > 0 && barH > 0) {
          ctxL.fillStyle = HP_BAR_EMPTY;
          ctxL.fillRect(barX, barY, barW, barH);

          const fillW = barW * hpRatio;
          if (fillW > 0) {
            ctxL.fillStyle = CHARACTER_SIGNATURE_COLORS[charId];
            ctxL.fillRect(barX, barY, fillW, barH);
          }
        }

        const textX = destX + ((HP_TEXT_REL.x + HP_TEXT_REL.width) / panel.width) * destW;
        const textY = destY + ((HP_TEXT_REL.y + HP_TEXT_REL.height / 2) / panel.height) * destH;
        const fontSize = Math.max(8, Math.floor(11 * scaleY));
        const hpLabel = `${member.hp} / ${member.maxHp}`;

        ctxL.save();
        ctxL.font = `${fontSize}px Determination`;
        ctxL.textAlign = 'right';
        ctxL.textBaseline = 'middle';
        ctxL.strokeStyle = '#000000';
        ctxL.lineWidth = Math.max(1, scaleX);
        ctxL.strokeText(hpLabel, textX, textY);
        ctxL.fillStyle = '#ffffff';
        ctxL.fillText(hpLabel, textX, textY);
        ctxL.restore();

        if (activeTurnCharacterRef.current === charId) {
          drawTurnBorderHighlight(
            ctxL,
            destX,
            destY,
            destW,
            destH,
            CHARACTER_SIGNATURE_COLORS[charId],
          );
        }
      });
    };

    const drawTrkIdleSword = (
      ctxL: CanvasRenderingContext2D,
      time: number
    ) => {
      const sprite = trkImageRef.current;
      if (!sprite) return;

      const t = time / 1000;
      const bobY = Math.cos(t * 2.6) * 10;

      const scale = 3;
      const drawW = TRK_IDLE_SWORD_SPRITE.width * scale;
      const drawH = TRK_IDLE_SWORD_SPRITE.height * scale;

      const baseX = VIRTUAL_CANVAS_SIZE.width - drawW - 24;
      const baseY = 250;

      const drawX = baseX;
      const drawY = baseY + bobY;

      const afterCount = 20;
      const span = -10;
      const spacing = 7;
      const speed = 20;
      const phase = (t * speed) % span;

      ctxL.save();
      ctxL.globalCompositeOperation = 'lighter';

      for (let i = 0; i < afterCount; i++) {
        const offset = phase - span / 2 + i * spacing;
        const alpha = 0.35 - i * 0.03;

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

    const getKrisHp = () => {
      const kris = partyRef.current.find((m) => m.id === 'KRIS');
      return kris?.hp ?? 0;
    };

    const damageKris = (amount: number) => {
      const kris = partyRef.current.find((m) => m.id === 'KRIS');
      if (!kris) return;

      kris.hp = Math.max(0, kris.hp - amount);
    };

    const update = (deltaMs: number, time: number) => {
      const player = playerRef.current;
      const settings = debugSettingsRef.current;
      const enemySpeed = settings.enemySpeed;
      const box = getBox();
      const currentScene = sceneRef.current;
      const currentBattlePhase = battlePhaseRef.current;

      player.speed = settings.playerSpeed;
      player.coreRadius = settings.coreRadius;
      player.grazeRadius = settings.grazeRadius;

      updateBackground(deltaMs);

      if (currentBattlePhase === 'enemy' && enemyPhaseStartRef.current > 0) {
        if (time - enemyPhaseStartRef.current >= ENEMY_PHASE_DURATION_MS) {
          bulletsRef.current = [];
          spawnTimerRef.current = 0;
          scene2GrazedRef.current = new Set();
          invulnUntilRef.current = 0;
          lastGrazeTimeRef.current = -Infinity;
          resetBattleCommandState();
          centerPlayer(currentScene);
          setDisplayHp(getKrisHp());
          return;
        }
      }

      if (currentBattlePhase === 'command') {
        setDisplayHp(getKrisHp());
        return;
      }

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
        if (player.x < box.x + player.coreRadius) {
          player.x = box.x + player.coreRadius;
        }

        if (player.x > box.x + box.width - player.coreRadius) {
          player.x = box.x + box.width - player.coreRadius;
        }

        if (player.y < box.y + player.coreRadius) {
          player.y = box.y + player.coreRadius;
        }

        if (player.y > box.y + box.height - player.coreRadius) {
          player.y = box.y + box.height - player.coreRadius;
        }

        spawnTimerRef.current++;

        if (spawnTimerRef.current % 30 === 0) {
          spawnBullet(box);
        }

        const bullets = bulletsRef.current;

        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];

          b.x += b.speedX * enemySpeed;
          b.y += b.speedY * enemySpeed;

          const dx = player.x - b.x;
          const dy = player.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < player.coreRadius + b.radius) {
            if (time < invulnUntilRef.current) {
              continue;
            }
            damageKris(10);
            invulnUntilRef.current = time + 1000;

            bullets.splice(i, 1);
            continue;
          }

          if (distance < player.grazeRadius + b.radius && !b.alreadyGrazed) {
            b.alreadyGrazed = true;
            player.tp += 5;

            if (player.tp > 100) {
              player.tp = 100;
            }

            lastGrazeTimeRef.current = time;
          }

          if (b.y - b.radius > getBulletHudCeilingY()) {
            bullets.splice(i, 1);
          }
        }
      } else {
        if (player.x < player.coreRadius) {
          player.x = player.coreRadius;
        }

        if (player.x > VIRTUAL_CANVAS_SIZE.width - player.coreRadius) {
          player.x = VIRTUAL_CANVAS_SIZE.width - player.coreRadius;
        }

        if (player.y < player.coreRadius) {
          player.y = player.coreRadius;
        }

        if (player.y > VIRTUAL_CANVAS_SIZE.height - player.coreRadius) {
          player.y = VIRTUAL_CANVAS_SIZE.height - player.coreRadius;
        }

        SCENE2_SHAPES.forEach((shape, index) => {
          const coreHit = shapeIntersectsCircle(
            shape,
            player.x,
            player.y,
            player.coreRadius
          );

          if (coreHit) {
            if (time < invulnUntilRef.current) {
              return;
            }
            damageKris(10);
            invulnUntilRef.current = time + 3000;

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

            lastGrazeTimeRef.current = time;
          }
        });
      }

      setDisplayHp(getKrisHp());
    };

    const drawActionMenu = (ctxL: CanvasRenderingContext2D) => {
      const phase = battlePhaseRef.current;
      const selectedActionIndex = selectedActionIndexRef.current;
      const activePartyIndex = Math.min(
        activePartyTurnIndexRef.current,
        ACTIVE_BATTLE_PARTY.length - 1
      );
      const activeCharacter = ACTIVE_BATTLE_PARTY[activePartyIndex] ?? null;
      const menuX = COMMAND_MENU.x;
      const menuY = COMMAND_MENU.y;
      const menuWidth = COMMAND_MENU.width;
      const menuHeight = COMMAND_MENU.height;
      const innerX = menuX + COMMAND_MENU.padding;
      const buttonY = menuY + 34;
      const summaryY = buttonY + COMMAND_MENU.buttonHeight + 20;
      const actions = partyActionsRef.current;

      ctxL.save();
      ctxL.fillStyle = '#000000';
      ctxL.fillRect(menuX, menuY, menuWidth, menuHeight);
      ctxL.strokeStyle = phase === 'command' ? '#FFFFFF' : '#666666';
      ctxL.lineWidth = 2;
      ctxL.strokeRect(menuX, menuY, menuWidth, menuHeight);

      ctxL.fillStyle = '#FFFFFF';
      ctxL.font = '14px Determination';
      ctxL.textAlign = 'left';
      ctxL.textBaseline = 'top';
      ctxL.fillText(
        phase === 'command'
          ? `TURN: ${activeCharacter ?? 'WAIT'}`
          : 'ENEMY ATTACK',
        menuX + COMMAND_MENU.padding,
        menuY + 10
      );

      ctxL.font = '12px Determination';
      COMMAND_ACTIONS.forEach((action, index) => {
        const buttonX = innerX + index * (COMMAND_MENU.buttonWidth + COMMAND_MENU.buttonGap);
        const isSelected = phase === 'command' && index === selectedActionIndex;

        ctxL.fillStyle = isSelected ? '#4A4300' : '#111111';
        ctxL.fillRect(buttonX, buttonY, COMMAND_MENU.buttonWidth, COMMAND_MENU.buttonHeight);
        ctxL.strokeStyle = isSelected ? '#FBFF0D' : '#FF9A1F';
        ctxL.lineWidth = isSelected ? 3 : 2;
        ctxL.strokeRect(buttonX, buttonY, COMMAND_MENU.buttonWidth, COMMAND_MENU.buttonHeight);

        ctxL.fillStyle = isSelected ? '#FBFF0D' : '#FFFFFF';
        ctxL.textAlign = 'center';
        ctxL.textBaseline = 'middle';
        ctxL.fillText(
          action,
          buttonX + COMMAND_MENU.buttonWidth / 2,
          buttonY + COMMAND_MENU.buttonHeight / 2 + 0.5
        );

        if (isSelected) {
          ctxL.font = '11px Determination';
          ctxL.fillStyle = '#FBFF0D';
          ctxL.textBaseline = 'top';
          ctxL.fillText(action, buttonX + COMMAND_MENU.buttonWidth / 2, buttonY + COMMAND_MENU.buttonHeight + 4);
          ctxL.font = '12px Determination';
        }
      });

      ctxL.textAlign = 'left';
      ctxL.textBaseline = 'top';
      ctxL.font = '11px Determination';

      ACTIVE_BATTLE_PARTY.forEach((charId, index) => {
        const action = actions[charId];
        const statusX = menuX + COMMAND_MENU.padding + index * 168;
        const statusY = summaryY + Math.floor(index / 2) * 16;
        const isCurrent = phase === 'command' && charId === activeCharacter;

        ctxL.fillStyle = action ? '#FBFF0D' : isCurrent ? '#FFFFFF' : '#8A8A8A';
        ctxL.fillText(`${charId}: ${action ?? 'PENDING'}`, statusX, statusY);
      });

      ctxL.restore();
    };

    const render = (
      ctxL: CanvasRenderingContext2D,
      time: number
    ) => {
      const player = playerRef.current;
      const sprite = spriteImageRef.current;
      const currentScene = sceneRef.current;
      const box = getBox();
      const hudScaleX = VIRTUAL_CANVAS_SIZE.width / HUD_SPRITE.width;
      const hudScaleY = VIRTUAL_CANVAS_SIZE.height / HUD_SPRITE.height;
      const grazeElapsed = time - lastGrazeTimeRef.current;
      let grazeAlpha = 0;

      if (grazeElapsed >= 0 && grazeElapsed <= GRAZE_FADE_IN_MS + GRAZE_FADE_OUT_MS) {
        if (grazeElapsed <= GRAZE_FADE_IN_MS) {
          grazeAlpha = grazeElapsed / GRAZE_FADE_IN_MS;
        } else {
          grazeAlpha =
            1 - (grazeElapsed - GRAZE_FADE_IN_MS) / GRAZE_FADE_OUT_MS;
        }
      }

      ctxL.clearRect(0, 0, VIRTUAL_CANVAS_SIZE.width, VIRTUAL_CANVAS_SIZE.height);
      ctxL.imageSmoothingEnabled = false;

      ctxL.fillStyle = '#000';
      ctxL.fillRect(0, 0, VIRTUAL_CANVAS_SIZE.width, VIRTUAL_CANVAS_SIZE.height);

      const backgroundFrames = backgroundImagesRef.current;

      if (backgroundFrames.length > 0) {
        const bg = backgroundFrames[backgroundFrameRef.current];

        if (bg && bg.complete) {
          ctxL.drawImage(bg, 0, 0, VIRTUAL_CANVAS_SIZE.width, VIRTUAL_CANVAS_SIZE.height);
        }
      }

      const hudMask = hudMaskRef.current;
      if (hudMask) {
        ctxL.drawImage(hudMask, 0, 0, VIRTUAL_CANVAS_SIZE.width, VIRTUAL_CANVAS_SIZE.height);
      }

      const barInset = Math.max(2, Math.round(2 * hudScaleX));
      const barX = TP_BAR_RECT.x * hudScaleX + barInset;
      const barY = TP_BAR_RECT.y * hudScaleY + barInset;
      const barW = TP_BAR_RECT.width * hudScaleX - barInset * 2;
      const barH = TP_BAR_RECT.height * hudScaleY - barInset * 2;
      const tpRatio = Math.min(1, Math.max(0, player.tp / 100));

      if (barW > 0 && barH > 0) {
        ctxL.fillStyle = '#7F0001';
        ctxL.fillRect(barX, barY, barW, barH);

        const fillH = barH * tpRatio;
        if (fillH > 0) {
          const fillY = barY + (barH - fillH);
          ctxL.fillStyle = '#FAA743';
          ctxL.fillRect(barX, fillY, barW, fillH);

          const highlightH = Math.min(fillH, Math.max(2, Math.round(2 * hudScaleY)));
          ctxL.fillStyle = '#ffffff';
          ctxL.fillRect(barX, fillY, barW, highlightH);
        }
      }

      const isTpMax = player.tp >= 100;
      const tpText = isTpMax ? 'MAX' : `${Math.round(player.tp)}`;
      const tpX = (TP_VALUE_RECT.x + TP_VALUE_RECT.width / 2) * hudScaleX;
      const tpY = (TP_VALUE_RECT.y + TP_VALUE_RECT.height / 2) * hudScaleY;
      const tpFontSize = Math.max(
        10,
        Math.floor(TP_VALUE_RECT.height * hudScaleY * (isTpMax ? 0.78 : 1.05)),
      );

      ctxL.save();
      ctxL.font = `${tpFontSize}px Determination`;
      ctxL.textAlign = 'center';
      ctxL.textBaseline = 'middle';
      ctxL.strokeStyle = '#000000';
      ctxL.lineWidth = Math.max(1, hudScaleX);
      ctxL.strokeText(tpText, tpX, tpY);
      ctxL.fillStyle = isTpMax ? '#FAA743' : '#ffffff';
      ctxL.fillText(tpText, tpX, tpY);
      ctxL.restore();

      if (currentScene === 1) {
        ctxL.fillStyle = '#000';
        ctxL.fillRect(box.x, box.y, box.width, box.height);

        ctxL.strokeStyle = '#00ff00';
        ctxL.lineWidth = 2;
        ctxL.strokeRect(box.x, box.y, box.width, box.height);
      }

      drawTrkIdleSword(ctxL, time);

      if (sprite) {
        const grazeSize = player.grazeRadius * 2;

        if (grazeAlpha > 0) {
          ctxL.save();
          ctxL.globalAlpha = grazeAlpha;
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
          ctxL.restore();
        }
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

      if (currentScene === 1 && battlePhaseRef.current === 'enemy') {
        const bulletCeiling = getBulletHudCeilingY();

        ctxL.save();
        ctxL.beginPath();
        ctxL.rect(0, 0, VIRTUAL_CANVAS_SIZE.width, bulletCeiling);
        ctxL.clip();

        for (const b of bulletsRef.current) {
          ctxL.beginPath();
          ctxL.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctxL.fill();
        }

        ctxL.restore();
      } else if (battlePhaseRef.current === 'enemy') {
        for (const shape of SCENE2_SHAPES) {
          drawScene2Shape(ctxL, shape);
        }
      }

      // Draw HUD mask on top of game elements so the TP bar/numbers
      // appear between the background and the HUD graphics.
      const hudMaskAfter = hudMaskRef.current;
      if (hudMaskAfter) {
        ctxL.drawImage(hudMaskAfter, 0, 0, VIRTUAL_CANVAS_SIZE.width, VIRTUAL_CANVAS_SIZE.height);
      }

      drawPartyHud(ctxL, hudScaleX, hudScaleY);

      drawActionMenu(ctxL);

      if (debugEnabledRef.current) {
        ctxL.save();
        ctxL.fillStyle = '#00ff00';
        ctxL.font = 'italic 14px Determination';
        ctxL.textAlign = 'left';
        ctxL.textBaseline = 'top';
        ctxL.fillText('debug_protocol.dll running!', 12, 10);
        ctxL.restore();
      }

    };

    const syncCanvasResolution = (
      canvasElement: HTMLCanvasElement,
      ctxL: CanvasRenderingContext2D,
    ) => {
      const cssWidth = canvasElement.clientWidth || VIRTUAL_CANVAS_SIZE.width;
      const cssHeight = canvasElement.clientHeight || VIRTUAL_CANVAS_SIZE.height;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

      const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
      const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

      if (canvasElement.width !== pixelWidth || canvasElement.height !== pixelHeight) {
        canvasElement.width = pixelWidth;
        canvasElement.height = pixelHeight;
      }

      const scaleX = pixelWidth / VIRTUAL_CANVAS_SIZE.width;
      const scaleY = pixelHeight / VIRTUAL_CANVAS_SIZE.height;
      ctxL.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      ctxL.imageSmoothingEnabled = false;
    };

    const gameLoop = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      const deltaMs = time - lastTimeRef.current;
      lastTimeRef.current = time;

      syncCanvasResolution(canvas, ctx);
      update(deltaMs, time);
      render(ctx, time);

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
        width={VIRTUAL_CANVAS_SIZE.width}
        height={VIRTUAL_CANVAS_SIZE.height}
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
    width: 'min(100vw, 133.33vh)',
    height: 'min(75vw, 100vh)',
    aspectRatio: '4 / 3',
  },
};

function getHudScale() {
  return {
    x: VIRTUAL_CANVAS_SIZE.width / HUD_SPRITE.width,
    y: VIRTUAL_CANVAS_SIZE.height / HUD_SPRITE.height,
  };
}

function getPartyHudTopY() {
  const hudScale = getHudScale();
  return BATTLE_HUD_SLOTS[0].y * hudScale.y;
}

function getBulletHudCeilingY() {
  return getPartyHudTopY() - BULLET_HUD_MARGIN;
}

function getBox(): BoxDimensions {
  const hudScale = getHudScale();
  const partyHudTop = getPartyHudTopY();
  const topMargin = 48 * hudScale.y;
  const bottomMargin = 10 * hudScale.y;
  const maxBottom = partyHudTop - bottomMargin;
  const availableHeight = maxBottom - topMargin;
  const height = Math.min(BOX_SIZE.height, Math.floor(availableHeight));
  const width = BOX_SIZE.width;
  const x = (VIRTUAL_CANVAS_SIZE.width - width) / 2;
  const y = topMargin + (availableHeight - height) / 2;

  return { x, y, width, height };
}

/** Borda colorida do turno ativo — chamar quando a fila de ações existir */
function drawTurnBorderHighlight(
  ctx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  color: string,
) {
  const borderW = Math.max(TURN_BORDER_WIDTH, Math.round(TURN_BORDER_WIDTH * (destW / 213)));

  ctx.fillStyle = color;
  ctx.fillRect(destX, destY, borderW, destH);
  ctx.fillRect(destX + destW - borderW, destY, borderW, destH);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isHudPlaceholderPixel(r: number, g: number, b: number) {
  const isLightBlue = r <= 10 && g >= 140 && g <= 170 && b >= 240;
  const isTpBlue = r <= 10 && g <= 60 && b >= 240;
  return isLightBlue || isTpBlue;
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

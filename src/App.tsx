import { useRef, useState } from 'react';
import { BattleEngine } from './components/BattleEngine';
import Loading from './components/Loading';
import DebugMenu from './components/DebugMenu.tsx';
import MainMenu from './components/MainMenu';
import Wdg from './components/wdg';
import type { TrackOption } from './components/music';
import type { DebugSettings } from './components/BattleEngine';
import { createLoopingAudio, type LoopingAudioHandle } from './components/loopingAudio';
import './App.css';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [inBattle, setInBattle] = useState(false);
  const [startScene, setStartScene] = useState<1 | 2>(1);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSettings, setDebugSettings] = useState<DebugSettings>({
    coreRadius: 6,
    grazeRadius: 25,
    playerSpeed: 2,
    enemySpeed: 1,
  });
  const [showWdg, setShowWdg] = useState(() => {
    try {
      return localStorage.getItem('wdg_seen') !== '1';
    } catch {
      return true;
    }
  });
  const audioHandleRef = useRef<LoopingAudioHandle | null>(null);

  const resetBattleState = () => {
    setInBattle(false);
    if (audioHandleRef.current) {
      audioHandleRef.current.stop();
      audioHandleRef.current = null;
    }
  };

  const handleStart = (options: { track: TrackOption; scene: 1 | 2 }) => {
    setStartScene(options.scene);
    setInBattle(true);
    setDebugOpen(false);

    if (audioHandleRef.current) {
      audioHandleRef.current.stop();
      audioHandleRef.current = null;
    }

    audioHandleRef.current = createLoopingAudio(options.track.src, {
      volume: 0.6,
      fadeInMs: 700,
      fadeOutMs: 700,
    });
  };

  const handleDebugOpen = () => {
    setDebugEnabled(true);
    setDebugOpen(true);
    resetBattleState();
  };

  const handleDebugClose = () => {
    setDebugOpen(false);
  };

  const handleDebugShowWdg = () => {
    resetBattleState();
    setShowWdg(true);
    setDebugOpen(false);
  };

  const handleWdgRetry = () => {
    try {
      localStorage.setItem('wdg_seen', '1');
    } catch {
      // ignore storage errors
    }
    setShowWdg(false);
  };

  const handleWdgGiveUp = () => {
    try {
      localStorage.setItem('wdg_seen', '1');
    } catch {
      // ignore storage errors
    }
  };

  if (!isReady) {
    return <Loading onReady={() => setIsReady(true)} />;
  }

  if (inBattle) {
    return (
      <BattleEngine
        initialScene={startScene}
        debugEnabled={debugEnabled}
        debugSettings={debugSettings}
      />
    );
  }

  if (debugOpen) {
    return (
      <DebugMenu
        settings={debugSettings}
        onChange={setDebugSettings}
        onClose={handleDebugClose}
        onShowWdg={handleDebugShowWdg}
      />
    );
  }

  if (showWdg) {
    return <Wdg onRetry={handleWdgRetry} onGiveUp={handleWdgGiveUp} />;
  }

  return <MainMenu onStart={handleStart} onDebugOpen={handleDebugOpen} />;
}

export default App;

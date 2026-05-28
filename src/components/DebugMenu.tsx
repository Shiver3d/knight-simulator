import React from 'react';
import type { DebugSettings } from './BattleEngine';

interface DebugMenuProps {
  settings: DebugSettings;
  onChange: (next: DebugSettings) => void;
  onClose: () => void;
  onShowWdg: () => void;
}

const DebugMenu: React.FC<DebugMenuProps> = ({
  settings,
  onChange,
  onClose,
  onShowWdg,
}) => {
  const updateSetting = (key: keyof DebugSettings, value: number) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <h1 style={styles.title}>Debug Menu</h1>

        <div style={styles.group}>
          <label style={styles.label} htmlFor="coreRadius">
            Core Hitbox
          </label>
          <input
            id="coreRadius"
            type="range"
            min={2}
            max={20}
            step={1}
            value={settings.coreRadius}
            onChange={(event) => updateSetting('coreRadius', Number(event.target.value))}
            style={styles.range}
          />
          <div style={styles.value}>{settings.coreRadius.toFixed(0)}</div>
        </div>

        <div style={styles.group}>
          <label style={styles.label} htmlFor="grazeRadius">
            Graze Hitbox
          </label>
          <input
            id="grazeRadius"
            type="range"
            min={10}
            max={60}
            step={1}
            value={settings.grazeRadius}
            onChange={(event) => updateSetting('grazeRadius', Number(event.target.value))}
            style={styles.range}
          />
          <div style={styles.value}>{settings.grazeRadius.toFixed(0)}</div>
        </div>

        <div style={styles.group}>
          <label style={styles.label} htmlFor="playerSpeed">
            Player Speed
          </label>
          <input
            id="playerSpeed"
            type="range"
            min={0.5}
            max={6}
            step={0.1}
            value={settings.playerSpeed}
            onChange={(event) => updateSetting('playerSpeed', Number(event.target.value))}
            style={styles.range}
          />
          <div style={styles.value}>{settings.playerSpeed.toFixed(1)}</div>
        </div>

        <div style={styles.group}>
          <label style={styles.label} htmlFor="enemySpeed">
            Enemy Speed
          </label>
          <input
            id="enemySpeed"
            type="range"
            min={0.25}
            max={3}
            step={0.05}
            value={settings.enemySpeed}
            onChange={(event) => updateSetting('enemySpeed', Number(event.target.value))}
            style={styles.range}
          />
          <div style={styles.value}>{settings.enemySpeed.toFixed(2)}</div>
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.button} onClick={onShowWdg}>
            View WDG Message
          </button>
          <button type="button" style={styles.button} onClick={onClose}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#000',
    color: '#fff',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '24px',
    border: '2px solid #00ff00',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    minWidth: '320px',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  group: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '8px',
    alignItems: 'center',
  },
  label: {
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#9efc6d',
  },
  range: {
    gridColumn: '1 / -1',
    width: '100%',
  },
  value: {
    gridColumn: '1 / -1',
    fontSize: '12px',
    color: '#fff',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  button: {
    backgroundColor: '#00ff00',
    color: '#000',
    border: 'none',
    padding: '10px 12px',
    fontWeight: 700,
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
  },
};

export default DebugMenu;

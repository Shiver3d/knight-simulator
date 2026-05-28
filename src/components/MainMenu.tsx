import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_TRACK_ID, tracks } from './music';
import type { TrackOption } from './music';

interface MainMenuProps {
	onStart: (options: { track: TrackOption; scene: 1 | 2 }) => void;
	onDebugOpen: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onDebugOpen }) => {
	const [selectedTrackId, setSelectedTrackId] = useState(DEFAULT_TRACK_ID);
	const [startScene, setStartScene] = useState<1 | 2>(1);
	const konamiIndexRef = useRef(0);

	const selectedTrack = useMemo(() => {
		return tracks.find((track) => track.id === selectedTrackId) ?? tracks[0];
	}, [selectedTrackId]);

	const handleStart = () => {
		onStart({ track: selectedTrack, scene: startScene });
	};

	useEffect(() => {
		const sequence = [
			'ArrowUp',
			'ArrowUp',
			'ArrowDown',
			'ArrowDown',
			'ArrowLeft',
			'ArrowRight',
			'ArrowLeft',
			'ArrowRight',
			'X',
			'Z',
			'Enter',
		];

		const normalizeKey = (event: KeyboardEvent) => {
			if (event.key.startsWith('Arrow')) return event.key;
			if (event.key === 'Enter') return 'Enter';
			const key = event.key.toUpperCase();
			if (key === 'X' || key === 'Z') return key;
			return null;
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			const key = normalizeKey(event);
			if (!key) return;
			const expected = sequence[konamiIndexRef.current];
			if (key === expected) {
				konamiIndexRef.current += 1;
				if (konamiIndexRef.current >= sequence.length) {
					konamiIndexRef.current = 0;
					onDebugOpen();
				}
			} else {
				konamiIndexRef.current = key === sequence[0] ? 1 : 0;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onDebugOpen]);

	return (
		<div style={styles.container}>
			<div style={styles.panel}>
				<h1 style={styles.title}>Battle Menu</h1>

				<div style={styles.group}>
					<label style={styles.label} htmlFor="track-select">
						Music
					</label>
					<select
						id="track-select"
						value={selectedTrackId}
						onChange={(event) => setSelectedTrackId(event.target.value)}
						style={styles.select}
					>
						{tracks.map((track) => (
							<option key={track.id} value={track.id}>
								{track.name}
							</option>
						))}
					</select>
				</div>

				<div style={styles.group}>
					<label style={styles.label} htmlFor="scene-select">
						Start Scene
					</label>
					<select
						id="scene-select"
						value={startScene}
						onChange={(event) => setStartScene(Number(event.target.value) as 1 | 2)}
						style={styles.select}
					>
						<option value={1}>Scene 1</option>
						<option value={2}>Scene 2</option>
					</select>
				</div>

				<button type="button" onClick={handleStart} style={styles.button}>
					Start Battle
				</button>
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
		minWidth: '280px',
	},
	title: {
		margin: 0,
		fontSize: '24px',
		textTransform: 'uppercase' as const,
		letterSpacing: '1px',
	},
	group: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '6px',
	},
	label: {
		fontSize: '12px',
		textTransform: 'uppercase' as const,
		letterSpacing: '1px',
		color: '#9efc6d',
	},
	select: {
		backgroundColor: '#0b0b0b',
		color: '#fff',
		border: '1px solid #00ff00',
		padding: '6px 8px',
		fontFamily: 'inherit',
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

export default MainMenu;

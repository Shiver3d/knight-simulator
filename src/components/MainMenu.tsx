import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_TRACK_ID, tracks } from './music';
import { playSelectSound } from './sfx';
import { createLoopingAudio } from './loopingAudio';
import soulCursor from '../assets/spriteResources/SOUL1.png';

interface MainMenuProps {
	onStart: (options: { trackId: string; scene: 1 | 2; slotIndex: number }) => void;
	onDebugOpen: () => void;
}

const SLOT_KEYS = ['save_slot_0', 'save_slot_1', 'save_slot_2'];

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onDebugOpen }) => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [selectedTrackId, setSelectedTrackId] = useState(DEFAULT_TRACK_ID);
	const [scene, setScene] = useState<1 | 2>(1);
	const menuMusicRef = useRef<ReturnType<typeof createLoopingAudio> | null>(null);
	const konamiIndexRef = useRef(0);

	const darkness = useMemo(() => tracks.find((track) => track.id === 'darkness-falls'), []);
	const selectableTracks = useMemo(
		() => tracks.filter((track) => track.id !== 'darkness-falls'),
		[]
	);

	useEffect(() => {
		if (darkness?.src) {
			menuMusicRef.current = createLoopingAudio(darkness.src, { volume: 0.45, fadeInMs: 1600, fadeOutMs: 1600 });
		}
		return () => {
			menuMusicRef.current?.stop();
			menuMusicRef.current = null;
		};
	}, [darkness]);

	useEffect(() => {
		const sequence = [
			'B',
			'A',
			'Backspace',
		];

		const normalizeKey = (event: KeyboardEvent) => {
			if (event.key.startsWith('Arrow')) return event.key;
			if (event.key === 'Backspace') return 'Backspace';
			if (event.key === 'Enter') return 'Enter';
			const key = event.key.toUpperCase();
			if (key === 'B' || key === 'A' || key === 'Z') return key;
			return null;
		};

		const handleKey = (event: KeyboardEvent) => {
			const key = normalizeKey(event);
			if (!key) return;

			event.preventDefault();

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

			if (key === 'ArrowUp') {
				playSelectSound();
				setSelectedIndex((value) => Math.max(0, value - 1));
				return;
			}

			if (key === 'ArrowDown') {
				playSelectSound();
				setSelectedIndex((value) => Math.min(4, value + 1));
				return;
			}

			if (key === 'ArrowLeft' && selectedIndex === 3) {
				playSelectSound();
				setSelectedTrackId((current) => {
					const currentIndex = selectableTracks.findIndex((track) => track.id === current);
					const nextIndex = currentIndex <= 0 ? selectableTracks.length - 1 : currentIndex - 1;
					return selectableTracks[nextIndex]?.id ?? current;
				});
				return;
			}

			if (key === 'ArrowRight' && selectedIndex === 3) {
				playSelectSound();
				setSelectedTrackId((current) => {
					const currentIndex = selectableTracks.findIndex((track) => track.id === current);
					const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % selectableTracks.length : 0;
					return selectableTracks[nextIndex]?.id ?? current;
				});
				return;
			}

			if (key === 'ArrowLeft' && selectedIndex === 4) {
				playSelectSound();
				setScene((value) => (value === 1 ? 2 : 1));
				return;
			}

			if (key === 'ArrowRight' && selectedIndex === 4) {
				playSelectSound();
				setScene((value) => (value === 1 ? 2 : 1));
				return;
			}

			if (key === 'Enter' || key === 'Z') {
				playSelectSound();
				if (selectedIndex <= 2) {
					onStart({ trackId: selectedTrackId, scene, slotIndex: selectedIndex });
					return;
				}

				if (selectedIndex === 3 && selectableTracks.length > 0) {
					const currentIndex = selectableTracks.findIndex((track) => track.id === selectedTrackId);
					const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % selectableTracks.length : 0;
					setSelectedTrackId(selectableTracks[nextIndex].id);
					return;
				}

				if (selectedIndex === 4) {
					setScene((value) => (value === 1 ? 2 : 1));
				}
			}
		};

		window.addEventListener('keydown', handleKey);
		return () => window.removeEventListener('keydown', handleKey);
	}, [onDebugOpen, onStart, scene, selectedIndex, selectedTrackId, selectableTracks]);

	const readSlotTime = (index: number) => {
		try {
			const value = localStorage.getItem(SLOT_KEYS[index]);
			return value ?? '[EMPTY]';
		} catch {
			return '[EMPTY]';
		}
	};

	return (
		<div style={styles.container}>
			<div style={styles.topLeft}>TESTING PROGRAM (NOT OFICIAL)</div>

			<div style={styles.centerColumn}>
				<div style={styles.saveBox} data-selected={selectedIndex === 0}>
					<div style={styles.saveHeader}>
						<div style={styles.cursorCell}>{selectedIndex === 0 ? <img src={soulCursor} alt="" style={styles.cursor} /> : null}</div>
						<div style={styles.saveTitle}>KRIS</div>
						<div style={styles.saveTime}>{readSlotTime(0)}</div>
					</div>
					<div style={styles.saveSub}>The Roaring Knight - CH4</div>
				</div>

				<div style={styles.saveBox} data-selected={selectedIndex === 1}>
					<div style={styles.saveHeader}>
						<div style={styles.cursorCell}>{selectedIndex === 1 ? <img src={soulCursor} alt="" style={styles.cursor} /> : null}</div>
						<div style={styles.saveTitle}>[EMPTY]</div>
						<div style={styles.saveTime}>--:--</div>
					</div>
					<div style={styles.saveSub}>---------------</div>
				</div>

				<div style={styles.saveBox} data-selected={selectedIndex === 2}>
					<div style={styles.saveHeader}>
						<div style={styles.cursorCell}>{selectedIndex === 2 ? <img src={soulCursor} alt="" style={styles.cursor} /> : null}</div>
						<div style={styles.saveTitle}>[EMPTY]</div>
						<div style={styles.saveTime}>--:--</div>
					</div>
					<div style={styles.saveSub}>---------------</div>
				</div>

				<div style={styles.optionsRow}>
					<div style={styles.optionBlock} data-selected={selectedIndex === 3}>
						<div style={styles.optionHeader}>
							<div style={styles.optionCursorCell}>{selectedIndex === 3 ? <img src={soulCursor} alt="" style={styles.optionCursor} /> : null}</div>
							<div style={styles.optionText}>MUSIC CHANGE</div>
						</div>
						<div style={styles.optionValue}>{selectedTrackId.replace(/-/g, ' ').toUpperCase()}</div>
					</div>

					<div style={styles.optionBlock} data-selected={selectedIndex === 4}>
						<div style={styles.optionHeader}>
							<div style={styles.optionCursorCell}>{selectedIndex === 4 ? <img src={soulCursor} alt="" style={styles.optionCursor} /> : null}</div>
							<div style={styles.optionText}>SELECT SCENE</div>
						</div>
						<div style={styles.optionValue}>SCENE {scene}</div>
					</div>
				</div>

				<div style={styles.alphaLabel}>ALPHA</div>
			</div>
		</div>
	);
};

const styles = {
	container: {
		position: 'relative' as const,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		height: '100vh',
		backgroundColor: '#000',
		color: '#00ff00',
	},
	topLeft: {
		position: 'absolute' as const,
		left: 20,
		top: 12,
		fontSize: '18px',
		letterSpacing: '0.5px',
	},
	centerColumn: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '18px',
		width: '640px',
		alignItems: 'stretch',
	},
	saveBox: {
		border: '2px solid #00ff00',
		padding: '12px',
		minHeight: '72px',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'center',
		backgroundColor: 'rgba(0,0,0,0.6)',
	},
	saveHeader: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: '12px',
	},
	cursorCell: {
		width: '24px',
		height: '24px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	},
	cursor: {
		width: '20px',
		height: '20px',
		imageRendering: 'pixelated' as const,
	},
	saveTitle: {
		flex: 1,
		color: '#00ff00',
		fontSize: '24px',
		fontWeight: 700,
	},
	saveTime: {
		color: '#00ff00',
		fontSize: '20px',
		marginRight: '40px',
		textAlign: 'center' as const,
	},
	saveSub: {
		color: '#00ff00',
		marginTop: '8px',
		marginLeft: '37px',
	},
	optionsRow: {
		display: 'flex',
		gap: '18px',
	},
	optionBlock: {
		flex: 1,
		border: '2px solid #00ff00',
		padding: '10px 12px',
		minHeight: '88px',
		backgroundColor: 'rgba(0,0,0,0.5)',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'center',
	},
	optionHeader: {
		display: 'flex',
		alignItems: 'center',
		gap: '8px',
	},
	optionCursorCell: {
		width: '24px',
		height: '24px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	},
	optionCursor: {
		width: '20px',
		height: '20px',
		imageRendering: 'pixelated' as const,
	},
	optionText: {
		fontSize: '16px',
	},
	optionValue: {
		marginLeft: '32px',
		marginTop: '6px',
		fontSize: '18px',
	},
	alphaLabel: {
		position: 'absolute' as const,
		right: '20px',
		bottom: '12px',
		fontSize: '12px',
	},
};

export default MainMenu;

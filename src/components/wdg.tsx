import React, { useCallback, useEffect, useMemo, useState } from 'react';
import soulSprite from '../assets/spriteResources/SOUL.png';
import { getTrackById, WDG_TRACK_ID } from './music';
import { createLoopingAudio } from './loopingAudio';

const DIALOG_LINES = [
	'INTERESTING.',
	'VERY\nINTERESTING.',
	'IT SEEMS THAT THE CONECTION HAS \nBEEN MADE IN ANOTHER WAY.',
	'BUT ENOUGH \nTALKING, YOU MAY WANT TO\nGO FOWARD.',
	"IT'S UP TO YOU TO \nMAKE IT, OR GIVE UP.",
	'YOU CAN TRY\nHOWEVER YOU WANT.',
	'THEN, SHALL WE HASTEN?'
];

const GIVE_UP_TEXT = 'Then, the world were covered in darkness...';

interface WdgProps {
	onRetry: () => void;
	onGiveUp: () => void;
}

const Wdg: React.FC<WdgProps> = ({ onRetry, onGiveUp }) => {
	const [lineIndex, setLineIndex] = useState(0);
	const [mode, setMode] = useState<'dialogue' | 'choice' | 'giveup'>('dialogue');
	const [typedText, setTypedText] = useState('');
	const [selectedChoice, setSelectedChoice] = useState<'giveup' | 'retry'>('retry');

	const currentLine = useMemo(() => DIALOG_LINES[lineIndex], [lineIndex]);

	const advance = useCallback(() => {
		if (mode !== 'dialogue') return;
		if (lineIndex < DIALOG_LINES.length - 1) {
			const nextIndex = lineIndex + 1;
			setLineIndex(nextIndex);
			if (nextIndex === DIALOG_LINES.length - 1) {
				setMode('choice');
			}
			return;
		}
		setMode('choice');
	}, [lineIndex, mode]);

	useEffect(() => {
		if (mode !== 'dialogue') return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Enter' || event.key === 'z' || event.key === 'Z') {
				advance();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [advance, mode]);

	useEffect(() => {
		if (mode !== 'giveup') return;
		setTypedText('');
		let index = 0;
		const interval = window.setInterval(() => {
			index += 1;
			setTypedText(GIVE_UP_TEXT.slice(0, index));
			if (index >= GIVE_UP_TEXT.length) {
				window.clearInterval(interval);
			}
		}, 55);
		return () => window.clearInterval(interval);
	}, [mode]);

	useEffect(() => {
		const track = getTrackById(WDG_TRACK_ID);
		if (!track) return undefined;
		const handle = createLoopingAudio(track.src, {
			volume: 0.6,
			fadeInMs: 700,
			fadeOutMs: 700,
		});
		return () => handle.stop();
	}, []);

	const handleGiveUp = () => {
		setMode('giveup');
		onGiveUp();
	};

	useEffect(() => {
		if (mode !== 'choice') return;

		const handleChoiceKeyDown = (event: KeyboardEvent) => {
			if (
				event.key === 'ArrowLeft' ||
				event.key === 'ArrowRight' ||
				event.key === 'ArrowUp' ||
				event.key === 'ArrowDown'
			) {
				event.preventDefault();
				setSelectedChoice((current) => (current === 'giveup' ? 'retry' : 'giveup'));
				return;
			}

			if (event.key === 'Enter' || event.key === 'z' || event.key === 'Z') {
				event.preventDefault();
				if (selectedChoice === 'giveup') {
					handleGiveUp();
					return;
				}
				onRetry();
			}
		};

		window.addEventListener('keydown', handleChoiceKeyDown);
		return () => window.removeEventListener('keydown', handleChoiceKeyDown);
	}, [mode, onRetry, selectedChoice]);

	if (mode === 'giveup') {
		return (
			<div style={styles.giveUpContainer}>
				<p style={styles.giveUpText}>{typedText}</p>
			</div>
		);
	}

	return (
		<div
			style={styles.container}
			onClick={mode === 'dialogue' ? advance : undefined}
			role="presentation"
		>
			<div style={styles.heart} />
			<div style={styles.text}>{currentLine}</div>

			{mode === 'choice' && (
				<div style={styles.choiceRow}>
					<button
						type="button"
						style={{
							...styles.choiceButton,
							color: selectedChoice === 'giveup' ? '#FBFF0D' : '#fff',
						}}
						onMouseEnter={() => setSelectedChoice('giveup')}
						onClick={handleGiveUp}
					>
						GIVE UP
					</button>
					<button
						type="button"
						style={{
							...styles.choiceButton,
							color: selectedChoice === 'retry' ? '#FBFF0D' : '#fff',
						}}
						onMouseEnter={() => setSelectedChoice('retry')}
						onClick={onRetry}
					>
						RETRY
					</button>
				</div>
			)}
		</div>
	);
};

const styles = {
	container: {
		position: 'relative' as const,
		display: 'flex',
		flexDirection: 'column' as const,
		alignItems: 'center',
		justifyContent: 'center',
		gap: '16px',
		height: '100vh',
		backgroundColor: '#000',
		color: '#fff',
		textAlign: 'center' as const,
		letterSpacing: '0.5px',
		cursor: 'pointer',
	},
	heart: {
		width: '16px',
		height: '16px',
		backgroundImage: `url(${soulSprite})`,
		backgroundRepeat: 'no-repeat',
		backgroundPosition: '-3px -17px',
		backgroundSize: '741px 423px',
		imageRendering: 'pixelated' as const,
	},
	text: {
		whiteSpace: 'pre-line' as const,
		fontSize: '36px',
		lineHeight: 1.6,
	},
	choiceRow: {
		display: 'flex',
		gap: '24px',
		marginTop: '24px',
	},
	choiceButton: {
		backgroundColor: 'transparent',
		border: 'none',
		color: '#fff',
		padding: '10px 14px',
		fontSize: '16px',
		letterSpacing: '0.5px',
		cursor: 'pointer',
	},
	giveUpContainer: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		height: '100vh',
		backgroundColor: '#000',
		color: '#fff',
	},
	giveUpText: {
		fontSize: '18px',
		letterSpacing: '0.5px',
	},
};

export default Wdg;

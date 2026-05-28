import React, { useEffect, useState } from 'react';
import battleHud from '../assets/battleHud.png';
import soulSprite from '../assets/spriteResources/SOUL.png';
import trkSprite from '../assets/spriteResources/TRK.png';
import borderBase from '../assets/border/borderBase.png';
import borderEyes from '../assets/border/BorderEyes.png';
import borderRedEyes from '../assets/border/borderRedEyes.png';
import { tracks } from './music';

const BACKGROUND_FRAMES = Object.values(
	import.meta.glob('../assets/background/BBS_*.png', {
		eager: true,
		import: 'default',
	})
) as string[];

interface LoadingProps {
	onReady: () => void;
}

const Loading: React.FC<LoadingProps> = ({ onReady }) => {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		let cancelled = false;
		const imageSources = [
			battleHud,
			soulSprite,
			trkSprite,
			borderBase,
			borderEyes,
			borderRedEyes,
			...BACKGROUND_FRAMES,
		];
		const audioSources = tracks.map((track) => track.src);
		const total = imageSources.length + audioSources.length;
		let loaded = 0;

		const markLoaded = () => {
			loaded += 1;
			if (!cancelled) {
				setProgress(loaded / total);
				if (loaded >= total) {
					onReady();
				}
			}
		};

		const loadImage = (src: string) =>
			new Promise<void>((resolve) => {
				const img = new Image();
				img.src = src;
				img.onload = () => resolve();
				img.onerror = () => resolve();
			});

		const loadAudio = (src: string) =>
			new Promise<void>((resolve) => {
				const audio = new Audio();
				audio.src = src;
				audio.oncanplaythrough = () => resolve();
				audio.onerror = () => resolve();
			});

		const jobs = [
			...imageSources.map((src) => loadImage(src).then(markLoaded)),
			...audioSources.map((src) => loadAudio(src).then(markLoaded)),
		];

		if (jobs.length === 0) {
			onReady();
			return () => {};
		}

		Promise.all(jobs).catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [onReady]);

	return (
		<div style={styles.container}>
			<p style={styles.text}>LOADING {Math.round(progress * 100)}%</p>
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
	text: {
		fontSize: '18px',
		letterSpacing: '2px',
	},
};

export default Loading;

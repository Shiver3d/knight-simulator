import React, { useEffect, useState } from 'react';

const ASSET_FILES = Object.values(
	import.meta.glob('../assets/**/*.{png,jpg,jpeg,webp,gif,mp3,wav,ogg,flac}', {
		eager: true,
		import: 'default',
	})
) as string[];

const FONT_FILES = Object.values(
	import.meta.glob('../fonts/*.{ttf,otf,woff,woff2}', {
		eager: true,
		import: 'default',
	})
) as string[];

const ALL_SOURCES = Array.from(new Set([...ASSET_FILES, ...FONT_FILES]));

const imageExt = /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i;
const audioExt = /\.(mp3|wav|ogg|flac)(\?.*)?$/i;
const fontExt = /\.(ttf|otf|woff2?)(\?.*)?$/i;

const fileNameFromUrl = (src: string) => {
	const noQuery = src.split('?')[0];
	const raw = noQuery.split('/').pop() ?? 'font';
	return raw.replace(/\.[^.]+$/, '');
};

const toFontFamilyName = (src: string) => {
	const base = fileNameFromUrl(src);
	return base.replace(/[^a-zA-Z0-9_-]/g, '') || 'PreloadedFont';
};

const preloadImage = (src: string) =>
	new Promise<void>((resolve) => {
		const img = new Image();
		img.decoding = 'async';
		img.src = src;
		img.onload = () => {
			if (typeof img.decode === 'function') {
				img.decode().catch(() => {}).finally(() => resolve());
				return;
			}
			resolve();
		};
		img.onerror = () => resolve();
	});

const preloadAudio = (src: string) =>
	new Promise<void>((resolve) => {
		const audio = new Audio();
		audio.preload = 'auto';
		audio.src = src;

		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			audio.oncanplaythrough = null;
			audio.onloadeddata = null;
			audio.onerror = null;
			resolve();
		};

		audio.oncanplaythrough = finish;
		audio.onloadeddata = finish;
		audio.onerror = finish;
		audio.load();

		window.setTimeout(finish, 7000);
	});

const preloadFont = (src: string) =>
	new Promise<void>((resolve) => {
		try {
			const familyName = toFontFamilyName(src);
			const font = new FontFace(familyName, `url(${src})`);
			font
				.load()
				.then((loadedFont) => {
					document.fonts.add(loadedFont);
					return document.fonts.load(`16px ${familyName}`);
				})
				.then(() => resolve())
				.catch(() => resolve());
		} catch {
			resolve();
		}
	});

const preloadUnknown = (src: string) =>
	fetch(src, { cache: 'force-cache' }).then(() => undefined).catch(() => undefined);

interface LoadingProps {
	onReady: () => void;
}

const Loading: React.FC<LoadingProps> = ({ onReady }) => {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		let cancelled = false;
		const total = ALL_SOURCES.length;
		let loaded = 0;

		const markLoaded = () => {
			loaded += 1;
			if (!cancelled) {
				setProgress(total === 0 ? 1 : loaded / total);
				if (loaded >= total) {
					onReady();
				}
			}
		};

		const jobs = ALL_SOURCES.map((src) => {
			if (imageExt.test(src)) {
				return preloadImage(src).then(markLoaded);
			}

			if (audioExt.test(src)) {
				return preloadAudio(src).then(markLoaded);
			}

			if (fontExt.test(src)) {
				return preloadFont(src).then(markLoaded);
			}

			return preloadUnknown(src).then(markLoaded);
		});

		if (jobs.length === 0) {
			setProgress(1);
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
		letterSpacing: '0.5px',
		color: '#00ff00',
	},
};

export default Loading;

export interface TrackOption {
	id: string;
	name: string;
	src: string;
}

const toTitle = (value: string) =>
	value
		.toLowerCase()
		.split(/[\s_-]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

const fileNameFromPath = (path: string) => {
	const match = path.match(/\/([^/]+)\.mp3$/i);
	return match ? match[1] : path;
};

const MUSIC_FILES = Object.entries(
	import.meta.glob('../assets/music/*.mp3', {
		eager: true,
		import: 'default',
	})
) as Array<[string, string]>;

export const tracks: TrackOption[] = MUSIC_FILES.map(([path, src]) => {
	const fileName = fileNameFromPath(path);
	const id = fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
	return {
		id,
		name: toTitle(fileName),
		src,
	};
}).sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_TRACK_ID =
	tracks.find((track) => track.id === 'black-knife')?.id ?? tracks[0]?.id ?? '';

export const WDG_TRACK_ID =
	tracks.find((track) => track.id === 'another-him')?.id ?? tracks[0]?.id ?? '';

export const getTrackById = (id: string) =>
	tracks.find((track) => track.id === id) ?? tracks[0];

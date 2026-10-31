let enabled = true;
let context;

function getContext() {
	if (typeof window === 'undefined') return null;
	const AudioContextConstructor = window.AudioContext;
	if (!AudioContextConstructor) return null;
	context ??= new AudioContextConstructor();
	return context;
}

function playTone(frequency, startAt, duration, type = 'square', volume = 0.08) {
	const audio = getContext();
	if (!enabled || !audio) return;
	if (audio.state === 'suspended') {
		audio.resume().catch(() => {});
	}

	const oscillator = audio.createOscillator();
	const gain = audio.createGain();
	oscillator.type = type;
	oscillator.frequency.setValueAtTime(frequency, startAt);
	gain.gain.setValueAtTime(0.0001, startAt);
	gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
	gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
	oscillator.connect(gain);
	gain.connect(audio.destination);
	oscillator.start(startAt);
	oscillator.stop(startAt + duration + 0.01);
}

function playSequence(notes, spacing = 0.09) {
	const audio = getContext();
	if (!enabled || !audio) return;
	const start = audio.currentTime + 0.015;
	notes.forEach(([frequency, duration, type, volume], index) => {
		playTone(frequency, start + index * spacing, duration, type, volume);
	});
}

export function setSfxEnabled(value) {
	enabled = Boolean(value);
}

export function isSfxEnabled() {
	return enabled;
}

export function playCoin() {
	playSequence([[660, 0.07], [990, 0.12]], 0.07);
}

export function playPowerUp() {
	playSequence([[330, 0.12], [440, 0.12], [660, 0.14], [880, 0.2]], 0.11);
}

export function playHit() {
	playSequence([[150, 0.08, 'square', 0.11], [90, 0.12, 'sawtooth', 0.08]], 0.035);
}

export function playVictory() {
	playSequence([
		[523.25, 0.16],
		[659.25, 0.16],
		[783.99, 0.16],
		[1046.5, 0.38],
		[783.99, 0.16],
		[1046.5, 0.42],
	], 0.15);
}

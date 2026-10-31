export function scoreBattle(statsOne, statsTwo) {
	const categories = [
		['Total Contributions', statsOne.total, statsTwo.total],
		['Longest Streak', statsOne.longestStreak, statsTwo.longestStreak],
		['Current Streak', statsOne.currentStreak, statsTwo.currentStreak],
		['Peak Daily Contributions', statsOne.peakCount, statsTwo.peakCount],
		['Consistency', statsOne.consistency, statsTwo.consistency],
	];
	let scoreOne = 0;
	let scoreTwo = 0;

	const rows = categories.map(([label, valueOne, valueTwo]) => {
		if (valueOne > valueTwo) {
			scoreOne++;
			return { label, valueOne, valueTwo, winner: 1, points: '1 — 0' };
		}
		if (valueTwo > valueOne) {
			scoreTwo++;
			return { label, valueOne, valueTwo, winner: 2, points: '0 — 1' };
		}

		scoreOne += 0.5;
		scoreTwo += 0.5;
		return { label, valueOne, valueTwo, winner: 0, points: '½ — ½' };
	});

	return {
		rows,
		scoreOne,
		scoreTwo,
		winner: scoreOne === scoreTwo ? 0 : scoreOne > scoreTwo ? 1 : 2,
	};
}

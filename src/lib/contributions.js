function isIsoDate(value) {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseContributionResponse(data, username) {
	const invalid = () => {
		throw new Error(`Contribution data for "${username}" is incomplete.`);
	};

	if (
		!data ||
		typeof data !== 'object' ||
		typeof data.username !== 'string' ||
		data.username.toLowerCase() !== username.toLowerCase() ||
		!isIsoDate(data.from) ||
		!isIsoDate(data.to) ||
		!Number.isInteger(data.totalContributions) ||
		data.totalContributions < 0 ||
		!Array.isArray(data.weeks) ||
		data.weeks.length !== 52
	) {
		invalid();
	}

	const days = [];
	for (const week of data.weeks) {
		if (!week || !Array.isArray(week.days) || week.days.length !== 7) {
			invalid();
		}

		for (const day of week.days) {
			if (
				!day ||
				!isIsoDate(day.date) ||
				!Number.isInteger(day.count) ||
				day.count < 0 ||
				!Number.isInteger(day.level) ||
				day.level < 0 ||
				day.level > 4
			) {
				invalid();
			}
			days.push(day);
		}
	}

	if (
		days[0].date !== data.from ||
		days.at(-1).date !== data.to ||
		days.reduce((total, day) => total + day.count, 0) !== data.totalContributions
	) {
		invalid();
	}

	for (let index = 1; index < days.length; index++) {
		const previousDate = new Date(`${days[index - 1].date}T00:00:00Z`);
		previousDate.setUTCDate(previousDate.getUTCDate() + 1);
		if (previousDate.toISOString().slice(0, 10) !== days[index].date) {
			invalid();
		}
	}

	return data;
}

export function getContributionDays(player) {
	return player.weeks.flatMap((week) => week.days);
}

export function calculateStats(player, today = new Date().toISOString().slice(0, 10)) {
	const days = getContributionDays(player);
	let longestStreak = 0;
	let streak = 0;
	for (const day of days) {
		streak = day.count > 0 ? streak + 1 : 0;
		longestStreak = Math.max(longestStreak, streak);
	}

	let currentStreak = 0;
	if (days.at(-1)?.date === today) {
		for (let index = days.length - 1; index >= 0 && days[index].count > 0; index--) {
			currentStreak++;
		}
	}

	const peak = days.reduce(
		(best, day) => (day.count > best.count ? day : best),
		days[0],
	);
	const activeDays = days.filter((day) => day.count > 0).length;

	return {
		total: player.totalContributions,
		longestStreak,
		currentStreak,
		peakCount: peak.count,
		peakDate: peak.date,
		consistency: Math.round((activeDays / days.length) * 100),
	};
}

export function assignFighterClass(player, stats) {
	const days = getContributionDays(player);
	const weekendContributions = days.reduce((total, day) => {
		const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
		return total + (weekday === 0 || weekday === 6 ? day.count : 0);
	}, 0);
	const weekendRatio = stats.total > 0 ? weekendContributions / stats.total : 0;

	if (stats.longestStreak > 30) {
		return { name: 'Streak Paladin', badge: '🛡️' };
	}
	if (weekendRatio >= 0.4) {
		return { name: 'Weekend Warrior', badge: '⚔️' };
	}
	if (stats.peakCount >= Math.max(10, Math.ceil(stats.total * 0.2))) {
		return { name: 'Commit Berserker', badge: '🔥' };
	}
	return { name: 'Balanced Mage', badge: '✨' };
}

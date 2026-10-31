import assert from 'node:assert/strict';
import test from 'node:test';
import {
	assignFighterClass,
	calculateStats,
	parseContributionResponse,
} from '../src/lib/contributions.js';

function makePlayer(username, countForDate = () => 0) {
	const from = new Date('2025-11-02T00:00:00Z');
	const days = Array.from({ length: 364 }, (_, index) => {
		const date = new Date(from);
		date.setUTCDate(date.getUTCDate() + index);
		const isoDate = date.toISOString().slice(0, 10);
		const count = countForDate(isoDate);
		return { date: isoDate, count, level: count === 0 ? 0 : 1 };
	});

	return {
		username,
		from: days[0].date,
		to: days.at(-1).date,
		totalContributions: days.reduce((total, day) => total + day.count, 0),
		weeks: Array.from({ length: 52 }, (_, index) => ({
			days: days.slice(index * 7, index * 7 + 7),
		})),
		colors: [],
	};
}

test('parser accepts the API weeks[].days[] response and zero-contribution year', () => {
	const player = parseContributionResponse(makePlayer('octocat'), 'octocat');
	const stats = calculateStats(player, player.to);

	assert.equal(player.weeks.length, 52);
	assert.equal(player.weeks.flatMap((week) => week.days).length, 364);
	assert.deepEqual(stats, {
		total: 0,
		longestStreak: 0,
		currentStreak: 0,
		peakCount: 0,
		peakDate: player.from,
		consistency: 0,
	});
});

test('parser rejects malformed day objects instead of allowing a rendering failure', () => {
	const player = makePlayer('octocat');
	player.weeks[12].days[3] = { date: 'not-a-date', count: 'many', level: 9 };

	assert.throws(
		() => parseContributionResponse(player, 'octocat'),
		/Contribution data for "octocat" is incomplete/,
	);
});

test('longest streak continues across month and year boundaries', () => {
	const player = makePlayer('boundary-user', (date) =>
		date >= '2025-12-30' && date <= '2026-01-02' ? 1 : 0,
	);

	assert.equal(calculateStats(player, player.to).longestStreak, 4);
});

test('fighter classes describe streak, weekend, and peak contribution patterns', () => {
	const streakPlayer = makePlayer('streak-user', (date) =>
		date >= '2026-01-05' && date <= '2026-02-04' ? 1 : 0,
	);
	const weekendPlayer = makePlayer('weekend-user', (date) => {
		const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
		return weekday === 0 || weekday === 6 ? 1 : 0;
	});
	const peakPlayer = makePlayer('peak-user', (date) => date === '2026-01-05' ? 20 : 0);

	assert.equal(assignFighterClass(streakPlayer, calculateStats(streakPlayer)).name, 'Streak Paladin');
	assert.equal(assignFighterClass(weekendPlayer, calculateStats(weekendPlayer)).name, 'Weekend Warrior');
	assert.equal(assignFighterClass(peakPlayer, calculateStats(peakPlayer)).name, 'Commit Berserker');
});

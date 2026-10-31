import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreBattle } from '../src/lib/battle.js';

test('identical player stats tie across every scoring category', () => {
	const stats = {
		total: 120,
		longestStreak: 14,
		currentStreak: 5,
		peakCount: 18,
		consistency: 27,
	};
	const result = scoreBattle(stats, { ...stats });

	assert.equal(result.winner, 0);
	assert.equal(result.scoreOne, 2.5);
	assert.equal(result.scoreTwo, 2.5);
	assert.equal(result.rows.length, 5);
	assert.ok(result.rows.every((row) => row.winner === 0 && row.points === '½ — ½'));
});

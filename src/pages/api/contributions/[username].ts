import type { APIRoute } from 'astro';
import { isValidGitHubUsername } from '../../../lib/github-username.js';

export const prerender = false;

const CACHE_CONTROL = 'public, max-age=300';

interface UpstreamContributionDay {
	weekday: number;
	count: number;
	level?: unknown;
}

interface UpstreamContributionWeek {
	first_day: string;
	contribution_days: UpstreamContributionDay[];
}

interface UpstreamContributions {
	from: string;
	to: string;
	total_contributions?: number;
	colors_full?: string[];
	weeks: UpstreamContributionWeek[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isContributionDay(value: unknown): value is UpstreamContributionDay {
	return (
		isRecord(value) &&
		typeof value.weekday === 'number' &&
		Number.isInteger(value.weekday) &&
		value.weekday >= 0 &&
		value.weekday <= 6 &&
		typeof value.count === 'number' &&
		Number.isInteger(value.count) &&
		value.count >= 0
	);
}

function isUpstreamContributions(value: unknown): value is UpstreamContributions {
	return (
		isRecord(value) &&
		isIsoDate(value.from) &&
		isIsoDate(value.to) &&
		(value.total_contributions === undefined ||
			(typeof value.total_contributions === 'number' &&
				Number.isInteger(value.total_contributions) &&
				value.total_contributions >= 0)) &&
		(value.colors_full === undefined ||
			(Array.isArray(value.colors_full) &&
				value.colors_full.every((color) => typeof color === 'string'))) &&
		Array.isArray(value.weeks) &&
		value.weeks.every(
			(week) =>
				isRecord(week) &&
				isIsoDate(week.first_day) &&
				Array.isArray(week.contribution_days) &&
				week.contribution_days.every(isContributionDay),
		)
	);
}

function intensityForCount(count: number): number {
	if (count === 0) return 0;
	if (count < 3) return 1;
	if (count < 6) return 2;
	if (count < 10) return 3;
	return 4;
}

function contributionLevel(level: unknown, count: number): number {
	return typeof level === 'number' && Number.isInteger(level) && level >= 0 && level <= 4
		? level
		: intensityForCount(count);
}

function createJsonResponse(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': CACHE_CONTROL,
		},
	});
}

export const GET: APIRoute = async ({ params }) => {
	const username = params.username;
	if (!isValidGitHubUsername(username)) {
		return createJsonResponse({ error: 'Invalid GitHub username' }, 400);
	}

	let upstreamResponse: Response;
	try {
		upstreamResponse = await fetch(`https://github.com/${encodeURIComponent(username)}.contribs`);
	} catch {
		return createJsonResponse({ error: 'Unable to reach GitHub contributions service' }, 502);
	}

	if (upstreamResponse.status === 404) {
		return createJsonResponse({ error: 'GitHub user not found' }, 404);
	}
	if (!upstreamResponse.ok) {
		return createJsonResponse({ error: 'GitHub contributions service failed' }, 502);
	}

	let payload: unknown;
	try {
		payload = await upstreamResponse.json();
	} catch {
		return createJsonResponse({ error: 'Invalid response from GitHub contributions service' }, 502);
	}

	if (!isUpstreamContributions(payload)) {
		return createJsonResponse({ error: 'Invalid response from GitHub contributions service' }, 502);
	}

	try {
		const from = new Date(`${payload.from}T00:00:00Z`);
		const to = new Date(`${payload.to}T00:00:00Z`);
		const allContributions = payload.weeks.flatMap((week) =>
			week.contribution_days.flatMap((day) => {
				const date = new Date(`${week.first_day}T00:00:00Z`);
				date.setUTCDate(date.getUTCDate() + day.weekday);
				const dateString = date.toISOString().slice(0, 10);
				if (dateString < payload.from || dateString > payload.to) return [];

				return [{
					date: dateString,
					count: day.count,
					level: contributionLevel(day.level, day.count),
				}];
			}),
		);

		if (from > to || allContributions.length < 364) {
			return createJsonResponse({ error: 'Invalid response from GitHub contributions service' }, 502);
		}

		const contributions = allContributions
			.sort((left, right) => left.date.localeCompare(right.date))
			.slice(-364);
		const weeks = Array.from({ length: 52 }, (_, index) => ({
			days: contributions.slice(index * 7, index * 7 + 7),
		}));
		const firstDate = contributions[0].date;
		const lastDate = contributions[contributions.length - 1].date;

		return createJsonResponse({
			username,
			from: firstDate,
			to: lastDate,
			totalContributions: contributions.reduce((total, day) => total + day.count, 0),
			weeks,
			colors: payload.colors_full ?? [],
		}, 200);
	} catch {
		return createJsonResponse({ error: 'Unable to process GitHub contributions' }, 500);
	}
};

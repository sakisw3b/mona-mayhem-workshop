import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../src/pages/api/contributions/[username].ts';

test('API route rejects invalid GitHub usernames before making an upstream request', async () => {
	for (const username of ['', '../octocat', 'octocat/repo', '-octocat', 'octocat--dev', 'a'.repeat(40)]) {
		const response = await GET({ params: { username } });
		assert.equal(response.status, 400, `Expected ${JSON.stringify(username)} to be rejected`);
		assert.deepEqual(await response.json(), { error: 'Invalid GitHub username' });
	}
});

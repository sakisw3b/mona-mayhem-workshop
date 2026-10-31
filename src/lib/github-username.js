const GITHUB_USERNAME_PATTERN = /^[A-Za-z0-9](?:-?[A-Za-z0-9])*$/;

export function isValidGitHubUsername(username) {
	return (
		typeof username === 'string' &&
		username.length > 0 &&
		username.length <= 39 &&
		GITHUB_USERNAME_PATTERN.test(username)
	);
}

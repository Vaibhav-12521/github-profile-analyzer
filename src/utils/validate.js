// GitHub usernames: 1-39 chars, alphanumeric or single hyphens, no
// leading/trailing hyphen.
const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/

export function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_RE.test(username)
}

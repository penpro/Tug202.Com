// Tiny field helpers shared by the form routes. Keeps each route's
// validation to a handful of readable lines instead of pulling in a schema
// library for four endpoints.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v, max) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}

function email(v) {
  const s = str(v, 254).toLowerCase();
  return EMAIL_RE.test(s) ? s : null;
}

// The forms include a hidden "website" field. Humans never see it; bots
// autofill everything. Anything non-empty means drop the request silently
// (still return 200 so the bot learns nothing).
function isHoneypotTripped(body) {
  return typeof body.website === 'string' && body.website.trim() !== '';
}

module.exports = { str, email, isHoneypotTripped };

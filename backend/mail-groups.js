// The kinds of mail we send. One list, used by the signup form, blast
// targeting, and the preference centre — so "what people opted into" and
// "what we can send" can never drift apart.
const GROUPS = [
  { key: 'newsletter', label: "Ship's newsletter", hint: 'Restoration progress and Foundation news — a few emails a year' },
  { key: 'volunteer', label: 'Volunteer work-day calls', hint: 'When we need hands aboard: work parties, transits, event crew' },
  { key: 'events', label: 'Open-ship days & cruises', hint: 'Where Comanche is, when you can come aboard, partner events' },
  { key: 'reunions', label: 'Former crew & reunions', hint: 'For Navy and Coast Guard veterans of the ship and their families' }
];

const KEYS = GROUPS.map(g => g.key);
const isGroup = (k) => KEYS.includes(k);
const labelOf = (k) => (GROUPS.find(g => g.key === k) || {}).label || k;

module.exports = { GROUPS, KEYS, isGroup, labelOf };

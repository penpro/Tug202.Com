# The boarding waiver — what it does, and what to ask a lawyer

The text lives in **`backend/waiver-text.js`** as one canonical string. The
website form, the tablet at the brow and the admin copy all render that same
string, and every signature stores a SHA-256 of it. That hash is the point: in
two years we can prove exactly which words a person agreed to, even after the
wording has changed. Bump `VERSION` whenever a word changes — old signatures
keep their old hash and stay provable.

**This is not legal advice.** It is a careful draft modelled on the
Foundation's paper release plus ordinary Washington practice. Before it carries
real weight, have a Washington attorney with admiralty experience read it.
Three things to put in front of them:

### 1. Minors (the big one)
Washington does **not** enforce a parent's pre-injury release of their child's
own claims — *Scott v. Pacific West Mountain Resort*, 119 Wn.2d 484 (1992).
A parent can release their *own* claims and can agree to indemnify, which is how
the guardian clause is written here. Do not assume a signed form protects the
Foundation from a claim brought on a child's behalf. The practical protections
for minors aboard are supervision, life jackets and insurance — not paperwork.

### 2. Passengers vs. guests (46 U.S.C. § 30527)
Federal law bars the owner of a vessel **transporting passengers** from
contracting away liability for its own negligence. That is why the agreement
states plainly that Comanche is not a charter vessel, carries no passengers for
hire, and that donations are voluntary and buy nothing. Keep that true in
practice as well as on paper: the moment money is tied to a berth, this release
is in much weaker territory. Ask counsel where the line sits for partner-cruise
arrangements where the *partner* charges its own attendees.

### 3. Enforceability generally
Washington enforces a release of ordinary negligence when it is conspicuous and
unambiguous and does not offend the public interest (*Chauvlier v. Booth Creek
Ski Holdings*, 109 Wn. App. 334). The form is built for that: the release
paragraphs are in capitals, the "I have read it" box will not tick until the
reader has scrolled to the end, and the signing page records IP, user agent and
timestamp. Gross negligence and intentional misconduct are never releasable and
the text says so.

## Also worth doing
- **Insurance beats paperwork.** Confirm the hull and P&I policy actually covers
  guests and volunteers aboard, and at what limits. A waiver is the second line
  of defence.
- **Keep the paper option.** Someone without a phone still has to be able to
  come aboard. `method='paper'` exists in the `waivers` table for hand-entering
  those.
- **Annual expiry** is set to the end of the calendar year (`expires_on`).
  Counsel may prefer per-voyage signing for cruises.
- **Records.** Signatures, IPs and emergency contacts are personal data. They
  stay in MySQL on the server and are never committed to the repo.

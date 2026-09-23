// The liability waiver, as one canonical text.
//
// Everything signs the SAME string — the website form, the tablet kiosk and
// the PDF copy — and we store a SHA-256 of it with each signature. That hash
// is what makes an electronic signature defensible: years later we can prove
// exactly which words a person agreed to, even after the wording changes.
// Bump VERSION whenever a word changes; old signatures keep their old hash.
//
// NOT LEGAL ADVICE. This is a careful draft modelled on the Foundation's paper
// release and ordinary Washington practice. Have a Washington attorney with
// admiralty experience read it before it carries real weight. Two points to
// raise with them, flagged in ops/waiver-notes.md:
//   1. Washington courts do not enforce a parent's pre-injury release of a
//      minor's own claims (Scott v. Pacific West Mountain Resort). The
//      guardian clause here is written as an indemnity, which survives.
//   2. 46 U.S.C. § 30527 bars an owner of a vessel "transporting passengers"
//      from contracting away liability for its own negligence. Comanche
//      carries guests and volunteers, never passengers for hire — that
//      distinction is what keeps this release available, and it is why the
//      "no consideration" paragraph matters.

const crypto = require('crypto');

const VERSION = '2026.1';

const ORG = 'Tug Comanche Historical Rescue Foundation';
const VESSEL = 'the motor vessel COMANCHE (ex-USS WAMPANOAG ATA-202, ex-USCGC COMANCHE WMEC-202), her owners, officers and crew';

// Section by section, so the form can render it with headings and the PDF can
// reuse it verbatim.
const SECTIONS = [
  {
    h: 'Who this agreement is between',
    p: [
      `This agreement is between me, the person signing below, and ${ORG}, a Washington nonprofit corporation, together with ${VESSEL}, and its directors, officers, members, volunteers, employees and agents (together, "the Foundation").`,
      'I am signing it because I wish to come aboard, go alongside, work on, or travel aboard Comanche, or to take part in a Foundation activity on or near the water.'
    ]
  },
  {
    h: 'I am a guest or volunteer, not a paying passenger',
    p: [
      'I understand that Comanche is a historic vessel preserved and operated by volunteers, that she is not a charter vessel, and that she does not carry passengers for hire. I am not paying, and have not been asked to pay, any fare or other consideration for coming aboard.',
      'Any donation I choose to make is entirely voluntary, is not a condition of coming aboard, and buys me nothing.'
    ]
  },
  {
    h: 'What I am taking on',
    p: [
      'I understand that being aboard a working vessel built in 1943 is inherently dangerous, and that no amount of care can remove that danger. The risks include, and are not limited to:',
      '— moving decks, steep and slippery ladders, low overheads, raised coamings, open hatches, and trip and fall hazards throughout the vessel;',
      '— machinery, engines, generators, winches, towing gear, anchors, chain, wire and line under tension, and tools;',
      '— heat, noise, fumes, fuel, electricity, confined spaces and hot surfaces;',
      '— fire, flooding, collision, grounding, allision, capsizing, sinking and abandoning ship;',
      '— falling overboard, cold water, drowning, hypothermia, sun, wind, weather and sea state;',
      '— delay, breakdown, being carried to an unintended place, and being unable to reach medical care quickly while under way;',
      '— the acts, omissions or negligence of the Foundation, its crew, its volunteers, other guests, or other vessels;',
      '— and injury, illness, permanent disability and death arising from any of these.',
      'I accept and assume all of these risks, both the ones written here and the ones that are not, whether they are obvious to me or not.'
    ]
  },
  {
    h: 'Release and covenant not to sue',
    p: [
      'IN EXCHANGE FOR BEING ALLOWED ABOARD, I RELEASE, WAIVE AND DISCHARGE THE FOUNDATION FROM ALL CLAIMS, DEMANDS, ACTIONS, DAMAGES, COSTS AND EXPENSES OF ANY KIND — INCLUDING CLAIMS ARISING FROM THE FOUNDATION’S OWN ORDINARY NEGLIGENCE — FOR ANY INJURY, ILLNESS, DEATH, OR LOSS OF OR DAMAGE TO PROPERTY THAT I SUFFER IN CONNECTION WITH COMANCHE OR ANY FOUNDATION ACTIVITY.',
      'I AGREE NOT TO SUE THE FOUNDATION FOR ANY OF THOSE CLAIMS, AND I GIVE UP ANY RIGHT I HAVE TO DO SO. I UNDERSTAND THIS IS A COMPLETE RELEASE OF LIABILITY AND THAT I AM GIVING UP SUBSTANTIAL LEGAL RIGHTS BY SIGNING IT.',
      'This release does not apply to gross negligence, to reckless or intentional misconduct, or to anything that Washington law or federal maritime law does not permit to be released. If any part of it cannot be enforced, the rest still stands.'
    ]
  },
  {
    h: 'If I bring someone under 18',
    p: [
      'If I am signing as the parent or legal guardian of a person under 18, I am signing for myself and on their behalf. I confirm I have legal authority to do so, and I have named each of them on this form.',
      'I will keep each minor in my care under my direct supervision at all times aboard, and I accept full responsibility for their conduct and their safety.',
      'I understand that Washington law may not allow me to release a minor’s own claims. To the fullest extent the law allows, I agree to indemnify and hold the Foundation harmless from any claim brought by or on behalf of a minor in my care, including the Foundation’s reasonable attorney fees and costs.'
    ]
  },
  {
    h: 'Indemnity',
    p: [
      'I agree to indemnify, defend and hold the Foundation harmless from any claim brought by me, by anyone in my care, or by anyone claiming through me, arising out of my presence aboard or my participation — including the Foundation’s reasonable attorney fees, costs and expenses of defending it.'
    ]
  },
  {
    h: 'Following orders aboard',
    p: [
      'I will obey the instructions of the master and crew immediately and without argument, including any instruction to wear a life jacket or other protective equipment, to leave an area, or to go ashore.',
      'I will not come aboard under the influence of alcohol or drugs, and I will not bring either aboard. I will not smoke except where I am told I may.',
      'I confirm that I am physically and medically able to be aboard, and that I have told the Foundation about any condition that could affect my safety or the safety of others. I understand that Comanche is a historic vessel, is not accessible, and cannot accommodate every limitation.',
      'The Foundation may ask me to leave the vessel at any time, for any reason, and I will go.'
    ]
  },
  {
    h: 'Medical care',
    p: [
      'If I am injured or become ill, I authorize the Foundation to arrange whatever first aid, medical treatment or evacuation it judges necessary, and I accept that it may be delayed or impossible while under way.',
      'I am responsible for the cost of any medical care, ambulance, evacuation or rescue provided to me. I understand the Foundation carries no medical or accident insurance for me and that I should rely on my own.'
    ]
  },
  {
    h: 'Photographs and video',
    p: [
      'Unless I have said otherwise on this form, I give the Foundation permission to photograph and record me aboard, and to use those images without payment to document the ship and its work, including on its website, in print, and on social media.'
    ]
  },
  {
    h: 'The law that applies',
    p: [
      'This agreement is governed by the general maritime law of the United States and, where that law does not apply, by the laws of the State of Washington, without regard to conflict-of-law rules. Any dispute will be brought only in a court sitting in the State of Washington.',
      'This is the entire agreement between me and the Foundation about these matters. It binds my heirs, executors, administrators and anyone else who might claim through me.'
    ]
  },
  {
    h: 'Signing electronically',
    p: [
      'I agree that signing this form on a screen, by drawing my signature or typing my name, has the same effect as signing it on paper, under the Washington Uniform Electronic Transactions Act (RCW 19.360) and the federal E-SIGN Act. I may ask the Foundation for a paper copy at any time.',
      'I HAVE READ THIS ENTIRE AGREEMENT. I UNDERSTAND IT. I AM SIGNING IT FREELY, AND NOT IN RELIANCE ON ANYTHING SAID TO ME THAT IS NOT WRITTEN HERE.'
    ]
  }
];

const TITLE = 'Release of liability, waiver of claims, assumption of risk and indemnity agreement';

// The exact string that gets signed and hashed.
const fullText = () =>
  [`${ORG}`, TITLE, `Version ${VERSION}`, '']
    .concat(SECTIONS.flatMap(s => [s.h.toUpperCase(), ...s.p, '']))
    .join('\n');

const sha = () => crypto.createHash('sha256').update(fullText(), 'utf8').digest('hex');

module.exports = { VERSION, TITLE, ORG, SECTIONS, fullText, sha };

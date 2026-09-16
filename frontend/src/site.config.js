// ---------------------------------------------------------------------------
// Site-wide facts and settings. ONE place to change contact details, links
// and "not yet confirmed" items before launch.
//
// Anything marked TODO is a placeholder the board needs to confirm. Search
// this file for "TODO" before cutting over the domain.
// ---------------------------------------------------------------------------

export const org = {
  name: 'Tug Comanche Historical Rescue Foundation',
  shortName: 'Tug Comanche Foundation',
  ein: '39-5018917',
  // IRS Publication 78 lists the Foundation as eligible to receive
  // tax-deductible charitable contributions (deductibility code PC).
  taxStatus: '501(c)(3) public charity',
  city: 'Auburn, Washington',
  // TODO: confirm the public mailing address the board wants published.
  mailingAddress: null,
  // TODO: confirm the public contact email once the tug202.com mailbox exists.
  email: 'info@tug202.com',
  // TODO: confirm whether the 1-888 line from the 2025 press release is still active.
  phone: null,
  facebook: 'https://www.facebook.com/tugcomanche', // TODO: confirm exact page URL
  domain: 'tug202.com'
}

export const vessel = {
  name: 'Comanche',
  designations: ['ATA-202', 'USS Wampanoag (ATA-202)', 'USCGC Comanche (WMEC-202)'],
  yearBuilt: 1944,
  // From the current USCG Certificate of Documentation (issued 2025-08-27).
  officialNumber: '647250',
  imo: '8991786',
  hull: 'Steel',
  registeredLengthFt: 133.4,
  breadthFt: 33.1,
  depthFt: 17.7,
  grossTonsITC: 295,
  hailingPort: 'Seattle, Washington',
  // Secondary-source dates; primary Navy/Coast Guard records still to be pulled.
  launched: 'October 10, 1944',
  commissioned: 'December 18, 1944',
  renamedWampanoag: 'July 16, 1948'
}

// Rule-of-thumb operating costs used throughout the site to set expectations.
// Board-supplied figures; update here and every page that quotes them follows.
// These are BARE operating costs (fuel, moorage, consumables) — they do not
// include maintenance reserve, haul-out, insurance, or anything for the
// Foundation itself. Copy that quotes them should say so.
export const costs = {
  perMile: 100,     // USD per nautical mile underway (fuel, engine hours, crew, wear)
  perPierDay: 250   // USD per day alongside a pier (moorage, utilities, crew, supplies)
}

// Givebutter. Both values come from the Givebutter dashboard:
//   accountId - Settings > Developers > Widgets (looks like "GQ0CYPreD923uMBv")
//   campaign  - the campaign code = the slug in https://givebutter.com/<campaign>
//               (Campaign > Sharing > Widgets shows it inside every snippet)
// TODO: fill these in. Until both are set, the Support page shows the
// check-by-mail / "contact us" fallback and the Donate button goes to /support.
export const givebutter = {
  accountId: null,
  campaign: null
}

export const donate = {
  // Public campaign page, derived from the campaign code above. Used as the
  // no-JS fallback link under the embed.
  get onlineUrl() { return givebutter.campaign ? `https://givebutter.com/${givebutter.campaign}` : null },
  checkPayableTo: 'Tug Comanche Historical Rescue Foundation'
}

// Navigation order for the header and footer.
export const nav = [
  { to: '/', label: 'Home' },
  { to: '/ship', label: 'The Ship' },
  { to: '/foundation', label: 'Foundation' },
  { to: '/visit', label: 'Visit' },
  { to: '/partner', label: 'Partner' },
  { to: '/volunteer', label: 'Volunteer' },
  { to: '/news', label: 'News' },
  { to: '/support', label: 'Support' },
  { to: '/contact', label: 'Contact' }
]

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
  // TODO: confirm the public contact email once the tug202.org mailbox exists.
  email: 'info@tug202.org',
  // TODO: confirm whether the 1-888 line from the 2025 press release is still active.
  phone: null,
  facebook: 'https://www.facebook.com/tugcomanche', // TODO: confirm exact page URL
  domain: 'tug202.org'
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
//   campaign  - the campaign code = the slug in https://givebutter.com/<campaign>
//   accountId - Settings > Integrations > Widgets section (looks like "GQ0CYPreD923uMBv").
//               REQUIRED for the inline giving form (the library logs
//               "Account attribute is required" without it). Until it is set,
//               the Support page links out to the campaign page instead.
export const givebutter = {
  // From Settings > Developers > Widgets > the small "Installation" script at
  // the top (the value after ?acct=). Nothing renders inline without it.
  accountId: 'uckBhaa1GKtq6Jyt',
  campaign: 'support-ata-202-comanche-x0xpns',
  // Dashboard-created widgets (Campaign > Sharing > Widgets). Rendered with
  // <givebutter-widget id="..."> once accountId is set.
  widgets: {
    donateButton: 'gOKK8D',   // "Donate" button that opens checkout in a modal
    givingForm: 'Lqbb3J'      // one-time / monthly giving form
  }
}

// Printable / shareable donation assets, served from /donate/. Regenerate with
// `node scripts/build-print-assets.cjs` after editing print/*.html.
export const donateAssets = [
  { file: 'tug-comanche-donate-flyer-letter.pdf', preview: 'tug-comanche-donate-flyer-letter.png', title: 'Letter flyer (8.5 × 11)', text: 'Full-page flyer with the ship, why it matters, cost figures and the QR code. Print on plain paper for tables, bulletin boards and open-ship days.' },
  { file: 'tug-comanche-donate-card-4x6.pdf', preview: 'tug-comanche-donate-card-4x6.png', title: 'Table card (4 × 6)', text: 'Postcard-size. Prints two-up on letter or on 4×6 card stock for galley tables, the brow and event booths.' },
  { file: 'tug-comanche-donate-qr.png', preview: 'tug-comanche-donate-qr.png', title: 'QR code (PNG, 1200 px)', text: 'Just the code, for slides, social posts, signage and newsletters. SVG also available below.' }
]

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

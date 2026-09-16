// ---------------------------------------------------------------------------
// Editorial content that is more than a one-liner. Facts here come from the
// Foundation's working documents (cheat sheet, grant toolkit, USCG COD).
// Items flagged `verify: true` rest on secondary sources and should be
// checked against DANFS / Coast Guard histories before anyone quotes them
// as settled. They are still fine to publish as "reported".
// ---------------------------------------------------------------------------

export const mission =
  'Tug Comanche Historical Rescue Foundation preserves the historic vessel Comanche and uses ' +
  'her as a platform for maritime heritage, hands-on education, youth mentorship, restoration ' +
  'skills, veteran and mariner storytelling, and community stewardship.'

export const timeline = [
  {
    year: '1944',
    title: 'Laid down and launched on the Texas Gulf Coast',
    text: 'Built as a Sotoyomo-class auxiliary ocean tug for the U.S. Navy. Launched October 10, 1944 and commissioned December 18, 1944 as ATA-202.',
    verify: true
  },
  {
    year: '1948',
    title: 'Named USS Wampanoag',
    text: 'On July 16, 1948 the Navy gave the unnamed ATA-202 the name Wampanoag, after the Native nation of southeastern New England.',
    verify: true
  },
  {
    year: '1959',
    title: 'Transferred to the U.S. Coast Guard',
    text: 'Recommissioned as the Coast Guard cutter Comanche (WMEC-202), a medium-endurance cutter used for search and rescue, law enforcement and towing on the West Coast.',
    verify: true
  },
  {
    year: '1980',
    title: 'Decommissioned',
    text: 'After some twenty years of multi-mission Coast Guard work — including fisheries enforcement in Pacific waters — Comanche was retired and passed into private hands.',
    verify: true
  },
  {
    year: '2000s',
    title: 'Museum ship and volunteer project in Tacoma',
    text: 'Restored and operated by volunteers out of Tyee Marina, Tacoma, Comanche became a member of the Historic Naval Ships Association — one of a handful of HNSA vessels still able to get underway — hosting crew reunions, Olympia Harbor Days and thousands of visitors.'
  },
  {
    year: '2021',
    title: 'The ATA 202 Foundation era',
    text: 'On December 7, 2021 the ATA 202 Foundation was launched aboard the ship, succeeding the earlier volunteer group and carrying the restoration forward for the next several years.'
  },
  {
    year: '2025',
    title: 'Tug Comanche Historical Rescue Foundation founded',
    text: 'In 2025 a completely new nonprofit — the Tug Comanche Historical Rescue Foundation — was formed with a fresh volunteer board to take on the rescue of the ship. That same year the U.S. Coast Guard renewed Comanche’s Certificate of Documentation (Official Number 647250) through 2030.'
  }
]

export const board = [
  { role: 'President', name: 'John Hansen' },
  { role: 'Vice President', name: 'Mac McCune' },
  { role: 'Treasurer', name: 'Jon Salzman' },
  { role: 'Secretary', name: 'Wesley Weaver' },
  { role: 'Director of Operations', name: 'Dale Bookwalter' },
  { role: 'Director at Large', name: 'Andy Hough' }
]

export const programs = [
  {
    title: 'Maritime heritage',
    text: 'Ship tours, partner cruises, a vessel timeline, artifacts and interpretive panels that put WWII and Coast Guard history within arm’s reach.',
    image: 'historic-coast-guard'
  },
  {
    title: 'Youth mentorship',
    text: 'Crew roles, responsibility, service projects and trades exposure aboard a real ship, guided by experienced mariners and volunteers.',
    image: 'deck-crew'
  },
  {
    title: 'Preservation & restoration',
    text: 'Condition assessment, documentation, stabilization and phased restoration — with hands-on skills passed from mentors to volunteers.',
    image: 'overhead-raft'
  },
  {
    title: 'Community & stewardship',
    text: 'Veteran and mariner storytelling, tribal partnership programming by invitation, and Puget Sound water stewardship.',
    image: 'port-townsend-raftup'
  }
]

export const volunteerRoles = [
  { title: 'Deck & maintenance', text: 'Chipping, priming, painting, rigging, line handling and general ship’s work. No experience needed — we teach.' },
  { title: 'Engineering', text: 'Diesel, electrical, plumbing, generator and battery/solar work under the Director of Operations.' },
  { title: 'History & interpretation', text: 'Research, archives, oral histories, tour scripts and interpretive panels.' },
  { title: 'Events & hospitality', text: 'Open-ship days, galley, visitor greeting and community events.' },
  { title: 'Photography & media', text: 'Documenting the work, drone and video, social media and newsletter.' },
  { title: 'Admin, grants & fundraising', text: 'Grant writing, donor records, bookkeeping support and board committees.' }
]

export const wishlist = [
  'Marine-grade paint, primer, brushes and rollers',
  'Hand and power tools (grinders, needle scalers, drills)',
  'LED lighting, house batteries, solar panels and charge controllers',
  'Mobile internet gateway, PoE switch and security cameras',
  'Galley supplies and safety gear (PFDs, first-aid, fire extinguishers)',
  'Professional services: marine surveyors, welders, electricians, riggers',
  'Moorage, haul-out and yard sponsorship'
]

// Seed news shown until the backend /api/news is live. Keep newest first.
export const seedNews = [
  {
    id: 'labor-day-2025',
    date: '2025-09-01',
    title: 'Comanche joins the Labor Day raft-up',
    body: 'Comanche got underway with her volunteer crew for a Labor Day weekend gathering of historic vessels on Puget Sound, rafting alongside friends and welcoming visitors on deck. Drone footage from the day now anchors this website.'
  },
  {
    id: 'cod-renewed-2025',
    date: '2025-08-27',
    title: 'Certificate of Documentation renewed through 2030',
    body: 'The U.S. Coast Guard issued a renewed Certificate of Documentation for Comanche (Official Number 647250), valid through August 31, 2030.'
  },
  {
    id: 'liberty-bay-2025',
    date: '2025-05-01',
    title: 'Liberty Bay sewage spill delays departure',
    body: 'A 15,000-gallon sewage spill in Liberty Bay forced the all-volunteer crew to delay a planned departure from Poulsbo, as handling the anchor chain would have meant direct contact with contaminated water. The Foundation met with the community at Oyster Plant Park to discuss the health of shared waters.'
  }
]

// ---------------------------------------------------------------------------
// Funding proposals ("asks"). One source of truth: the /grants pages render
// these, and scripts/build-print-assets.cjs renders the same data to PDF.
//
// Budget philosophy (board direction, Sept 2026): figures are deliberately
// conservative-high. Every proposal carries explicit contingency and
// project-management lines so a funded project can be delivered in full
// with margin — under-promise, over-deliver. Line items are order-of-
// magnitude estimates for a 133.4 ft / 295 GT / 200 NT steel vessel on Puget Sound and
// must be replaced with vendor quotes before any submission.
// ---------------------------------------------------------------------------

export const boilerplate = {
  organization:
    'Tug Comanche Historical Rescue Foundation (EIN 39-5018917) is a Washington nonprofit based in Auburn, Washington, listed on the IRS Publication 78 data list as eligible to receive tax-deductible charitable contributions (deductibility code PC). The Foundation preserves the historic vessel Comanche — laid down in 1944 as the U.S. Navy ocean tug ATA-202, later USS Wampanoag and Coast Guard cutter WMEC-202 — and operates her as a living platform for maritime heritage, hands-on education, youth mentorship, restoration-skills exposure, veteran and mariner storytelling, Puget Sound stewardship, and community service. Comanche is one of the last operational WWII museum ships in the world, still moving under her own power with an all-volunteer crew. The organization is governed by a volunteer board of directors and delivers its programs through volunteers, maritime-trades mentors and community partners.',
  vessel:
    'Comanche is a rare surviving example of a WWII-era U.S. Navy auxiliary ocean tug. Completed in 1944 and commissioned as ATA-202, she was named USS Wampanoag in 1948 and later served as the U.S. Coast Guard cutter WMEC-202 before becoming known as Comanche. Her current U.S. Coast Guard Certificate of Documentation (Official Number 647250; IMO 8991786) records a steel-hulled, mechanically propelled vessel of 133.4 feet registered length, 33.1-foot breadth, 17.7-foot depth, 295 gross tons and 200 net tons (ITC), hailing port Seattle, Washington. She is propelled by two Cleveland Diesel 12-cylinder diesel-electric main engines driving a single screw, and holds a world record as the last ship still steered by deck-tube chain rudder control.',
  boundary:
    'Comanche does not hold a U.S. Coast Guard Certificate of Inspection for commercial passenger service. No grant funds, fees or donations are or will be used for paid carriage, charters, towing, freight or any underway commercial service. Public programs take place alongside the pier; cruises occur only in partnership with other nonprofit and community organizations, never as a charter, and the Foundation retains control of the vessel at all times.',
  contact: 'Wesley Weaver, Secretary — info@tug202.org — tug202.org'
}

// Helper: build a budget with computed subtotal / contingency / total.
function budget(lines, { contingencyPct, pmPct = 0 }) {
  const direct = lines.reduce((s, l) => s + l.amount, 0)
  const pm = Math.round(direct * pmPct / 100)
  const contingency = Math.round((direct + pm) * contingencyPct / 100)
  const total = direct + pm + contingency
  const ask = Math.ceil(total / 10000) * 10000
  return { lines, direct, pm, pmPct, contingency, contingencyPct, total, ask }
}

export const grants = [
  // -------------------------------------------------------------------------
  {
    slug: 'condition-assessment',
    title: 'Comanche Condition Assessment & Phased Preservation Plan',
    short: 'Condition assessment',
    category: 'Planning & preservation',
    tagline: 'The document every larger grant, insurer and moorage partner asks for first.',
    fit: ['National Trust Preservation Funds', 'Valerie Sivinski Fund (Washington Trust)', '4Culture Preservation Special Projects', 'Maritime Washington NHA', 'Private family foundations'],
    summary:
      'The Foundation will commission a qualified marine surveyor and historic-preservation consultant to produce a professional condition assessment of Comanche: a compartment-by-compartment survey, ultrasonic hull-thickness sampling, prioritized stabilization needs, a phased restoration sequence with order-of-magnitude cost ranges, and an indexed photographic record. The assessment converts “the ship needs everything” into a credible, sequenced, fundable preservation plan.',
    need:
      'Comanche has not been hauled out since 2013. The Foundation, formed in 2025, inherited a vessel with decades of volunteer maintenance but no current professional survey, no baseline hull-thickness data and no written preservation sequence. Every capital funder, marine insurer and marina the Foundation approaches asks for exactly that document. Without it the board cannot rank stabilization work by urgency, cannot set credible budgets for haul-out or machinery projects, and cannot demonstrate stewardship capacity to larger grantmakers.',
    description:
      'A licensed marine surveyor (SAMS/NAMS accredited) will conduct a full in-water survey with UT gauging at representative hull stations, supported by a historic-preservation consultant experienced with steel museum vessels. Deliverables: (1) written condition assessment; (2) stabilization priorities ranked by safety and urgency; (3) phased restoration plan with cost ranges suitable for capital applications; (4) compartment-indexed photo record archived in the Foundation data room; (5) a public summary for the website. The board will adopt the plan by resolution within 60 days of delivery and use it to sequence the Foundation’s haul-out, machinery and power-system proposals.',
    objectives: [
      'One professional written condition assessment with UT gauging data delivered.',
      'A stabilization priority list ranked by urgency and safety.',
      'A phased, costed restoration plan suitable for capital-grant applications.',
      'A compartment-indexed photographic baseline (minimum 600 images) archived.',
      'Board adoption of the plan by resolution within 60 days of delivery.'
    ],
    timeline: [
      { when: 'Month 1', what: 'Solicit three surveyor/consultant quotes; board selects by resolution.' },
      { when: 'Month 2', what: 'On-site survey, UT gauging and photo documentation.' },
      { when: 'Months 3–4', what: 'Draft assessment, stabilization priorities, phased scope and cost ranges.' },
      { when: 'Month 5', what: 'Board review; plan adopted by resolution.' },
      { when: 'Month 6', what: 'Public summary published; plan seeds next applications.' }
    ],
    budget: budget([
      { item: 'Marine surveyor — in-water survey and written report', amount: 14000 },
      { item: 'Ultrasonic thickness gauging (diver/technician, ~120 stations)', amount: 9000 },
      { item: 'Historic-preservation consultant — phased plan and cost ranges', amount: 12000 },
      { item: 'Dive services, staging, access and tank/void entry prep', amount: 6500 },
      { item: 'Photo documentation and data-room archiving', amount: 3500 },
      { item: 'Report production, public summary and web exhibit', amount: 2500 }
    ], { contingencyPct: 25, pmPct: 8 }),
    inKind: 'Volunteer coordination, board time, vessel access, crew support for survey days (est. 240 volunteer hours).',
    evaluation: ['Deliverables received and reviewed by the board and an independent maritime professional.', 'Plan adopted by board resolution (date recorded in minutes).', 'Plan cited in at least two subsequent funding applications within 12 months.'],
    sustainability: 'The assessment is a one-time product with a multi-year shelf life; the Foundation will update it after each haul-out and keep the photo baseline current through volunteer documentation days.'
  },

  // -------------------------------------------------------------------------
  {
    slug: 'year-round-mooring',
    title: 'A Permanent Home on the Water: Engineered Mooring System',
    short: 'Year-round mooring',
    category: 'Capital — moorage',
    tagline: 'An engineered, permitted mooring so Comanche can stay put, safely, in all seasons.',
    fit: ['Washington RCO / Boating Facilities Program (partner-sponsored)', 'Port and county community grants', 'Maritime Washington NHA', 'Corporate maritime sponsors', 'Private foundations with preservation or waterfront focus'],
    summary:
      'The Foundation will design, permit and install a permanent, engineered mooring system sized for a 133.4-foot, 295-gross-ton historic vessel in protected Puget Sound waters, replacing the current cycle of temporary anchorages and state-mandated moves. A permanent mooring gives Comanche a stable address, ends recurring relocation costs and risk, and makes scheduled public access and volunteer work days possible.',
    need:
      'Without long-term moorage, Comanche lives at anchor and must reposition under Washington DNR anchorage rules, each move burning fuel at roughly $100 per mile and requiring a full volunteer crew. Every relocation is a weather-dependent underway evolution for an 80-year-old ship. Unstable moorage is the single largest operational risk the Foundation faces: it disrupts volunteer schedules, prevents advertised open-ship days, complicates insurance and makes multi-year program planning impossible.',
    description:
      'Scope: (1) site selection and bathymetric/geotechnical survey; (2) stamped mooring design by a marine engineer, sized for vessel displacement, wind and current loads; (3) permitting — Washington DNR aquatic-lands authorization, WDFW Hydraulic Project Approval, U.S. Army Corps Section 10, SEPA and local shoreline permits; (4) fabrication and installation of the mooring (anchor system, chain, swivels, surface buoy) by crane barge and dive crew; (5) a three-year inspection and maintenance reserve. The Foundation will pursue the site in coordination with the host jurisdiction and tribal governments with treaty interests in the area.',
    objectives: [
      'Stamped mooring design and all permits obtained.',
      'Mooring installed and load-tested; vessel secured at the new site.',
      'Relocation moves reduced from several per year to zero routine moves.',
      'Published open-ship schedule made possible by a fixed location.',
      'Three-year inspection regime funded and documented.'
    ],
    timeline: [
      { when: 'Months 1–3', what: 'Site selection, survey, engineering design.' },
      { when: 'Months 3–12', what: 'Permit applications and agency review (permitting is the long pole).' },
      { when: 'Months 12–15', what: 'Hardware fabrication; installation window scheduled around fish-work windows.' },
      { when: 'Month 15', what: 'Installation, load test, vessel moved to mooring.' },
      { when: 'Years 2–3', what: 'Annual dive inspection and maintenance from reserve.' }
    ],
    budget: budget([
      { item: 'Bathymetric and geotechnical site survey', amount: 18000 },
      { item: 'Marine engineering — stamped mooring design and load analysis', amount: 24000 },
      { item: 'Permitting: DNR lease/authorization, WDFW HPA, Corps Sec. 10, SEPA, shoreline (incl. consultant and fees)', amount: 38000 },
      { item: 'Mooring hardware: anchor system, chain, swivels, hardware, buoy', amount: 72000 },
      { item: 'Installation: crane barge, tug, dive crew, load test', amount: 60000 },
      { item: 'Aquatic-lands lease and permit fees, 3 years', amount: 18000 },
      { item: 'Inspection and maintenance reserve, 3 years', amount: 21000 },
      { item: 'Insurance rider for installation and first year', amount: 9000 }
    ], { contingencyPct: 25, pmPct: 10 }),
    inKind: 'Volunteer crew for vessel moves and installation support, board permitting liaison, in-kind dive inspections from volunteer divers where qualified.',
    evaluation: ['Permits issued (copies on file).', 'Installation report and load-test certificate from installer.', 'Relocation count and moorage cost per year, before vs. after.', 'Open-ship days held at the fixed location in year one.'],
    sustainability: 'Annual inspection and lease costs (~$13,000/yr after the funded period) are budgeted into the Foundation’s operating plan and partially offset by savings from eliminated relocation moves.'
  },

  // -------------------------------------------------------------------------
  {
    slug: 'home-port-partnership',
    title: 'Home Port: Year-Round Pier Moorage Partnership',
    short: 'Home-port pier moorage',
    category: 'Capital & operations — moorage',
    tagline: 'Three years alongside a public pier, with the shore power and gangway to open the ship to visitors every week.',
    fit: ['Port districts and municipal waterfront programs', 'Maritime Washington NHA', '4Culture Heritage / Historic Preservation', 'Corporate sponsors (maritime, tourism)', 'Community foundations in the host city'],
    summary:
      'The Foundation seeks a multi-year berth at a public or partner marina pier, together with the one-time shore-side improvements that turn a moored ship into a working museum: shore-power connection, an accessible gangway and brow, fendering, security lighting and interpretive signage. Funding covers three years of moorage and utilities so the Foundation can commit to a weekly public schedule and build the visitor and volunteer base that sustains the ship long term.',
    need:
      'A historic vessel at anchor cannot receive the public. Every hour of volunteer labor and every visitor requires a pier. Comanche has repeatedly demonstrated her draw — more than 5,000 visitors in two weeks at Olympia Harbor Days — but that demand cannot be served without a stable, accessible berth. Pier moorage for a 133.4-foot vessel runs roughly $250 per day before utilities, beyond the reach of an all-volunteer organization without a partner.',
    description:
      'Working with a host port or marina, the Foundation will (1) install or upgrade a 100 A shore-power connection with transformer and cable; (2) fabricate and install an accessible aluminum gangway and brow with handrails, plus fendering to protect both pier and hull; (3) add security lighting and cameras at the berth; (4) install interpretive panels on the pier so the ship teaches even when closed; and (5) fund three years of moorage, utilities and liability coverage. In return the host receives a landmark attraction, a weekly open-ship program, school and youth visits, and a volunteer-maintained historic vessel on its waterfront.',
    objectives: [
      'Executed multi-year berth agreement with a host port or marina.',
      'Shore power, gangway, fendering and lighting installed and inspected.',
      'Weekly public open-ship hours published and held (target 40+ days/year).',
      '2,500+ visitors and 150+ youth-program participants per year at the berth.',
      'Interpretive panels installed and accessible without boarding.'
    ],
    timeline: [
      { when: 'Months 1–3', what: 'Host agreement, berth engineering review, permits for pier-side work.' },
      { when: 'Months 3–6', what: 'Shore power, gangway, fendering and lighting installed.' },
      { when: 'Month 6', what: 'Vessel in berth; public schedule launched.' },
      { when: 'Years 1–3', what: 'Programs delivered; annual report to funder and host.' }
    ],
    budget: budget([
      { item: 'Moorage, 133 ft, 36 months', amount: 158000 },
      { item: 'Utilities: shore power, water, pump-out, 36 months', amount: 36000 },
      { item: 'Shore-power pedestal upgrade, transformer, cable and connection', amount: 48000 },
      { item: 'Accessible gangway, brow, float, handrails and fendering', amount: 65000 },
      { item: 'Security lighting and cameras at berth', amount: 14000 },
      { item: 'Interpretive signage on the pier (design, fabrication, install)', amount: 18000 },
      { item: 'Marina liability coverage rider, 36 months', amount: 36000 },
      { item: 'Berth engineering review and permits', amount: 12000 }
    ], { contingencyPct: 20, pmPct: 8 }),
    inKind: 'All docent, maintenance and program labor is volunteer (est. 4,000 hours/year); the host port’s in-kind contribution (reduced moorage rate, staff time) is negotiated and counted as match.',
    evaluation: ['Berth agreement executed; improvements inspected and accepted by host.', 'Visitor and volunteer counts logged per open-ship day.', 'Partner and school feedback letters.', 'Annual cost and attendance report to the funder.'],
    sustainability: 'Three funded years let the Foundation build a membership and sponsorship base sized to carry moorage thereafter; the shore-side improvements remain with the host port as a permanent asset.'
  },

  // -------------------------------------------------------------------------
  {
    slug: 'drydock-hull-preservation',
    title: 'Drydocking, Hull Survey & Preservation',
    short: 'Haul-out & hull preservation',
    category: 'Capital — preservation',
    tagline: 'First drydocking in over a decade: survey the hull, renew what must be renewed, blast and coat, and protect the ship for the next twenty years.',
    fit: ['Washington Heritage Capital Projects Fund (Legislature, biennial)', 'National Trust / National Maritime Heritage Grants', '4Culture Building for Culture', 'Maritime industry sponsors (shipyards, coatings, steel)', 'Major private foundations'],
    summary:
      'The Foundation will drydock Comanche at a Puget Sound shipyard for a full hull survey, steel renewal, sea-valve and running-gear overhaul, and a complete blast-and-coat of the underwater and topside hull. This is the single most important preservation action available for a steel vessel and the one that has been deferred longest.',
    need:
      'Steel hulls are preserved from the outside in. Comanche was last drydocked in 2013 at Stabbert Marine in Seattle; she is now well beyond the five-year interval typical for coated steel in salt water. Coatings are failing, sacrificial anodes are expended and hull-thickness data is more than a decade old. Every year deferred increases steel loss and cost. A drydocking with proper survey and coating is what keeps the ship insurable, keeps her operational, and keeps Puget Sound safe from an aging steel hull.',
    description:
      'Scope: (1) pre-drydock survey and gauging plan; (2) transit under own power to the yard with tug assist and insurance rider; (3) drydock lay period (21 days planned); (4) full ultrasonic thickness survey and report; (5) steel renewal of plate and framing below the standard allowance (allowance for 6–8 tons); (6) sea chests, hull valves, through-hulls and anode renewal; (7) shaft, stern tube, rudder and propeller inspection and repair; (8) full abrasive blast and multi-coat marine coating system on the underwater hull, boot-top and topsides; (9) tank cleaning and gas-freeing for hot work; (10) an owner’s representative to manage the yard period. Volunteers will perform prep, staging and topside work permitted by the yard to reduce cost.',
    objectives: [
      'Vessel drydocked, surveyed and returned to the water within the planned yard period.',
      'UT survey report establishing a hull-thickness baseline for the next 20 years.',
      'All steel below allowance renewed; all sea valves and anodes renewed.',
      'Complete coating system applied with manufacturer inspection sign-off.',
      'Hull condition documented before/after for public interpretation.'
    ],
    timeline: [
      { when: 'Months 1–3', what: 'Yard bids, pre-survey, gauging plan, insurance and transit plan.' },
      { when: 'Month 4', what: 'Transit to yard; drydock.' },
      { when: 'Months 4–5', what: 'Survey, steel renewal, valves, running gear, blast and coat.' },
      { when: 'Month 5', what: 'Undock, sea trial, return to home berth.' },
      { when: 'Month 6', what: 'Final report, photo record, public exhibit.' }
    ],
    budget: budget([
      { item: 'Pre-drydock survey, gauging plan, yard specification', amount: 22000 },
      { item: 'Transit to and from yard: fuel, tug assist, pilotage, crew, insurance rider', amount: 34000 },
      { item: 'Drydock lay days, 21 days including dock fees, blocking, utilities', amount: 135000 },
      { item: 'Ultrasonic thickness survey and report', amount: 26000 },
      { item: 'Steel renewal allowance (plate and framing, 6–8 tons, incl. labor)', amount: 190000 },
      { item: 'Sea chests, hull valves, through-hulls, anodes', amount: 48000 },
      { item: 'Shaft, stern tube, rudder and propeller inspection and repair', amount: 65000 },
      { item: 'Abrasive blast and marine coating system, underwater hull and topsides', amount: 250000 },
      { item: 'Tank cleaning, gas-freeing and hot-work safety', amount: 32000 },
      { item: 'Owner’s representative / yard-period project management', amount: 42000 },
      { item: 'Coatings inspection and documentation', amount: 9000 }
    ], { contingencyPct: 30, pmPct: 0 }),
    inKind: 'Volunteer crew for transit and yard-period support; volunteer prep and topside labor as permitted by the yard (est. 1,500 hours); donated or discounted coatings sought from manufacturers.',
    evaluation: ['Yard completion report and invoices reconciled to scope.', 'UT survey report and coating inspection certificate on file.', 'Independent surveyor sign-off at undocking.', 'Before/after documentation published.'],
    sustainability: 'A properly coated hull with fresh anodes sets a 7–10 year interval to the next drydocking; the Foundation will fund a drydock reserve from operations and sponsorships beginning the year after completion.'
  },

  // -------------------------------------------------------------------------
  {
    slug: 'starboard-main-engine',
    title: 'Starboard Main Engine Restoration',
    short: 'Starboard main engine',
    category: 'Capital — machinery',
    tagline: 'Return Comanche’s second 1944 Cleveland diesel-electric main to service so the ship keeps her own power — and her redundancy.',
    fit: ['National Maritime Heritage Grants', 'Maritime Washington NHA', 'Marine industry and engine-service sponsors', 'Veterans and Coast Guard heritage foundations', 'Private donors with maritime-engineering interest'],
    summary:
      'Comanche is propelled by two Cleveland Diesel 12-cylinder diesel-electric main engines driving a single screw, original to her 1944 construction. The Foundation will fully survey, overhaul and return the starboard main engine and its generator to reliable service, restoring the two-engine redundancy the ship was designed with and preserving one of the last operating examples of this WWII powerplant.',
    need:
      'Operating a 133-foot, 295-gross-ton vessel on a single 80-year-old main engine leaves no margin: a failure underway is a safety event, not an inconvenience. The starboard main has been out of service pending overhaul; parts for the Cleveland 278-series are scarce and many must be machined or reverse-engineered. Restoring the engine is both a safety requirement for continued operation and a preservation act — these engines are as historic as the hull, and the volunteers who know them are aging out.',
    description:
      'Scope: (1) engine survey — borescope, compression, crankshaft deflection and lube analysis; (2) disassembly, cleaning and non-destructive testing of crankshaft, rods, liners and heads; (3) parts — liners, pistons, rings, bearings, injectors, valves and gaskets, with an allowance for machining and reverse-engineering unavailable parts; (4) machine-shop work — line bore, head rebuild, crank polish; (5) main DC generator inspection, insulation testing, rewind or commutator work as found; (6) control, switchgear and cabling refurbishment; (7) cooling, lubrication and fuel-system renewal; (8) specialist marine-diesel labor with 278-series experience working alongside Foundation volunteers, who will be trained in the process; (9) dock trials and sea trials. Every step will be photographed and documented as a technical record for future stewards.',
    objectives: [
      'Starboard main engine and generator restored and passing dock and sea trials.',
      'Two-engine operation restored; single-point-of-failure risk removed.',
      'Complete technical documentation and parts inventory produced.',
      'At least four volunteers trained in Cleveland 278-series maintenance.',
      'Engine-room interpretation for visitors updated with the restoration story.'
    ],
    timeline: [
      { when: 'Months 1–2', what: 'Survey, teardown, NDT; parts list and machining plan.' },
      { when: 'Months 2–6', what: 'Parts sourcing and machining; generator work in parallel.' },
      { when: 'Months 6–9', what: 'Reassembly, systems renewal, controls and cabling.' },
      { when: 'Month 10', what: 'Dock trials, sea trials, commissioning.' },
      { when: 'Months 11–12', what: 'Documentation, training completion, final report.' }
    ],
    budget: budget([
      { item: 'Engine survey: borescope, compression, crank deflection, oil analysis', amount: 16000 },
      { item: 'Disassembly, cleaning and NDT of crank, rods, liners, heads', amount: 42000 },
      { item: 'Parts: liners, pistons, rings, bearings, injectors, valves, gaskets', amount: 110000 },
      { item: 'Machining and reverse-engineering allowance for unavailable parts', amount: 60000 },
      { item: 'Machine-shop work: line bore, head rebuild, crank polish', amount: 58000 },
      { item: 'Main DC generator: inspection, insulation test, rewind/commutator', amount: 75000 },
      { item: 'Controls, switchgear and cabling refurbishment', amount: 36000 },
      { item: 'Cooling, lubrication and fuel-system renewal', amount: 32000 },
      { item: 'Specialist marine-diesel labor, ~900 hours', amount: 130000 },
      { item: 'Rigging, lifting and engine-room access for major components', amount: 18000 },
      { item: 'Trials: fuel, fluids, filters, surveyor attendance', amount: 14000 },
      { item: 'Technical documentation and volunteer training program', amount: 9000 }
    ], { contingencyPct: 30, pmPct: 8 }),
    inKind: 'Foundation volunteer engineers and machinists (est. 1,200 hours), donated shop time sought from regional marine-diesel firms, historical drawings and manuals from the Foundation archive.',
    evaluation: ['Sea-trial report signed by the chief engineer and an independent marine surveyor.', 'Parts and work log reconciled to budget.', 'Documentation package archived; training roster on file.', 'Engine hours logged in the first year of two-engine operation.'],
    sustainability: 'With both mains serviceable the Foundation can alternate engines, reducing wear, and the trained volunteer cohort plus documentation package carry the knowledge forward. A machinery reserve is budgeted from operations after completion.'
  },

  // -------------------------------------------------------------------------
  {
    slug: 'solar-house-power',
    title: 'Quiet Ship: Solar, Battery & Efficient House Power',
    short: 'Solar & house batteries',
    category: 'Capital — sustainability',
    tagline: 'Modern house power so the ship keeps her lights, security and communications on without running a diesel generator.',
    fit: ['Washington Clean Energy Fund / community energy programs', 'Utility conservation and sponsorship programs', 'Environmental and climate foundations', 'Corporate sponsors (solar, battery, marine electrical)', 'Community foundations'],
    summary:
      'The Foundation will install a modern, marine-rated house power system: a lithium-iron-phosphate battery bank, inverter/chargers, a deckhouse solar array, an LED lighting retrofit and remote monitoring. The system lets Comanche go “dead ship” at night without losing lighting, security cameras, bilge monitoring or internet — eliminating most generator hours, fuel cost, noise and emissions while at the pier or at anchor.',
    need:
      'Comanche currently depends on a diesel deck generator for any electrical load when shore power is unavailable, which is most of the time at anchor. The ship goes dark at night: no security cameras, no reliable bilge alarms, no communications. Generator hours cost fuel, maintenance and volunteer attention, and a generator running overnight aboard a museum ship is a fire and carbon-monoxide risk. Reliable unattended power is also a prerequisite for the remote monitoring insurers increasingly expect of an unattended historic vessel.',
    description:
      'Scope: (1) energy audit and system design by a marine electrical engineer to ABYC standards; (2) 60 kWh LiFePO4 house bank with battery-management system in a ventilated, fire-detected compartment; (3) two 12 kW inverter/chargers with distribution and transfer switching; (4) 12 kW solar array on deckhouse and awning frames with marine-grade mounts, plus a small wind turbine for winter; (5) LED retrofit of approximately 250 fixtures; (6) monitoring, telemetry, cameras and satellite/LTE internet; (7) ABYC-certified installation labor working with Foundation volunteers; (8) training and as-built documentation. The system is designed to be visible and interpretable — a teaching exhibit on how a 1944 ship meets a modern energy standard.',
    objectives: [
      'House power system installed, inspected and commissioned to ABYC standards.',
      'Generator run-hours reduced by at least 80% at anchor and pier.',
      '24/7 lighting, cameras, bilge monitoring and internet without shore power.',
      'Lighting energy use reduced by ~70% through LED retrofit.',
      'Energy exhibit installed for visitors; volunteers trained on the system.'
    ],
    timeline: [
      { when: 'Months 1–2', what: 'Energy audit, system design, equipment specification and bids.' },
      { when: 'Months 3–4', what: 'Equipment procurement; battery compartment preparation.' },
      { when: 'Months 5–7', what: 'Installation: batteries, inverters, distribution, solar, LED retrofit.' },
      { when: 'Month 8', what: 'Commissioning, monitoring setup, training.' },
      { when: 'Months 9–12', what: 'Performance logging; report to funder; exhibit installed.' }
    ],
    budget: budget([
      { item: 'Energy audit and ABYC system design (marine electrical engineer)', amount: 18000 },
      { item: 'LiFePO4 house bank, 60 kWh, marine-rated with BMS', amount: 72000 },
      { item: 'Inverter/chargers (2 × 12 kW), distribution, transfer switching', amount: 34000 },
      { item: 'Solar array, 12 kW, marine mounts and awning frames', amount: 52000 },
      { item: 'Wind turbine, 2 kW, mast and controller', amount: 9000 },
      { item: 'LED lighting retrofit, ~250 fixtures', amount: 26000 },
      { item: 'Battery compartment ventilation, fire detection and suppression', amount: 22000 },
      { item: 'Monitoring, telemetry, security cameras, satellite/LTE internet', amount: 16000 },
      { item: 'ABYC-certified installation labor, ~600 hours', amount: 78000 },
      { item: 'Cabling, conduit, breakers, hardware', amount: 24000 },
      { item: 'Training, as-built documentation, energy exhibit', amount: 8000 }
    ], { contingencyPct: 25, pmPct: 8 }),
    inKind: 'Foundation volunteer electricians and engineers (est. 800 hours); donated or discounted equipment sought from solar and battery manufacturers.',
    evaluation: ['Commissioning report and ABYC compliance letter.', 'Generator hours and fuel use logged 12 months before vs. after.', 'System uptime and monitoring records.', 'Exhibit installed; visitor engagement recorded.'],
    sustainability: 'LiFePO4 banks carry 10+ year service life; solar has no fuel cost. Annual savings in generator fuel and maintenance fund the monitoring subscription and a component reserve.'
  }
]

export const grantBySlug = (slug) => grants.find(g => g.slug === slug)

export const money = (n) => '$' + Math.round(n).toLocaleString('en-US')

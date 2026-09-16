import { useState } from 'react'
import { Link } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Photo from '../components/Photo.jsx'
import Seo from '../components/Seo.jsx'
import useApiForm from '../components/useApiForm.js'
import { org, costs } from '../site.config.js'

const compat = [
  'Comanche’s nonprofit and historical mission',
  'the vessel’s current location and operating plans',
  'available volunteer crew',
  'weather and marine conditions',
  'vessel condition and mechanical readiness',
  'safe passenger capacity',
  'available deck and interior space',
  'sanitation and accessibility requirements',
  'all applicable Coast Guard and maritime requirements'
]

const weDoNot = [
  'sell tickets for transportation aboard Comanche',
  'charge a per-passenger fare',
  'rent the vessel to a group for an underway party',
  'guarantee transportation in exchange for payment',
  'require a passenger to make a donation in order to board',
  'give a donor a contractual right to passage aboard the vessel'
]

const capacityFactors = [
  'weather or high winds', 'vessel traffic', 'navigation conditions', 'mechanical issues',
  'available crew', 'the type of event', 'guest behavior', 'safety considerations',
  'other conditions identified by the captain'
]

const shipFeatures = [
  'steep stairs and ladders', 'raised watertight-door thresholds and coamings', 'narrow passageways',
  'uneven transitions', 'machinery spaces', 'restricted areas', 'multiple deck levels'
]

const cannotBlock = [
  'passageways', 'emergency equipment', 'hatches', 'ladders', 'doors', 'operating stations', 'crew work areas'
]

const volunteerTasks = [
  'line handling', 'deck work', 'mechanical and engineering assistance', 'watchstanding',
  'cleaning and maintenance', 'galley support', 'event setup', 'guest assistance', 'general shipboard work'
]

const emptyForm = {
  orgName: '', contactName: '', email: '', phone: '', purpose: '', headcount: '', location: '',
  dates: '', mode: 'Either', duration: '', accessibility: '', equipment: '', resources: '', website: ''
}

export default function Partner() {
  const { status, message, submit } = useApiForm('/api/partner')
  const [form, setForm] = useState(emptyForm)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    const ok = await submit(form)
    if (ok) setForm(emptyForm)
  }

  return (
    <>
      <Seo
        title="Partner With Comanche"
        description="Museums, nonprofits, historical and community organizations can partner with the Tug Comanche Historical Rescue Foundation for commemorative cruises, educational programs and media projects aboard Comanche. We partner on missions; we do not sell passage."
      />
      <Hero
        small
        image="port-townsend-raftup"
        eyebrow="Partner with us"
        title="Partner With Comanche for a Cruise"
        lead="Comanche is a nonprofit historic vessel, not a commercial charter boat. We partner on missions. We do not sell passage."
        position="center 55%"
      />

      {/* ---- Intro ---------------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <div className="feature">
            <div className="prose">
              <span className="eyebrow">Mission-aligned partnerships</span>
              <h2>Maritime history, back on the water</h2>
              <p>
                The Tug Comanche Historical Rescue Foundation works with museums, historical
                organizations, nonprofits, community groups, educational programs, media
                organizations, and other mission-aligned partners to create special maritime
                experiences aboard Comanche.
              </p>
              <p>
                That can include commemorative cruises, historical programs, educational events,
                civic events, filming and media projects, vessel gatherings, and other activities
                that support Comanche&rsquo;s historic and educational mission.
              </p>
              <p className="lead"><strong>Our model is simple: we partner on missions. We do not sell passage.</strong></p>
              <p>
                Two numbers tell most of the story about what a mission takes: Comanche costs the
                Foundation roughly <strong>${costs.perMile} per mile</strong> underway and about{' '}
                <strong>${costs.perPierDay} per day</strong> alongside a pier &mdash; and that is the bare
                minimum just to operate. It puts nothing back toward maintenance, haul-out, or the
                Foundation itself. Partners who understand those figures going in are the ones we can
                build great programs with.
              </p>
              <div className="btn-row">
                <a href="#inquiry" className="btn btn-primary">Start a conversation</a>
                <a href="#not-a-charter" className="btn btn-outline">What this is not</a>
              </div>
            </div>
            <Photo name="deck-crew" alt="Guests and volunteers gathered on Comanche's deck during a partnered event" />
          </div>
        </div>
      </section>

      {/* ---- How it works ---------------------------------------------------- */}
      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <div className="prose">
              <span className="eyebrow">Process</span>
              <h2>How a partnership works</h2>
              <p>
                A partner organization may approach the Foundation with an event, educational
                program, historical commemoration, or other mission that could benefit from taking
                place aboard Comanche.
              </p>
              <p>Together, we determine whether the proposed activity is compatible with:</p>
              <ul className="checklist">
                {compat.map(c => <li key={c}>{c}</li>)}
              </ul>
              <p>
                When it makes sense, the Foundation may incorporate the proposed activity into one
                of Comanche&rsquo;s own vessel movements or operating missions.
              </p>
            </div>
            <div>
              <div className="notice notice-brass" style={{ marginTop: 0 }}>
                <p><strong>The Foundation retains control of Comanche at all times.</strong></p>
                <p>
                  The captain retains final authority over navigation, passenger count, departure,
                  route, weather, vessel traffic, safety, and whether the vessel gets underway at all.
                </p>
              </div>
              <h3 style={{ marginTop: 28 }}>A typical partnered cruise</h3>
              <p>
                A historical organization wants to commemorate an important event on the waters
                where it happened. Comanche is already planning, or agrees as part of its nonprofit
                mission, to operate in that area.
              </p>
              <p>
                The Foundation and partner develop an educational program aboard the vessel. The
                partner may provide historians, speakers, exhibits, hospitality, event volunteers,
                media coordination, or other program support &mdash; and may make a voluntary
                contribution to support Comanche&rsquo;s mission or help offset actual operating
                expenses. Partners often work from the ${costs.perMile}-per-mile and
                ${costs.perPierDay}-per-pier-day figures when deciding what level of support makes
                sense for the mission, counting the transit miles to and from the event, not just
                the cruise itself &mdash; and remembering those figures are operating cost only,
                with nothing in them for maintenance or the Foundation.
              </p>
              <p>
                The Foundation provides the vessel and organizes its volunteer crew. Guests are
                invited to participate in the historical or educational program; they are not
                purchasing transportation aboard the vessel. Comanche&rsquo;s captain and crew
                remain responsible for operating the ship and retain complete authority over all
                underway decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Not a charter --------------------------------------------------- */}
      <section className="section section-navy" id="not-a-charter">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <div className="prose">
              <span className="eyebrow">The boundary</span>
              <h2>This is not a charter service</h2>
              <p>
                Comanche is not offered for commercial charter, rental, or passenger-for-hire
                service through this program. We do not:
              </p>
              <ul className="checklist">
                {weDoNot.map(w => <li key={w}>{w}</li>)}
              </ul>
              <p>
                If what your organization needs is a conventional commercial charter in which
                payment purchases the right to use a vessel or transport passengers, Comanche is
                not being offered for that purpose.
              </p>
            </div>
            <div className="prose">
              <span className="eyebrow">Donations &amp; mission support</span>
              <h2>Support, not fare</h2>
              <p>
                Operating a 143-foot historic vessel is expensive. Fuel, moorage, maintenance,
                repairs, generators, sanitation, supplies, and other operating costs are substantial.
                As a rule of thumb, it costs the Foundation about <strong>${costs.perMile} for every
                mile Comanche travels</strong> and about <strong>${costs.perPierDay} for every day she
                sits at a pier</strong>.
              </p>
              <p>
                The per-mile figure is not just the cruise itself. Comanche has to get from wherever
                she is to wherever your event starts, and then get home again. A 15-mile
                commemorative cruise that begins 40 miles from her berth is really a
                95-mile mission &mdash; roughly ${(95 * costs.perMile).toLocaleString()} in transit
                cost before the first guest steps aboard &mdash; plus ${costs.perPierDay} for each day
                she waits alongside the pier for the event.
              </p>
              <p>
                Those figures are the floor, not the whole picture. They cover fuel, moorage and
                consumables for that mission and nothing else: no maintenance reserve for an 80-year-old
                hull and engines, no haul-out fund, no insurance, and nothing that sustains the Foundation
                between missions. A mission that only breaks even on operating cost still moves the ship
                one step closer to the next repair bill.
              </p>
              <p>
                Organizations and individuals who support Comanche&rsquo;s mission are welcome to
                make voluntary charitable contributions to the {org.name}. For a specific vessel
                movement, partners may also voluntarily help share actual voyage expenses, such as
                fuel, supplies, or other operating costs, when appropriate.
              </p>
              <p>
                However, a contribution is not a ticket, fare, charter payment, or condition of
                carriage. Giving money to the Foundation does not purchase a seat aboard Comanche,
                and boarding is not contingent upon making a donation. For partnered events, we
                document this clearly so there is no ambiguity about the nature of the relationship.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Practicalities -------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <span className="eyebrow">Practicalities</span>
          <h2>Planning realities aboard a 1944 warship</h2>
          <div className="grid grid-2" style={{ alignItems: 'start', marginTop: 24 }}>
            <div className="card">
              <div className="card-body">
                <h3>Passenger capacity</h3>
                <p>
                  Comanche is a very large vessel with substantial open deck space. For short,
                  low-speed movements in protected waters, a gathering approaching 150 participants
                  may be physically practical under favorable conditions, depending on the nature of
                  the event and the areas of the vessel being used.
                </p>
                <p><strong>That is not a guaranteed capacity.</strong> The final number aboard may change because of:</p>
                <ul className="checklist small" style={{ color: 'var(--ink)' }}>
                  {capacityFactors.map(c => <li key={c}>{c}</li>)}
                </ul>
                <p>
                  The captain may reduce capacity, alter the route, delay departure, shorten a
                  cruise, remain dockside, or cancel an underway portion of an event whenever
                  circumstances warrant it.
                </p>
                <p className="small">
                  Weather holds are real. If Comanche arrives early or waits out a blow, each extra
                  day alongside is roughly ${costs.perPierDay} &mdash; plan dates with some slack.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h3>Restrooms and large events</h3>
                <p>
                  One of the practical limitations of operating an historic military vessel is
                  plumbing. Comanche&rsquo;s original shipboard sanitation system was never designed
                  to handle something like 150 event guests simultaneously.
                </p>
                <p>
                  For large events lasting more than a short period, portable restroom facilities
                  are generally the practical solution. We can often assist with arranging,
                  transporting, loading, securing, and returning portable units, but the sponsoring
                  organization may be asked to help with the associated rental and logistics costs.
                </p>
                <p>
                  Without supplemental sanitation, a large-group cruise may need to be significantly
                  shorter, and participants should expect extremely limited restroom availability
                  while underway.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h3>Accessibility</h3>
                <p>Comanche was built as a military vessel, not a modern passenger vessel. The ship contains:</p>
                <ul className="checklist small" style={{ color: 'var(--ink)' }}>
                  {shipFeatures.map(c => <li key={c}>{c}</li>)}
                </ul>
                <p>
                  We will work with partner organizations to identify reasonable accommodations and
                  safe guest-flow plans, but some portions of the vessel may not be accessible to
                  people with certain mobility limitations. A walkthrough before a major event is
                  strongly encouraged.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h3>Media, food, alcohol and event equipment</h3>
                <p>
                  Photography, documentary work, news media, amplified sound, speakers, displays,
                  food service, and similar activities can often be accommodated. Everything aboard
                  remains subject to vessel safety requirements.
                </p>
                <p>
                  Cables, tripods, tables, speakers, lighting, catering equipment, portable toilets,
                  and other equipment cannot block:
                </p>
                <ul className="checklist small" style={{ color: 'var(--ink)' }}>
                  {cannotBlock.map(c => <li key={c}>{c}</li>)}
                </ul>
                <p>
                  Alcohol may only be served when legally permitted, properly managed, and
                  specifically approved for the event. The captain may restrict or discontinue
                  alcohol service if it creates a safety concern.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Volunteers ------------------------------------------------------ */}
      <section className="section section-alt">
        <div className="container">
          <div className="feature reverse">
            <div className="prose">
              <span className="eyebrow">Crew</span>
              <h2>Volunteers make Comanche possible</h2>
              <p>
                Comanche is fundamentally a volunteer-powered historic preservation project. Major
                vessel movements frequently require additional volunteers for:
              </p>
              <ul className="checklist" style={{ columns: 2, columnGap: 24 }}>
                {volunteerTasks.map(t => <li key={t}>{t}</li>)}
              </ul>
              <p>
                People do not need to be professional mariners to volunteer. There is usually useful
                work for anyone willing to learn and follow crew direction.
              </p>
              <h3>Overnight aboard</h3>
              <p>
                For some multi-day vessel movements, overnight accommodations may also be available.
                Comanche has stateroom space for approximately 10 overnight volunteers, depending on
                crew requirements and berth availability. The vessel normally goes dead ship at
                night, with major systems shut down; a smaller deck generator may be operated when
                electrical power is necessary.
              </p>
              <p>
                There is no hotel-style lodging service aboard Comanche. Volunteers who stay aboard
                are living on an operating historic vessel and should expect shipboard conditions.
                Voluntary donations from overnight volunteers to help cover generator fuel,
                utilities, supplies, and vessel expenses are greatly appreciated, but are not a
                lodging charge or requirement for participation.
              </p>
              <Link to="/volunteer" className="btn btn-outline">Volunteer sign-up</Link>
            </div>
            <Photo name="crew-foredeck" alt="Volunteer crew working on Comanche's foredeck" />
          </div>
        </div>
      </section>

      {/* ---- Bottom line + inquiry form -------------------------------------- */}
      <section className="section" id="inquiry">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <div className="prose">
              <span className="eyebrow">The bottom line</span>
              <h2>We don&rsquo;t sell cruises. We build maritime-history missions with partners.</h2>
              <p>
                If your museum, nonprofit, educational organization, community group, media project,
                or historical organization has an idea that belongs on the water, we would like to
                hear about it.
              </p>
              <p>
                A partnership may include use of Comanche as a venue, an underway historical program,
                volunteer participation, shared logistics, educational programming, or voluntary
                financial support of the Foundation&rsquo;s mission. What it does not include is
                purchasing passage aboard Comanche.
              </p>
              <p>
                Because every event is different, the best first step is to talk with us. The form
                covers what we need to know; you can also email{' '}
                <a href={`mailto:${org.email}`}>{org.email}</a>. When you fill in the location, we
                will look at the miles from wherever Comanche is berthed at the time, out to your
                event and back, and share the resulting picture with you honestly.
              </p>
              <p className="lead" style={{ color: 'var(--navy-800)' }}>
                Partner with us, help preserve the ship, and help put maritime history back on the water.
              </p>
            </div>

            <form className="form" onSubmit={onSubmit}>
              <div className="row">
                <div>
                  <label htmlFor="p-org">Organization *</label>
                  <input id="p-org" required value={form.orgName} onChange={set('orgName')} autoComplete="organization" />
                </div>
                <div>
                  <label htmlFor="p-name">Contact name *</label>
                  <input id="p-name" required value={form.contactName} onChange={set('contactName')} autoComplete="name" />
                </div>
              </div>
              <div className="row">
                <div>
                  <label htmlFor="p-email">Email *</label>
                  <input id="p-email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
                </div>
                <div>
                  <label htmlFor="p-phone">Phone</label>
                  <input id="p-phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                </div>
              </div>
              <div>
                <label htmlFor="p-purpose">What do you want to commemorate, teach, film, or accomplish? *</label>
                <textarea id="p-purpose" required value={form.purpose} onChange={set('purpose')} />
              </div>
              <div className="row">
                <div>
                  <label htmlFor="p-head">Approximate participants</label>
                  <input id="p-head" inputMode="numeric" placeholder="e.g. 60" value={form.headcount} onChange={set('headcount')} />
                </div>
                <div>
                  <label htmlFor="p-loc">Where would the event occur?</label>
                  <input id="p-loc" placeholder="e.g. Budd Inlet, Olympia" value={form.location} onChange={set('location')} />
                  <span className="small">Transit to and from the event is part of the mission (~${costs.perMile}/mile, bare operating cost).</span>
                </div>
              </div>
              <div className="row">
                <div>
                  <label htmlFor="p-dates">Preferred date or range</label>
                  <input id="p-dates" placeholder="e.g. Labor Day weekend 2027" value={form.dates} onChange={set('dates')} />
                </div>
                <div>
                  <label htmlFor="p-mode">Underway or dockside?</label>
                  <select id="p-mode" value={form.mode} onChange={set('mode')}>
                    <option>Either</option>
                    <option>Underway</option>
                    <option>Dockside</option>
                    <option>Both (dockside program + short cruise)</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="p-dur">How long would the program last?</label>
                <input id="p-dur" placeholder="e.g. 3 hours; one afternoon; two days" value={form.duration} onChange={set('duration')} />
              </div>
              <div>
                <label htmlFor="p-acc">Accessibility requirements</label>
                <input id="p-acc" value={form.accessibility} onChange={set('accessibility')} />
              </div>
              <div>
                <label htmlFor="p-equip">Food, beverage, media, or equipment requirements</label>
                <textarea id="p-equip" style={{ minHeight: 80 }} value={form.equipment} onChange={set('equipment')} />
              </div>
              <div>
                <label htmlFor="p-res">What resources or volunteers can your organization contribute?</label>
                <textarea id="p-res" style={{ minHeight: 80 }} value={form.resources} onChange={set('resources')} />
              </div>
              <div className="hp" aria-hidden="true">
                <label htmlFor="p-web">Website</label>
                <input id="p-web" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </div>
              {message && <div className={`form-msg ${status === 'ok' ? 'ok' : 'err'}`}>{message}</div>}
              <div>
                <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send partnership inquiry'}
                </button>
              </div>
              <p className="small">
                Submitting this form starts a conversation. It is not a booking, reservation, or
                agreement of any kind.
              </p>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

import { useState } from 'react'
import Hero from '../components/Hero.jsx'
import Seo from '../components/Seo.jsx'
import useApiForm from '../components/useApiForm.js'
import { org } from '../site.config.js'
import { volunteerRoles } from '../content/index.js'

export default function Volunteer() {
  const { status, message, submit } = useApiForm('/api/volunteer')
  const [form, setForm] = useState({
    name: '', email: '', phone: '', interests: [], experience: '', availability: '', website: ''
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggle = (role) => () => setForm(f => ({
    ...f,
    interests: f.interests.includes(role) ? f.interests.filter(r => r !== role) : [...f.interests, role]
  }))

  async function onSubmit(e) {
    e.preventDefault()
    const ok = await submit(form)
    if (ok) setForm({ name: '', email: '', phone: '', interests: [], experience: '', availability: '', website: '' })
  }

  return (
    <>
      <Seo title="Volunteer" description="Join the volunteer crew of the historic tug Comanche. Deck, engineering, history, events, media and admin roles — no experience needed." />
      <Hero
        small
        image="deck-crew"
        eyebrow="Join the crew"
        title="Volunteer"
        lead="Comanche has always been run by the people who show up. Bring your hands, your trade, or your curiosity."
        position="center 45%"
      />

      <section className="section">
        <div className="container">
          <span className="eyebrow">Ways to help</span>
          <h2>Find your station</h2>
          <div className="grid grid-3" style={{ marginTop: 24 }}>
            {volunteerRoles.map(r => (
              <div className="card" key={r.title}>
                <div className="card-body">
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <div className="prose">
              <span className="eyebrow">Sign up</span>
              <h2>Tell us about yourself</h2>
              <p>
                Fill this out and a board member will follow up with upcoming work days and
                how to get started. You can also email{' '}
                <a href={`mailto:${org.email}`}>{org.email}</a>.
              </p>
              <h3>What to expect</h3>
              <ul className="checklist">
                <li>Regular volunteer work days aboard, announced by email and Facebook</li>
                <li>Safety briefing and a signed volunteer waiver on your first day</li>
                <li>Work clothes, closed-toe shoes and gloves; we supply tools and PPE</li>
                <li>Overnight berths in original crew racks are sometimes available for multi-day work parties</li>
              </ul>
            </div>
            <form className="form" onSubmit={onSubmit}>
              <div className="row">
                <div>
                  <label htmlFor="v-name">Name *</label>
                  <input id="v-name" required value={form.name} onChange={set('name')} autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="v-email">Email *</label>
                  <input id="v-email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
                </div>
              </div>
              <div>
                <label htmlFor="v-phone">Phone (optional)</label>
                <input id="v-phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </div>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 600, color: 'var(--navy-800)', marginBottom: 6 }}>I&rsquo;m interested in</legend>
                {volunteerRoles.map(r => (
                  <label className="check" key={r.title}>
                    <input type="checkbox" checked={form.interests.includes(r.title)} onChange={toggle(r.title)} />
                    <span>{r.title}</span>
                  </label>
                ))}
              </fieldset>
              <div>
                <label htmlFor="v-exp">Relevant experience or trade (optional)</label>
                <textarea id="v-exp" value={form.experience} onChange={set('experience')} style={{ minHeight: 90 }} />
              </div>
              <div>
                <label htmlFor="v-avail">Availability (optional)</label>
                <input id="v-avail" placeholder="e.g. weekends, one Saturday a month" value={form.availability} onChange={set('availability')} />
              </div>
              {/* Honeypot: bots fill this, humans never see it. */}
              <div className="hp" aria-hidden="true">
                <label htmlFor="v-web">Website</label>
                <input id="v-web" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </div>
              {message && <div className={`form-msg ${status === 'ok' ? 'ok' : 'err'}`}>{message}</div>}
              <div>
                <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Sign me up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

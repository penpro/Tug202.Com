import { useState } from 'react'
import useApiForm from './useApiForm.js'

// Email-list signup with opt-in preferences. Used inline on the Support page
// and inside the floating "Sign up" modal. Posts to /api/newsletter.
export const signupOptions = [
  { key: 'newsletter', label: 'Ship’s newsletter', hint: 'Restoration progress and Foundation news — a few emails a year' },
  { key: 'volunteer', label: 'Volunteer work-day calls', hint: 'When we need hands aboard: work parties, transits, event crew' },
  { key: 'events', label: 'Open-ship days & cruises', hint: 'Where Comanche is, when you can come aboard, partner events' },
  { key: 'reunions', label: 'Former crew & reunions', hint: 'For Navy and Coast Guard veterans of the ship and their families' }
]

export default function SignupForm({ dark = false, compact = false, onDone }) {
  const { status, message, submit } = useApiForm('/api/newsletter')
  const [form, setForm] = useState({
    name: '', email: '', prefs: { newsletter: true, volunteer: false, events: true, reunions: false }, note: '', website: ''
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggle = (k) => () => setForm(f => ({ ...f, prefs: { ...f.prefs, [k]: !f.prefs[k] } }))
  const anyPref = Object.values(form.prefs).some(Boolean)

  async function onSubmit(e) {
    e.preventDefault()
    if (!anyPref) return
    const ok = await submit(form)
    if (ok) {
      setForm(f => ({ ...f, name: '', email: '', note: '' }))
      if (onDone) onDone()
    }
  }

  const labelStyle = dark ? { color: '#fff' } : undefined

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="row">
        <div>
          <label htmlFor="su-name" style={labelStyle}>Name</label>
          <input id="su-name" value={form.name} onChange={set('name')} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="su-email" style={labelStyle}>Email *</label>
          <input id="su-email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
        </div>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 6, ...(dark ? { color: '#fff' } : { color: 'var(--navy-800)' }) }}>
          Send me
        </legend>
        {signupOptions.map(o => (
          <label className="check" key={o.key} style={labelStyle}>
            <input type="checkbox" checked={form.prefs[o.key]} onChange={toggle(o.key)} />
            <span>
              <strong>{o.label}</strong>
              {!compact && <><br /><span className="small" style={dark ? { color: 'rgba(255,255,255,0.7)' } : undefined}>{o.hint}</span></>}
            </span>
          </label>
        ))}
        {!anyPref && <div className="small" style={{ color: 'var(--stripe)', marginTop: 4 }}>Pick at least one.</div>}
      </fieldset>
      {!compact && (
        <div>
          <label htmlFor="su-note" style={labelStyle}>Anything we should know? (optional)</label>
          <input id="su-note" placeholder="Served aboard? Have a trade? Live near the ship?" value={form.note} onChange={set('note')} />
        </div>
      )}
      <div className="hp" aria-hidden="true">
        <label htmlFor="su-web">Website</label>
        <input id="su-web" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>
      {message && <div className={`form-msg ${status === 'ok' ? 'ok' : 'err'}`}>{message}</div>}
      <div>
        <button className="btn btn-primary" type="submit" disabled={status === 'sending' || !anyPref}>
          {status === 'sending' ? 'Sending…' : 'Sign me up'}
        </button>
      </div>
      <p className="small" style={dark ? { color: 'rgba(255,255,255,0.6)' } : undefined}>
        No spam, no selling your address. Every email has an unsubscribe link.
      </p>
    </form>
  )
}

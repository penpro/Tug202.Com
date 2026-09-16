import { useState } from 'react'
import Hero from '../components/Hero.jsx'
import Seo from '../components/Seo.jsx'
import useApiForm from '../components/useApiForm.js'
import { org } from '../site.config.js'

const topics = [
  'General question',
  'Visiting / group tour',
  'Volunteering',
  'Partnering for a cruise or event',
  'Donation or sponsorship',
  'Grants and partnerships',
  'History, photos or crew stories',
  'Media inquiry'
]

export default function Contact() {
  const { status, message, submit } = useApiForm('/api/contact')
  const [form, setForm] = useState({ name: '', email: '', topic: topics[0], message: '', website: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    const ok = await submit(form)
    if (ok) setForm({ name: '', email: '', topic: topics[0], message: '', website: '' })
  }

  return (
    <>
      <Seo title="Contact" description="Contact the Tug Comanche Historical Rescue Foundation about visits, volunteering, donations, grants or the ship's history." />
      <Hero
        small
        image="port-townsend-raftup"
        eyebrow="Get in touch"
        title="Contact"
        lead="Questions, tour requests, crew stories, old photos — we read every message."
        position="center 50%"
      />

      <section className="section">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <div className="prose">
              <h2>Reach the board</h2>
              <table className="spec">
                <tbody>
                  <tr><th>Email</th><td><a href={`mailto:${org.email}`}>{org.email}</a></td></tr>
                  {org.phone && <tr><th>Phone</th><td><a href={`tel:${org.phone}`}>{org.phone}</a></td></tr>}
                  <tr><th>Facebook</th><td><a href={org.facebook} target="_blank" rel="noreferrer">facebook.com/uscgccomanche</a></td></tr>
                  <tr><th>YouTube</th><td><a href={org.youtube} target="_blank" rel="noreferrer">youtube.com/@TugComanche</a></td></tr>
                  <tr><th>Organization</th><td>{org.name}<br /><span className="small">EIN {org.ein} &middot; {org.city}</span></td></tr>
                </tbody>
              </table>
              <h3 style={{ marginTop: 28 }}>Served aboard Comanche?</h3>
              <p>
                We are building an archive of the ship&rsquo;s Navy and Coast Guard years. Former crew,
                families and historians: photos, documents, cruise books and stories are all
                welcome, and we can scan and return originals.
              </p>
            </div>
            <form className="form" onSubmit={onSubmit}>
              <div className="row">
                <div>
                  <label htmlFor="c-name">Name *</label>
                  <input id="c-name" required value={form.name} onChange={set('name')} autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="c-email">Email *</label>
                  <input id="c-email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
                </div>
              </div>
              <div>
                <label htmlFor="c-topic">Topic</label>
                <select id="c-topic" value={form.topic} onChange={set('topic')}>
                  {topics.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="c-msg">Message *</label>
                <textarea id="c-msg" required value={form.message} onChange={set('message')} />
              </div>
              <div className="hp" aria-hidden="true">
                <label htmlFor="c-web">Website</label>
                <input id="c-web" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </div>
              {message && <div className={`form-msg ${status === 'ok' ? 'ok' : 'err'}`}>{message}</div>}
              <div>
                <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, fmtDate } from './api.js'

const KIND = { contact: 'Contact message', volunteer: 'Volunteer signup', partner: 'Partner inquiry', subscriber: 'Newsletter signup' }

export default function Dashboard() {
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api('/admin/summary').then(setD).catch(e => setErr(e.message)) }, [])
  if (err) return <div className="form-msg err">{err}</div>
  if (!d) return <p className="small">Loading&hellip;</p>
  const tiles = [
    { n: d.contacts.open ?? 0, l: 'unanswered messages', sub: `${d.contacts.n} total`, to: '/admin/inbox' },
    { n: d.volunteers.open ?? 0, l: 'volunteers to contact', sub: `${d.volunteers.n} total`, to: '/admin/inbox?tab=volunteers' },
    { n: d.partners.open ?? 0, l: 'partner inquiries open', sub: `${d.partners.n} total`, to: '/admin/inbox?tab=partners' },
    { n: d.subscribers.n, l: 'newsletter subscribers', sub: 'active', to: '/admin/inbox?tab=subscribers' },
    { n: d.crm.n, l: 'contacts in CRM', sub: 'people', to: '/admin/contacts' },
    { n: d.news.n, l: 'news posts live', sub: 'published', to: '/admin/news' }
  ]
  return (
    <div>
      <h2 style={{ fontSize: '1.6rem' }}>Dashboard</h2>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {tiles.map(t => (
          <Link key={t.l} to={t.to} className="stat" style={{ textDecoration: 'none' }}>
            <div className="stat-n" style={{ color: t.n && /unanswered|to contact|open/.test(t.l) ? 'var(--stripe)' : undefined }}>{t.n}</div>
            <div className="stat-l">{t.l}</div><div className="small">{t.sub}</div>
          </Link>
        ))}
      </div>
      <h3 style={{ marginTop: 28 }}>Recent activity</h3>
      <table className="spec" style={{ fontSize: '0.92rem' }}>
        <tbody>
          {d.recent.map(r => (
            <tr key={r.kind + r.id}><th style={{ width: '22%', fontWeight: 400, whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</th><td><span className="pill" style={{ marginLeft: 0, marginRight: 8 }}>{KIND[r.kind]}</span>{r.who}{r.what && <span className="small"> — {r.what}</span>}</td></tr>
          ))}
          {!d.recent.length && <tr><td className="small">Nothing yet.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

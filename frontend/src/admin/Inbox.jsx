import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, fmtDate } from './api.js'

// Form submissions from the public site, one tab per form.
const TABS = [
  { key: 'contacts', label: 'Messages', path: '/admin/contacts', kind: 'contact' },
  { key: 'volunteers', label: 'Volunteers', path: '/admin/volunteers', kind: 'volunteer' },
  { key: 'partners', label: 'Partner inquiries', path: '/admin/partners', kind: 'partner' },
  { key: 'subscribers', label: 'Subscribers', path: '/admin/subscribers', kind: null }
]

export default function Inbox() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find(t => t.key === params.get('tab')) || TABS[0]
  const [rows, setRows] = useState(null); const [err, setErr] = useState(''); const [showDone, setShowDone] = useState(false)
  const load = () => { setRows(null); api(tab.path).then(d => setRows(d.rows)).catch(e => setErr(e.message)) }
  useEffect(load, [tab.key]) // eslint-disable-line

  const toggle = async (r) => {
    await api('/admin/handled', { method: 'POST', body: { kind: tab.kind, id: r.id, handled: !r.handled_at } })
    setRows(rs => rs.map(x => x.id === r.id ? { ...x, handled_at: x.handled_at ? null : new Date().toISOString() } : x))
  }
  const visible = (rows || []).filter(r => showDone || !tab.kind || !r.handled_at)

  return (
    <div>
      <h2 style={{ fontSize: '1.6rem' }}>Inbox</h2>
      <nav className="admin-subtabs">
        {TABS.map(t => <button key={t.key} className={t.key === tab.key ? 'on' : ''} onClick={() => setParams({ tab: t.key })}>{t.label}</button>)}
        {tab.kind && <label className="check small" style={{ marginLeft: 'auto' }}><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> show handled</label>}
      </nav>
      {err && <div className="form-msg err">{err}</div>}
      {!rows && !err && <p className="small">Loading&hellip;</p>}
      {rows && !visible.length && <p className="small">Nothing here.</p>}
      <div className="admin-list">
        {visible.map(r => (
          <details className="admin-msg" key={r.id} open={false}>
            <summary>
              <span className="small" style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</span>
              <strong>{r.name || r.org_name || r.email}</strong>
              <span className="small">{r.topic || r.interests || r.contact_name || ''}</span>
              {r.handled_at && <span className="pill" style={{ background: '#1f6b2a' }}>handled</span>}
            </summary>
            <div className="admin-msg-body">
              {tab.key === 'contacts' && <><Row k="Email" v={<a href={`mailto:${r.email}`}>{r.email}</a>} /><Row k="Topic" v={r.topic} /><Row k="Message" v={r.message} pre /></>}
              {tab.key === 'volunteers' && <><Row k="Email" v={<a href={`mailto:${r.email}`}>{r.email}</a>} /><Row k="Phone" v={r.phone} /><Row k="Interests" v={r.interests} /><Row k="Availability" v={r.availability} /><Row k="Experience" v={r.experience} pre /></>}
              {tab.key === 'partners' && <><Row k="Contact" v={<>{r.contact_name} · <a href={`mailto:${r.email}`}>{r.email}</a> {r.phone}</>} /><Row k="Purpose" v={r.purpose} pre /><Row k="Participants" v={r.headcount} /><Row k="Location" v={r.location} /><Row k="Dates" v={r.dates} /><Row k="Mode" v={r.mode} /><Row k="Duration" v={r.duration} /><Row k="Accessibility" v={r.accessibility} /><Row k="Equipment" v={r.equipment} pre /><Row k="Resources" v={r.resources} pre /></>}
              {tab.key === 'subscribers' && <><Row k="Email" v={r.email} /><Row k="Wants" v={['newsletter', 'volunteer', 'events', 'reunions'].filter(k => r['pref_' + k]).join(', ')} /><Row k="Note" v={r.note} /></>}
              {tab.kind && <div className="btn-row" style={{ marginTop: 10 }}><button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => toggle(r)}>{r.handled_at ? 'Mark unhandled' : 'Mark handled'}</button></div>}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

function Row({ k, v, pre }) {
  if (!v) return null
  return <div className="admin-kv"><span>{k}</span><div style={pre ? { whiteSpace: 'pre-wrap' } : undefined}>{v}</div></div>
}

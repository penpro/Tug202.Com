import { useEffect, useState } from 'react'
import { api, fmtDate } from './api.js'

// Signed waivers: who is covered, until when, and the signature itself.

const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—')

export default function Waivers() {
  const [d, setD] = useState(null); const [q, setQ] = useState(''); const [err, setErr] = useState(''); const [open, setOpen] = useState(null)
  const load = (query = q) => api('/admin/waivers' + (query ? `?q=${encodeURIComponent(query)}` : '')).then(setD).catch(e => setErr(e.message))
  useEffect(() => { load('') }, []) // eslint-disable-line

  if (err) return <div className="form-msg err">{err}</div>
  if (!d) return <p className="small">Loading&hellip;</p>
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: '1.6rem' }}>Waivers</h2>
        <span className="small">{d.rows.length} signed · current version {d.version}</span>
      </div>
      <div className="admin-bar">
        <input placeholder="Name, email or pass code…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
        <button className="btn btn-outline" onClick={() => load()}>Search</button>
        <a className="btn btn-outline" href="/waiver?kiosk=1" target="_blank" rel="noreferrer">Open tablet sign-in</a>
      </div>
      {!d.rows.length && <p className="small">Nobody has signed online yet. Send people to <a href="/waiver">tug202.org/waiver</a>, or open the tablet sign-in at the brow.</p>}
      <div className="admin-list">
        {d.rows.map(w => {
          const expired = w.expires_on && w.expires_on.slice(0, 10) < today
          return (
            <div className="admin-person" key={w.id}>
              <div className="admin-row" style={{ gridTemplateColumns: '1.5fr 1fr auto' }} onClick={() => setOpen(open === w.id ? null : w.id)}>
                <div className="admin-name">
                  <strong>{w.name}</strong>
                  {w.revoked_at ? <span className="pill" style={{ background: '#b8321f' }}>revoked</span>
                    : expired ? <span className="pill" style={{ background: '#a2823a' }}>expired</span>
                      : <span className="pill" style={{ background: '#1f6b2a' }}>current</span>}
                  {w.guardian === 1 && <span className="pill">+minors</span>}
                  {w.method === 'kiosk' && <span className="pill">tablet</span>}
                  <div className="small">{w.email || 'no email'} · signed {fmtDate(w.created_at)}</div>
                </div>
                <div className="small"><code>{w.pass_code}</code><br />good through {day(w.expires_on)}</div>
                <div className="small">{open === w.id ? '▾' : '▸'}</div>
              </div>
              {open === w.id && <Detail id={w.id} onDone={() => load()} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Detail({ id, onDone }) {
  const [d, setD] = useState(null)
  useEffect(() => { api(`/admin/waivers/${id}`).then(setD).catch(() => {}) }, [id])
  if (!d) return <div className="admin-msg-body"><p className="small">Loading&hellip;</p></div>
  const w = d.waiver
  const revoke = async () => { if (confirm('Revoke this waiver? Their pass stops working.')) { await api(`/admin/waivers/${id}/revoke`, { method: 'POST' }); onDone() } }

  return (
    <div className="admin-msg-body">
      <div className="admin-kv"><span>Signed</span><span>{fmtDate(w.created_at)} · {w.method}</span></div>
      <div className="admin-kv"><span>Contact</span><span>{w.email || '—'} · {w.phone || '—'} · {w.city || '—'}</span></div>
      <div className="admin-kv"><span>Emergency</span><span>{w.emergency_name || '—'} {w.emergency_phone}</span></div>
      {w.minors && <div className="admin-kv"><span>Minors</span><span>{w.minors}</span></div>}
      <div className="admin-kv"><span>Photos</span><span>{w.photo_ok ? 'may be used' : 'asked us not to'}</span></div>
      <div className="admin-kv"><span>Pass</span><span><code>{w.pass_code}</code> · <a href={`/pass/${w.pass_code}`} target="_blank" rel="noreferrer">view</a></span></div>
      <div className="admin-kv"><span>Agreement</span>
        <span>version {w.waiver_version} · <code style={{ fontSize: '0.75rem' }}>{w.waiver_sha.slice(0, 16)}…</code>
          {d.currentSha === w.waiver_sha ? ' (matches today’s wording)' : ' (an earlier wording)'}</span></div>
      <div className="admin-kv"><span>Signed from</span><span className="small">{w.ip} · {w.user_agent?.slice(0, 80)}</span></div>
      {w.signature && <div style={{ margin: '10px 0' }}>
        <div className="small">Signature</div>
        <img src={w.signature} alt="signature" style={{ maxWidth: 340, border: '1px solid var(--line)', borderRadius: 6, background: '#fff' }} />
        <div className="small">Typed: {w.signed_name}</div>
      </div>}
      {!w.revoked_at && <div className="btn-row"><button className="btn btn-outline" style={{ borderColor: 'var(--stripe)', color: 'var(--stripe)' }} onClick={revoke}>Revoke</button></div>}
    </div>
  )
}
